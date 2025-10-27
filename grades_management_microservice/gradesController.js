// gradesController.js
const pool = require('./db.js');
const xlsx = require('xlsx');
const fs = require('fs');

async function postGrades(req, res) {
    try {
        const { status } = req.body;
        const file = req.file;

        const workbook = xlsx.readFile(file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet, { range: 2 });

        const fullCourse = data[0]['Τμήμα Τάξης']; // π.χ. "ΔΟΜΕΣ ΔΕΔΟΜΕΝΩΝ (CS202)"
        const match = fullCourse.match(/^(.*?)\s*\((.*?)\)$/);
        const course_name = match ? match[1].trim() : fullCourse;
        const course_code = match ? match[2].trim() : `C-${Date.now()}`;

        const exam_period = data[0]['Περίοδος δήλωσης']?.trim();
        if (!exam_period) {
        return res.status(400).json({ error: 'Missing exam period in Excel file' });
        }

        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        

        const instructorId = req.headers['x-user-id'];
        const instructorName = req.headers['x-user-username'];
        const institution = req.headers['x-user-institution'];
        const role = req.headers['x-user-role'];

        if (role !== 'instructor' ) {
            return res.status(401).json({ error: 'Unauthorized: No instructor info' });
        }

        // skip first 2 rows

        const connection = await pool.getConnection();


        const institutionRows = await connection.query(
            'SELECT id FROM institutions WHERE institution_code = ?',
            [institution]
        );
        connection.release();

        if (institutionRows.length === 0) {
            await connection.query(
                'INSERT INTO institutions (institution_code, institution_name) VALUES (?, ?)',
                [institution, institution]
            );
          connection.release();
        }

        const periodRows = await connection.query(
        "SELECT id FROM exam_periods WHERE period_name = ?", 
        [exam_period]
        );
        connection.release();

        let exam_period_id;

        if (periodRows && periodRows.length) {
        exam_period_id = periodRows[0].id;
        } else {
        const insertResult = await connection.query(
            "INSERT INTO exam_periods (period_name) VALUES (?)", 
            [exam_period]
        );
        exam_period_id = insertResult.insertId;
        connection.release();
        }

        const instructorRows = await connection.query("SELECT id FROM instructors WHERE id = ?", [instructorId]);
        if (instructorRows.length === 0) {
            await connection.query(
                "INSERT INTO instructors (id, instructor_code, fullname, institution) VALUES (?, ?, ?, ?)",
                [instructorId, instructorId, instructorName, institution]
            );
          connection.release();
        }

        // ➤ Check or insert course by course_code
        const courseRows = await connection.query("SELECT id FROM courses WHERE course_code = ?", [course_code]);
        let course_id;
        if (courseRows.length === 0) {
            const result = await connection.query(
                "INSERT INTO courses (course_code, course_name, instructor_id, exam_period, institution) VALUES (?, ?, ?, ?, ?)",
                [course_code, course_name, instructorId, exam_period, institution]
            );
            course_id = result.insertId;
            connection.release();
        } else {
            course_id = courseRows[0].id;
        }


        // ➤ Delete old initial grades if final upload
        if (status === 'final') {
            const exists = await connection.query(`
                SELECT * FROM grade_uploads WHERE course_id = ? AND exam_period = ? AND status = 'final'
            `, [course_id, exam_period]);
            connection.release();
            if (exists.length>0) { return res.status(400).json({ error: 'Final grades already uploaded for this course and period' }); }

            const doesntExist = await connection.query(`
                SELECT * FROM grade_uploads WHERE course_id = ? AND exam_period = ? AND status = 'initial'
            `, [course_id, exam_period]); 
            
            connection.release();
            
            if (doesntExist.length === 0) {
                return res.status(400).json({ error: 'No initial grades found for this course and period' });
            }
            
        }

        if (status === 'initial') {
            const existsinitial = await connection.query(`SELECT * FROM grade_uploads WHERE course_id = ? AND exam_period = ? AND status = 'initial'`, [course_id, exam_period]);  
            connection.release();
            if (existsinitial.length > 0) {
                return res.status(400).json({ error: 'Initial grades already uploaded for this course and period' });
            }
            
            const existsfinal = await connection.query(`SELECT * FROM grade_uploads WHERE course_id = ? AND exam_period = ? AND status = 'final'`, [course_id, exam_period]);  
            connection.release();
            if (existsfinal.length > 0) {
                return res.status(400).json({ error: 'Final grades uploades' });
            }
        }



        // ➤ Insert into grade_uploads
        const uploadResult = await connection.query(
            `INSERT INTO grade_uploads 
            (course_id, instructor_id, exam_period, filename, status, institution)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [course_id, instructorId, exam_period, file.originalname, status, institution]
        );
        const upload_id = uploadResult.insertId;
        connection.release();

        // ➤ Insert each student/grade
        for (const row of data) {
            const student_code = row['Αριθμός Μητρώου'];
            const fullname = row['Ονοματεπώνυμο'];
            const email = row['Ακαδημαϊκό E-mail'];
            const grade = parseInt(row['Βαθμολογία'], 10);

            // Ensure student exists
            const studentRows = await connection.query("SELECT id FROM students WHERE student_code = ?", [student_code]);
            connection.release();
            let student_id;
            if (studentRows.length) {
                student_id = studentRows[0].id;
            } else {
                const insertResult = await connection.query(
                    "INSERT INTO students (student_code, fullname, email, institution) VALUES (?, ?, ?, ?)",
                    [student_code, fullname, email, institution]
                );
                student_id = insertResult.insertId;
                connection.release();
            }


            // Insert grade
            const targetTable = status === 'final' ? 'final_grades' : 'initial_grades';
            const gradeResult = await connection.query(
                `INSERT INTO ${targetTable} 
                (upload_id, student_id, student_name, student_email, exam_period, grade, exam_period_id, institution)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [upload_id, student_code, fullname, email, exam_period, grade, exam_period_id, institution]
            );
            connection.release();
            const gradeId = gradeResult.insertId;

            const secondaryTable = status === 'final' ? 'analytic_grades_final' : 'analytic_grades_initial';

            for (let i = 1; i <= 10; i++) {
                const q = `Q${i.toString().padStart(2, '0')}`;  // Q01, Q02, ...
                const score = row[q];

                if (score !== undefined && score !== null && score !== '') {
                    const parsedScore = parseInt(score, 10);
                    if (!isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 10) {
                        await connection.query(
                            `INSERT INTO ${secondaryTable} 
                            (${targetTable.slice(0, -1)}_id, question_label, grade, institution)
                            VALUES (?, ?, ?, ?)`,
                            [gradeId, q, parsedScore, institution]
                        );
                        connection.release();
                    }
                }
            }



        }
        

  
        await connection.query(`
        INSERT INTO grade_distribution (course_id, exam_period, grade, count, status, institution)
        SELECT ?, exam_period, grade, COUNT(*), ?, ?
        FROM ${status === 'final' ? 'final_grades' : 'initial_grades'}
        WHERE upload_id = ?
        GROUP BY grade
        `, [course_id, status, institution, upload_id]);

        connection.release();


            // === Υπολογισμός κατανομής αναλυτικών βαθμών ===
        const analyticTable = status === 'final' ? 'analytic_grades_final' : 'analytic_grades_initial';
        const gradeTable = status === 'final' ? 'final_grades' : 'initial_grades';
        const gradeKey = status === 'final' ? 'final_grade_id' : 'initial_grade_id';

        
        await connection.query(`
        INSERT INTO analytic_grade_distribution (course_id, exam_period, question_label, grade, count, status, institution)
        SELECT ?, ?, ag.question_label, ag.grade, COUNT(*), ?, ?
        FROM ${analyticTable} ag
        JOIN ${gradeTable} g ON ag.${gradeKey} = g.id
        WHERE g.upload_id = ?
        GROUP BY ag.question_label, ag.grade
        `, [course_id, exam_period, status, institution, upload_id]);


        connection.release();
        fs.unlinkSync(file.path); // Clean up uploaded file

        return res.status(201).json({ message: `Grades (${status}) uploaded successfully.` });
    } catch (err) {
        console.error(" Error in postGrades:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}



async function viewPersonalGrades(req, res) {
  try {
    const studentId = req.headers['x-student-id'];
    const studentInstitution = req.headers['x-user-institution'];
    const { course, exam_period } = req.query;

    if (!studentId || !studentInstitution) {
      return res.status(401).json({ error: 'Unauthorized: Missing student ID or institution' });
    }

    if (!course || !exam_period) {
      return res.status(400).json({ error: 'Missing course or exam_period in query' });
    }

    const connection = await pool.getConnection();

    const courseRows = await connection.query(
      `SELECT id FROM courses WHERE (course_code = ? OR course_name = ?) AND institution = ?`,
      [course, course, studentInstitution]
    );
    connection.release();

    if (!courseRows.length) {
      connection.release();
      return res.status(404).json({ error: 'Course not found for your institution' });
    }

    const course_id = courseRows[0].id;

    const grades = await connection.query(
      `
      SELECT 
        g.id AS grade_id,
        g.grade,
        g.exam_period,
        gu.status,
        c.course_name
      FROM (
        SELECT * FROM final_grades WHERE student_id = ? AND exam_period = ? AND institution = ?
        UNION ALL
        SELECT * FROM initial_grades WHERE student_id = ? AND exam_period = ? AND institution = ?
      ) g
      JOIN grade_uploads gu ON gu.id = g.upload_id
      JOIN courses c ON gu.course_id = c.id
      WHERE gu.course_id = ?
      ORDER BY gu.status = 'final' DESC
      LIMIT 1
      `,
      [studentId, exam_period, studentInstitution, studentId, exam_period, studentInstitution, course_id]
    );
    connection.release();
    if (!grades.length) {
      connection.release();
      return res.status(404).json({ error: 'No grade found for this course and period in your institution' });
    }

    const grade = grades[0];
    const analyticTable = grade.status === 'final' ? 'analytic_grades_final' : 'analytic_grades_initial';
    const gradeKey = grade.status === 'final' ? 'final_grade_id' : 'initial_grade_id';

    const analytics = await connection.query(
      `SELECT question_label, grade FROM ${analyticTable} WHERE ${gradeKey} = ? AND institution = ?`,
      [grade.grade_id, studentInstitution]
    );

    connection.release();

    return res.json({
      course: grade.course_name,
      exam_period: grade.exam_period,
      status: grade.status,
      grade: grade.grade,
      analytic_grades: analytics || []
    });
  } catch (err) {
    console.error('Error in viewPersonalGrades:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


async function viewAvailableCourses(req, res) {
  try {
    const role = req.headers['x-user-role'];
    
    if (role === 'student' ) {
        studentId = req.headers['x-student-id'];
    }
    const studentInstitution = req.headers['x-user-institution'];
    const instructorId = req.headers['x-user-id'];

    if ( !studentInstitution) {
      return res.status(403).json({ error: 'Missing student ID or institution' });
    }

    const connection = await pool.getConnection();
    let courses;

    if (role === 'student') {
      courses = await connection.query(
        `
        SELECT
          c.course_name,
          c.exam_period,
          MAX(CASE WHEN gu.status = 'initial' THEN gu.upload_date END) AS initial_submission,
          MAX(CASE WHEN gu.status = 'final' THEN gu.upload_date END) AS final_submission
        FROM grade_uploads gu
      JOIN courses c ON gu.course_id = c.id
      LEFT JOIN initial_grades ig ON ig.upload_id = gu.id AND ig.student_id = ?
      LEFT JOIN final_grades fg ON fg.upload_id = gu.id AND fg.student_id = ?
      WHERE c.institution = ? AND (ig.student_id IS NOT NULL OR fg.student_id IS NOT NULL)
      GROUP BY c.id
      ORDER BY c.exam_period DESC, c.course_name
      `,
      [studentId, studentId, studentInstitution]
    );
    connection.release();
    }
    if (role === 'instructor') {
    courses = await connection.query(
        `
        SELECT c.course_name, c.exam_period,
          MAX(CASE WHEN gu.status = 'initial' THEN gu.upload_date END) AS initial_submission,
          MAX(CASE WHEN gu.status = 'final' THEN gu.upload_date END) AS final_submission
        FROM grade_uploads gu
        JOIN courses c ON gu.course_id = c.id
        WHERE c.instructor_id = ? AND c.institution = ?
        GROUP BY c.id
        ORDER BY c.exam_period DESC, c.course_name
      `,
      [instructorId, studentInstitution]
    );
    connection.release();
    }

    if (role !== 'student' && role !== 'instructor') {
        courses = await connection.query(
        `
        SELECT c.course_name, c.exam_period,
          MAX(CASE WHEN gu.status = 'initial' THEN gu.upload_date END) AS initial_submission,
          MAX(CASE WHEN gu.status = 'final' THEN gu.upload_date END) AS final_submission
        FROM grade_uploads gu
        JOIN courses c ON gu.course_id = c.id
        WHERE  c.institution = ?
        GROUP BY c.id
        ORDER BY c.exam_period DESC, c.course_name
      `,
      [studentInstitution]
        );
    connection.release();

    }


    const formatted = courses.map(c => ({
      course_name: c.course_name,
      exam_period: c.exam_period,
      initial_submission: c.initial_submission
        ? new Date(c.initial_submission).toLocaleDateString('en-GB')
        : null,
      final_submission: c.final_submission
        ? new Date(c.final_submission).toLocaleDateString('en-GB')
        : null
    }));

    return res.json({ courses: formatted });
  } catch (err) {
    console.error('Error in viewAvailableCourses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function validateExcel(req, res) {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'instructor') {
      return res.status(403).json({ error: 'Only instructors can validate files' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { range: 2 });

    const fullCourse = data[0]['Τμήμα Τάξης'] || '';
    const exam_period = data[0]['Περίοδος δήλωσης']?.trim() || '';
    const match = fullCourse.match(/^(.*?)\s*\((.*?)\)$/);
    const course_name = match ? match[1].trim() : fullCourse;

    const number_of_grades = data.filter(row => row['Βαθμολογία'] !== undefined && row['Βαθμολογία'] !== '').length;

    fs.unlinkSync(file.path); // remove temp upload

    return res.json({ course_name, exam_period, number_of_grades });
  } catch (err) {
    console.error("Error in validateExcel:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function viewStatistics(req, res) {
  try {
    const { course, exam_period } = req.query;
    const institution = req.headers['x-user-institution'];
    const role = req.headers['x-user-role'];
    if(role === 'student') {
      studentId = req.headers['x-student-id'];
    }
    const instructorId = req.headers['x-user-id'];

    if (!course || !exam_period || !institution) {
      return res.status(400).json({ error: 'Missing course, exam_period, or institution' });
    }

    const connection = await pool.getConnection();

    const courseRows = await connection.query(
      "SELECT id, instructor_id FROM courses WHERE (course_code = ? OR course_name = ?) AND institution = ?",
      [course, course, institution]
    );
    connection.release();

    if (!courseRows.length) {
      return res.status(404).json({ error: 'Course not found for institution' });
    }

    const course_id = courseRows[0].id;
    
    const course_instructor_id = courseRows[0].instructor_id;

    if (role === 'student') {
      if (!studentId) {
        connection.release();
        return res.status(403).json({ error: 'Missing student ID' });
      }

      const gradeCheck = await connection.query(
        `
        SELECT 1 FROM final_grades 
        WHERE student_id = ? AND exam_period = ? AND upload_id IN (
          SELECT id FROM grade_uploads WHERE course_id = ?
        )
        UNION
        SELECT 1 FROM initial_grades 
        WHERE student_id = ? AND exam_period = ? AND upload_id IN (
          SELECT id FROM grade_uploads WHERE course_id = ?
        )
        `,
        [studentId, exam_period, course_id, studentId, exam_period, course_id]
      );
      connection.release();

      if (!gradeCheck.length) {
        connection.release();
        return res.status(403).json({ error: 'No grades found for student in this course/period' });
      }

    } else if (role === 'instructor') {

      if (instructorId - course_instructor_id !== 0) {
        connection.release();
        return res.status(403).json({ error: 'You are not the assigned instructor for this course' });
      }

      // Cross-check: verify that the course belongs to their institution
      const instCheck = await connection.query(
        "SELECT 1 FROM instructors WHERE id = ? AND institution = ?",
        [instructorId, institution]
      );
      connection.release();

      if (!instCheck.length) {
        return res.status(403).json({ error: 'Instructor not part of this institution' });
      }

    } else if (role === 'institution') {
      // Ensure course actually belongs to their institution
      const courseCheck = await connection.query(
        "SELECT 1 FROM courses WHERE id = ? AND institution = ?",
        [course_id, institution]
      );
      connection.release();

      if (!courseCheck.length) {
        connection.release();
        return res.status(403).json({ error: 'Course does not belong to your institution' });
      }

    } else {
      connection.release();
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // 3. Προσπάθεια να πάρουμε final πρώτα
    let grades = await connection.query(
      `SELECT grade, count FROM grade_distribution 
       WHERE course_id = ? AND exam_period = ? AND status = 'final' AND institution = ?`,
      [course_id, exam_period, institution]
    );
    connection.release();
    let analytics = await connection.query(
      `SELECT question_label, grade, count 
       FROM analytic_grade_distribution 
       WHERE course_id = ? AND exam_period = ? AND status = 'final' AND institution = ?`,
      [course_id, exam_period, institution]
    );
    connection.release();

    // 4. Αν δεν υπάρχουν final, δοκίμασε με initial
    if (!grades.length && !analytics.length) {
      grades = await connection.query(
        `SELECT grade, count FROM grade_distribution 
         WHERE course_id = ? AND exam_period = ? AND status = 'initial' AND institution = ?`,
        [course_id, exam_period, institution]
      );
      connection.release();

      analytics = await connection.query(
        `SELECT question_label, grade, count 
         FROM analytic_grade_distribution 
         WHERE course_id = ? AND exam_period = ? AND status = 'initial' AND institution = ?`,
        [course_id, exam_period, institution]
      );
      connection.release();
    }


    return res.json({
      course,
      exam_period,
      grade_distribution: grades,
      analytic_distribution: analytics
    });

  } catch (err) {
    console.error('Error in viewStatistics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { postGrades, viewPersonalGrades, viewAvailableCourses, validateExcel, viewStatistics };
