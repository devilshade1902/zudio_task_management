import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Dashboard.css";
import ChatBox from "../../components/chatbox/Chatbox";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [progressData, setProgressData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
  });

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/tasks");
      setProgressData(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const completionPercentage = progressData.totalTasks
    ? (progressData.completedTasks / progressData.totalTasks) * 100
    : 0;

  // Bar Chart Data
  const barData = {
    labels: ["Completed", "In Progress", "Pending", "Overdue"],
    datasets: [
      {
        label: "Tasks",
        data: [
          progressData.completedTasks,
          progressData.inProgressTasks,
          progressData.pendingTasks,
          progressData.overdueTasks,
        ],
        backgroundColor: ["#28a745", "#007bff", "#ffc107", "#dc3545"],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Task Status Distribution" },
    },
  };

  return (
    <div className="dashboard container mt-4">
      <h2 className="text-center mb-4">Task Progress Dashboard</h2>

      {/* Progress Bar */}
      <div className="row mb-4">
        <div className="col-md-6 mx-auto">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Overall Progress</h5>
              <div className="progress mb-3" style={{ height: "20px" }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${completionPercentage}%` }}
                  aria-valuenow={completionPercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {completionPercentage.toFixed(1)}%
                </div>
              </div>
              <p className="card-text">
                Total Tasks: <strong>{progressData.totalTasks}</strong> | Completed:{" "}
                <strong>{progressData.completedTasks}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Status Cards */}
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card text-white bg-primary shadow-sm">
            <div className="card-body">
              <h5 className="card-title">In Progress</h5>
              <p className="card-text display-6">{progressData.inProgressTasks}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-warning shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Pending</h5>
              <p className="card-text display-6">{progressData.pendingTasks}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-danger shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Overdue</h5>
              <p className="card-text display-6">{progressData.overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div className="row mb-4 m-4">
        <div className="col-md-8 mx-auto">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Task Distribution</h5>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* ChatBox Component */}
      <ChatBox />

      <div style={{ height: "100vh" }}></div>
    </div>
  );
};

export default Dashboard;
