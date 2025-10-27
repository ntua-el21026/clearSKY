import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ResponsiveContainer
} from "recharts";
import { authService } from "../services/authService";
import { normalizeGrades, groupAndNormalizeByQuestion } from "../utils/statisticsUtils";

// Data types
interface Course {
  course_name: string;
  exam_period: string;
  initial_submission: string;
  final_submission: string | null;
}

interface GradeCount {
  grade: number;
  count: number;
}

interface QuestionChart {
  [question_label: string]: GradeCount[];
}

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#e11d48", "#0ea5e9", "#facc15", "#84cc16"];

const Statistics = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [gradeDistribution, setGradeDistribution] = useState<GradeCount[]>([]);
  const [questionCharts, setQuestionCharts] = useState<QuestionChart>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    axios.get(`${API}/grades/available`, {
      headers: authService.getAuthHeaders(),
    })
      .then((res) => setCourses(res.data.courses))
      .catch((err) => console.error("Courses fetch failed:", err));
  }, []);

  const fetchStatistics = (course: Course) => {
    setSelectedCourse(course);
    setActiveQuestionIndex(0);
    const params = new URLSearchParams({
      course: course.course_name,
      exam_period: course.exam_period,
    });

    axios.get(`${API}/grades/statistics?${params.toString()}`, {
      headers: authService.getAuthHeaders(),
    })
      .then((res) => {
        setGradeDistribution(normalizeGrades(res.data.grade_distribution));
        setQuestionCharts(groupAndNormalizeByQuestion(res.data.analytic_distribution));
      })
      .catch((err) => console.error("Statistics fetch failed:", err));
  };

  const questionLabels = Object.keys(questionCharts);
  const activeLabel = questionLabels[activeQuestionIndex];
  const activeData = questionCharts[activeLabel] || [];

  return (
    <div className="stats-page">
      <div className="stats-header">

        {selectedCourse && (
          <button
            onClick={() => {
              setSelectedCourse(null);
              setGradeDistribution([]);
              setQuestionCharts({});
            }}
            className="nav-btn"
          >
            <span>←</span> Courses
          </button>
        )}
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Course name</th>
            <th>Exam period</th>
            <th>Initial grades</th>
            <th>Final grades</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, idx) => (
            <tr
              key={idx}
              onClick={() => fetchStatistics(course)}
              className="table-row"
            >
              <td>{course.course_name}</td>
              <td>{course.exam_period}</td>
              <td>{course.initial_submission || "-"}</td>
              <td>{course.final_submission || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {gradeDistribution.length > 0 && selectedCourse && (
        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="section-title">{selectedCourse?.course_name}</h3>
            {activeData.length > 0 && (
              <div className="chart-nav">
                <button
                  onClick={() =>
                    setActiveQuestionIndex(
                      (i) => (i - 1 + questionLabels.length) % questionLabels.length
                    )
                  }
                  className="nav-btn"
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setActiveQuestionIndex(
                      (i) => (i + 1) % questionLabels.length
                    )
                  }
                  className="nav-btn"
                >
                  →
                </button>
              </div>
            )}
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h4 className="section-title">Grade Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {activeData.length > 0 && (
              <div className="chart-card">
                <h4 className="section-title">Question {activeLabel}</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

  );
};

export default Statistics;
