import React, { useEffect, useState } from "react";
import axios from "axios";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_BASE_URL;

interface ReviewRequest {
  id: number;
  student_id: string;
  institution: string;
  course: string;
  period: string;
  status: string;
  created_at: string;
}

const ReviewRequests = () => {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [replyStatus, setReplyStatus] = useState("accepted");
  const [replyMessage, setReplyMessage] = useState("");
  const [attachmentPath, setAttachmentPath] = useState("");
  const [reviewDetail, setReviewDetail] = useState<{
    course: string;
    period: string;
    message: string;
    created_at: string;
  } | null>(null);


    const fetchRequests = async () => {
      try {
        const res = await axios.get(`${API}/reviews/instructor`, {
          headers: authService.getAuthHeaders(),
        });
        setRequests(res.data);
      } catch {
        toast.error("Failed to fetch review requests.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
     fetchRequests();
    }, []);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const confirmed = window.confirm(
      "Are you sure you want to send this reply? This action is final."
    );
    if (!confirmed) return;

    try {
      await axios.post(
        `${API}/reviews/reply`,
        {
          review_request_id: selectedRequest.id,
          status: replyStatus,
          message: replyMessage,
          attachment_path: attachmentPath,
        },
        {
          headers: authService.getAuthHeaders(),
        }
      );
      toast.success("Reply sent successfully.");
      setSelectedRequest(null);
      setReviewDetail(null);

      setLoading(true);
      fetchRequests();
    } catch {
      toast.error("Failed to send reply.");
    }
  };

  return (
    <div className="grades-page">
      <div className="grades-card">
        <h1 className="grades-title">Review Requests</h1>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">No review requests found.</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Exam Period</th>
                <th>Student ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="table-row">
                  <td>{r.course}</td>
                  <td>{r.period}</td>
                  <td>{r.student_id}</td>
                  <td>
                    <button
                      className="viewgrades-button"
                      onClick={async () => {
                        setSelectedRequest(r);
                        setReplyStatus("accepted");
                        setReplyMessage("");
                        setAttachmentPath("");

                        try {
                          const res = await axios.post(
                            `${API}/reviews/view`,
                            {
                              course: null,
                              period: null,
                              id: r.id,
                            },
                            {
                              headers: authService.getAuthHeaders(),
                            }
                          );
                          if (Array.isArray(res.data) && res.data.length > 0) {
                            setReviewDetail(res.data[0]);
                          } else {
                            setReviewDetail(null);
                          }
                        } catch {
                          toast.error("Failed to fetch review details.");
                          setReviewDetail(null);
                        }
                      }}
                    >
                      Reply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <>
          <div className="grades-card">
            <h2 className="grades-title">Review Request Details</h2>
            {reviewDetail ? (
              <div className="grades-parse-grid">
                <div>
                  <label>Course:</label>
                  <input type="text" readOnly value={reviewDetail.course} />
                </div>
                <div>
                  <label>Exam Period:</label>
                  <input type="text" readOnly value={reviewDetail.period} />
                </div>
                <div>
                  <label>Message:</label>
                  <input type="text" readOnly value={reviewDetail.message} />
                </div>
                <div>
                  <label>Requested At:</label>
                  <input
                    type="text"
                    readOnly
                    value={new Date(reviewDetail.created_at).toLocaleString()}
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No details available.</p>
            )}
          </div>

          <div className="grades-card">
            <h2 className="grades-title">Send Reply</h2>
            <form onSubmit={handleSubmitReply} className="grades-parse-grid">
              <div>
                <label>Action:</label>
                <select
                  className="viewgrades-textarea"
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                >
                  <option value="accepted">Accept</option>
                  <option value="denied">Deny</option>
                </select>
              </div>

              <div>
                <label>Message to Student:</label>
                <textarea
                  className="viewgrades-textarea"
                  rows={4}
                  maxLength={500}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>File Link (optional):</label>
                <input
                  className="viewgrades-textarea"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={attachmentPath}
                  onChange={(e) => setAttachmentPath(e.target.value)}
                />
              </div>

              <button type="submit" className="viewgrades-confirm">
                Send Reply
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewRequests;
