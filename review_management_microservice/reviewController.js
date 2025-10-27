const pool = require('./db.js');
const { sendAndReceive } = require('./rabbitmq/rpc'); 


async function requestReview(req, res) {

  try {
    const student_id = req.headers['x-student-id'];
    const institution = req.headers['x-institution-id'];
    const {course, period, message } = req.body;

    if (!student_id || !institution || !course || !period || !message) {
      return res.status(400).json({ error: 'Missing required fields' });

    }

    const conn = await pool.getConnection();

    const existing = await conn.query(
        `SELECT id FROM review_requests WHERE student_id = ? AND course = ? AND period = ?`,
        [student_id, course, period]
    );
    conn.release();
    if (existing.length > 0) {
    return res.status(409).json({
        error: 'You have already submitted a review request for this course and period.'
    });
    }

    const instructorInfo = await sendAndReceive('lookup.instructor', {
      institution,
      course,
      period
    });

    if (!instructorInfo || !instructorInfo.instructor_id) {
      return res.status(404).json({ error: 'Instructor not found for this course/period' });
    }

    const instructor_id = instructorInfo.instructor_id;


    const result = await conn.query(
      `INSERT INTO review_requests (student_id, institution, instructor_id, course, period, message, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [student_id, institution, instructor_id, course, period, message]
    );

    conn.release();
    
    res.status(201).json({
      message: 'Review request submitted successfully',
      request_id: result.insertId.toString(),
      status: 'pending'
    });

  } catch (error) {
    console.error('Error in requestReview:', error);
    res.status(500).json({ error: 'Internal server error' });
  } 
}


async function replyToReview(req, res) {
  let conn;
  function isValidAttachmentURL(url) {
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'drive.google.com',
      'www.dropbox.com',
      'dl.dropboxusercontent.com'
    ];
    return allowedHosts.includes(parsed.hostname);
  } catch (err) {
    return false;
  }
}

  try {
    const instructor_id = req.headers['x-user-id'];
    const { review_request_id, status, message, attachment_path } = req.body;

    if (!instructor_id || !review_request_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['accepted', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    if (attachment_path && !isValidAttachmentURL(attachment_path)) {
        return res.status(400).json({ error: 'Invalid attachment URL. Only Google Drive or Dropbox links are allowed.' });
    }


    conn = await pool.getConnection();

    // Step 1: Insert reply
    await conn.query(
      `INSERT INTO review_replies (review_request_id, status, message, attachment_path, ack)
       VALUES (?, ?, ?, ?, false)`,
      [review_request_id, status, message || null, attachment_path || null]
    );

    conn.release();
    // Step 2: Update review request status
    await conn.query(
      `UPDATE review_requests SET status = ? WHERE id = ?`,
      [status, review_request_id]
    );

    res.status(201).json({ message: 'Reply submitted successfully' });

  } catch (error) {
    console.error('Error in replyToReview:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
}


async function acknowledgeReply(req, res) {
  let conn;
  try {
    const student_id = req.headers['x-student-id'];
    const { review_request_id } = req.body;

    if (!student_id || !review_request_id) {
      return res.status(400).json({ error: 'Missing student ID or review request ID' });
    }

    conn = await pool.getConnection();

    // Optional: Verify ownership (ensure student owns this review)
    const review = await conn.query(
      `SELECT id FROM review_requests WHERE id = ? AND student_id = ?`,
      [review_request_id, student_id]
    );

    conn.release();
    if (!review) {
      return res.status(403).json({ error: 'You do not have permission to acknowledge this reply' });
    }

    // Check if reply exists
    const reply = await conn.query(
      `SELECT id FROM review_replies WHERE review_request_id = ?`,
      [review_request_id]
    );

    conn.release();

    if (!reply) {
      return res.status(404).json({ error: 'No reply exists for this review request' });
    }

    // Update ack flag
    await conn.query(
      `UPDATE review_replies SET ack = true WHERE review_request_id = ?`,
      [review_request_id]
    );

    res.status(200).json({ message: 'Reply acknowledged' });

  } catch (error) {
    console.error('Error in acknowledgeReply:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
}

async function getReplyByReviewId(req, res) {
  let conn;
  try {
    let { course, period, reviewId } = req.body;
    conn = await pool.getConnection();

    const role = req.headers['x-user-role'];

    if (role === 'student'){
      const studentId = req.headers['x-student-id'];
      if (!studentId) {
        return res.status(400).json({ error: 'Missing student ID' });
      }
      
      const check = await conn.query(
        `SELECT id FROM review_requests WHERE course = ? AND period = ? AND student_id = ?`,
        [course, period, studentId]
      );
      conn.release();
      if (!check || check.length === 0) {
        return res.status(403).json({ error: 'You dont have not requested a review' });
      }
      console.log("Check result:", check);
      reviewId = check[0].id; // ✅ Extract just the ID
    }
    else if (role === 'instructor') {
      const instructorId = req.headers['x-user-id'];
      if (!instructorId) {
        return res.status(400).json({ error: 'Missing instructor ID' });
      }
      const check = await conn.query(
        `SELECT * FROM review_requests WHERE id = ? AND instructor_id = ?`,
        [reviewId, instructorId]
      )
      conn.release();
      if (!check || check.length === 0) {
        return res.status(403).json({ error: 'You do not have permission to view this review request' });
      }
      console.log("Check result:", check);
    }

    const reply = await conn.query(
      `SELECT id, review_request_id, status, message, attachment_path, ack, replied_at
       FROM review_replies WHERE review_request_id = ?`,
      [reviewId]
    );

    if (!reply || reply.length === 0) {
      return res.status(404).json({ error: 'No reply found for this review request' });
    }

    res.status(200).json(reply);
  } catch (error) {
    console.error('Error in getReplyByReviewId:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
}

async function getReviewById(req, res) {
  let conn;
  try {
    let { course, period, id } = req.body;
    const role = req.headers['x-user-role'];
      console.log("Incoming body:", req.body);
    conn = await pool.getConnection();

    if (role === 'student'){
      const studentId = req.headers['x-student-id'];
      if (!studentId) {
        return res.status(400).json({ error: 'Missing student ID' });
      }
      const check = await conn.query(
        `SELECT id FROM review_requests WHERE course = ? AND period = ? AND student_id = ?`,
        [course, period, studentId]
      )
      conn.release();
      if (!check || check.length === 0) {
        return res.status(403).json({ error: 'You do not have permission to view this review request' });
      }
      id = check[0].id; // Use the first matching review request ID
    }
    else if (role === 'instructor') {
      const instructorId = req.headers['x-user-id'];
      if (!instructorId) {
        return res.status(400).json({ error: 'Missing instructor ID' });
      }
      const check = await conn.query(
        `SELECT * FROM review_requests WHERE id = ? AND instructor_id = ?`,
        [id, instructorId]
      )
      conn.release();
      if (!check || check.length === 0) {
        return res.status(403).json({ error: 'You do not have permission to view this review request' });
      }
    }

    const review = await conn.query(
      `SELECT course, period, message,  created_at
       FROM review_requests WHERE id = ?`,
      [id]
    );

    if (!review || review.length === 0) {
      return res.status(404).json({ error: 'Review request not found' });
    }
    console.log("Review result:", review);
    res.status(200).json(review);
  } catch (error) {
    console.error('Error in getReviewById:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
}

async function getInstructorReviewRequests(req, res) {
  let conn;
  try {
    const instructor_id = req.headers['x-user-id'];
    
    console.log('Instructor ID:', instructor_id);
    if (instructor_id === null || instructor_id === undefined) {
      return res.status(401).json({ error: 'Missing instructor user ID' });
    }

    conn = await pool.getConnection();

    const requests = await conn.query(
      `SELECT id, student_id, institution, course, period, status, created_at
       FROM review_requests
       WHERE instructor_id = ? AND status = 'pending'`,
      [instructor_id]
    );

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error in getInstructorReviewRequests:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
    
  }
}

module.exports = {
  requestReview,
  replyToReview,
  acknowledgeReply,
  getReviewById,
  getReplyByReviewId,
  getInstructorReviewRequests
};
