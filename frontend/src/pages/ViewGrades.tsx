import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

interface Course {
  course_name: string;
  exam_period: string;
  final_submission: string | null;
}

const ViewGrades = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [message, setMessage] = useState("");
  const [viewedGrade, setViewedGrade] = useState<null | {
    course: string;
    exam_period: string;
    status: string;
    grade: string | null;
    analytic_grades: {
      question_label: ReactNode; question: string; grade: string 
}[];
  }>(null);
  const [reviewReply, setReviewReply] = useState<null | {
  reply: {
    id: number;
    review_request_id: number;
    status: string;
    message: string;
    attachment_path?: string;
    ack: boolean;
    replied_at: string;
  };
  request: {
    course: string;
    period: string;
    message: string;
    created_at: string;
  };
}>(null);


  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${API}/grades/available`, {
          headers: authService.getAuthHeaders(),
        });
        setCourses(response.data.courses);
      } catch (error) {
        toast.error("Failed to fetch courses.");
      }
    };

    fetchCourses();
  }, []);

  const handleAskForReview = (course: Course) => {
    setSelectedCourse(course);
    setViewedGrade(null); // reset viewed grade
    setReviewReply(null); // ⬅️ hide review reply
    setMessage("");
  };
  const handleViewGrades = async (course: Course) => {
    setSelectedCourse(null); // hide review form
    setReviewReply(null); // ⬅️ hide review reply
    try {
      const res = await axios.get(`${API}/grades/view`, {
        params: {
          course: course.course_name,
          exam_period: course.exam_period,
        },
        headers: authService.getAuthHeaders(),
      });
      const data = res.data;

      const analytics = Array.isArray(data.analytic_grades)
        ? data.analytic_grades
        : [data.analytic_grades]; // wrap object in array if needed

      setViewedGrade({
        ...data,
        analytic_grades: analytics,
      });

      console.log("Grade response:", res.data);

    } catch (err) {
      toast.error("Failed to fetch grades.");
      setViewedGrade(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCourse) return;

          const confirmed = window.confirm(
        "Are you sure you want to submit this review request?\n\nThis action is final and cannot be changed."
      );

      if (!confirmed) return;

      try {
      await axios.post(

        `${API}/reviews/request`,
        {
          course: selectedCourse.course_name,
          period: selectedCourse.exam_period,
          message,
        },
        {
          headers: {
            ...authService.getAuthHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Review request submitted!");
      setSelectedCourse(null);
    } catch (error) {
      console.error("Review request failed:", error);
      let errorMessage = "Unknown error";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object" &&
        (error as any).response !== null &&
        "data" in (error as any).response &&
        typeof (error as any).response.data === "object" &&
        (error as any).response.data !== null &&
        "error" in (error as any).response.data
      ) {
        errorMessage = (error as any).response.data.error;
      }
      toast.error("Submission failed:"+ " " + errorMessage);
    }
  };
  const handleViewReviewReply = async (course: Course) => {
  setSelectedCourse(null);
  setViewedGrade(null);
  setReviewReply(null);

  const bodyreview = {
    course: course.course_name,
    period: course.exam_period,
    id: null,
  };
  const bodyreply = {
    course: course.course_name,
    period: course.exam_period,
    reviewId: null,
  };

  try {
    const replyRes = await axios.post(`${API}/replies/view`, 
      bodyreply
    ,{
      headers: authService.getAuthHeaders(),
    });

    const reviewRes = await axios.post(`${API}/reviews/view`, 
      bodyreview
    ,{
      headers: authService.getAuthHeaders(),
    });
    console.log("Reply response:", replyRes.data);
    console.log("Review response:", reviewRes.data);
    setReviewReply({
      reply: replyRes.data[0],
      request: reviewRes.data[0],
    });
  } catch (err) {
    toast.error("No reply available or request failed.");
  }
};
const handleAcknowledge = async (requestId: number) => {
  try {
    await axios.post(
      `${API}/reviews/ack`,
      { review_request_id: requestId },
      { headers: authService.getAuthHeaders() }
    );

    toast.success("Reply acknowledged");
    // Refresh reply state
    setReviewReply((prev) =>
      prev ? { ...prev, reply: { ...prev.reply, ack: true } } : prev
    );
  } catch {
    toast.error("Failed to acknowledge reply.");
  }
};



return (
  <div className="viewgrades-page">
    <h1 className="viewgrades-title">View Grades</h1>

    {/* Courses Table */}
    <div className="viewgrades-card">
      <table className="viewgrades-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Exam Period</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, idx) => {
            const isOpen = c.final_submission === null;
            return (
              <tr key={idx}>
                <td>{c.course_name}</td>
                <td>{c.exam_period}</td>
                <td>
                  <span className={`viewgrades-status ${isOpen ? "open" : "closed"}`}>
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="viewgrades-actions">
                  <button onClick={() => handleViewGrades(c)} className="viewgrades-button">
                    View My Grades
                  </button>
                  <button
                    onClick={() => handleAskForReview(c)}
                    disabled={!isOpen}
                    className={`viewgrades-button ${!isOpen ? "disabled" : ""}`}
                  >
                    Ask for Review
                  </button>
                  <button onClick={() => handleViewReviewReply(c)} className="viewgrades-button">
                    View Review Reply
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Review Form */}
    {selectedCourse && (
      <div className="viewgrades-card">
        <h2 className="section-title">
          Request Review for:{" "}
          <span className="viewgrades-highlight">
            {selectedCourse.course_name} ({selectedCourse.exam_period})
          </span>
        </h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          placeholder="Message to instructor (max 200 characters)"
          rows={4}
          className="viewgrades-textarea"
        />

        <button onClick={handleSubmit} className="viewgrades-confirm">
          Submit My Request
        </button>
      </div>
    )}

    {/* Grade Info */}
    {viewedGrade && (
      <div className="viewgrades-card">
        <h2 className="section-title">
          Grades for:{" "}
          <span className="viewgrades-highlight">{viewedGrade.course}</span> (
          {viewedGrade.exam_period})
        </h2>

        <div className="mb-3 text-sm">
          <strong>Status:</strong> {viewedGrade.status || "-"} <br />
          <strong>Total Grade:</strong> {viewedGrade.grade ?? "-"}
        </div>

        <h3 className="font-semibold mt-4 mb-2">Analytic Grades</h3>
        {viewedGrade.analytic_grades?.length > 0 ? (
          <table className="viewgrades-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {viewedGrade.analytic_grades.map((a, i) => (
                <tr key={i}>
                  <td>{a.question_label}</td>
                  <td>{a.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm italic text-gray-500">No analytic grades available.</p>
        )}
      </div>
    )}

    {/* Instructor Reply */}
    {reviewReply && (
      <div className="viewgrades-card grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Review Request</h3>
          <p><strong>Course:</strong> {reviewReply.request.course}</p>
          <p><strong>Period:</strong> {reviewReply.request.period}</p>
          <p><strong>Message:</strong> {reviewReply.request.message}</p>
          <p><strong>Requested At:</strong> {new Date(reviewReply.request.created_at).toLocaleString()}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Instructor Reply</h3>
          <p><strong>Status:</strong> {reviewReply.reply.status}</p>
          <p><strong>Message:</strong> {reviewReply.reply.message}</p>
          <p><strong>Replied At:</strong> {new Date(reviewReply.reply.replied_at).toLocaleString()}</p>

          {reviewReply.reply.attachment_path && (
            <p>
              <strong>Attachment:</strong>{" "}
              <a href={reviewReply.reply.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                View File
              </a>
            </p>
          )}

          {!reviewReply.reply.ack && (
            <button
              onClick={() => handleAcknowledge(reviewReply.reply.review_request_id)}
              className="viewgrades-confirm mt-3"
            >
              Acknowledge Reply
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);
}

export default ViewGrades;