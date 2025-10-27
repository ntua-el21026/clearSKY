import React, { useState, useRef } from "react";
import axios from "axios";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

const PostGrades = () => {
  const [file, setFile] = useState<File | null>(null);
  const [gradesType, setGradesType] = useState<"initial" | "final">("final");
  const [parsedInfo, setParsedInfo] = useState<{
    course_name: string;
    exam_period: string;
    number_of_grades: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API = import.meta.env.VITE_API_BASE_URL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setParsedInfo(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/grades/validateExcel`, formData, {
        headers: authService.getAuthHeaders(),
      });

      setParsedInfo(response.data);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Validation failed:", err);
      let errorMessage = "Unknown error";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as any).response === "object" &&
        (err as any).response !== null &&
        "data" in (err as any).response &&
        typeof (err as any).response.data === "object" &&
        (err as any).response.data !== null &&
        "error" in (err as any).response.data
      ) {
        errorMessage = (err as any).response.data.error;
      }
      toast.error("Validation failed: " + errorMessage);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setParsedInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmUpload = async () => {
    if (!parsedInfo) return;

    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }



    try {
      const endpoint = `${API}/grades/upload/${gradesType}`;
      await axios.post(endpoint, formData, {
        headers: authService.getAuthHeaders(),
      });

      setFile(null);


      toast.success(`Grades uploaded successfully! ${gradesType.toUpperCase()} grades posted.`);
      setFile(null);
      setParsedInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Upload failed:", err);
      let errorMessage = "Unknown error";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as any).response === "object" &&
        (err as any).response !== null &&
        "data" in (err as any).response &&
        typeof (err as any).response.data === "object" &&
        (err as any).response.data !== null &&
        "error" in (err as any).response.data
      ) {
        errorMessage = (err as any).response.data.error;
      }
      toast.error("Upload failed: " + errorMessage);
    }
  };

  return (
    <div className="grades-page">
      <div className="grades-card">
        <h2 className="grades-title">Post Grades</h2>
        <p className="grades-subtext">
          Upload an XLSX file containing grades for the course. You can submit either initial or final grades.
        </p>

        <div className="grades-controls">
          <select
            value={gradesType}
            onChange={(e) => setGradesType(e.target.value as "initial" | "final")}
          >
            <option value="initial">Initial</option>
            <option value="final">Final</option>
          </select>

          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <button onClick={handleUpload} disabled={!file}>
            Submit {gradesType.toUpperCase()} grades
          </button>
        </div>
      </div>

      {parsedInfo && (
        <div className="grades-card">
          <h2 className="grades-title">XLSX File Parsing</h2>

          <div className="grades-parse-grid">
            <div>
              <label>Course:</label>
              <input type="text" readOnly value={parsedInfo.course_name} />
            </div>
            <div>
              <label>Period:</label>
              <input type="text" readOnly value={parsedInfo.exam_period} />
            </div>
            <div>
              <label>n. of grades:</label>
              <input type="text" readOnly value={parsedInfo.number_of_grades} />
            </div>
          </div>

          <div className="grades-actions">
            <button onClick={handleConfirmUpload} className="confirm-btn">
              Confirm
            </button>
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostGrades;
