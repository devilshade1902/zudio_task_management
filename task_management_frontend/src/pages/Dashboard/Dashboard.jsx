// src/pages/Dashboard/Dashboard.jsx
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
    tasks: [],
  });
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await axios.get("http://localhost:5001/api/tasks");
      const { tasks, ...stats } = response.data;
      setProgressData(response.data);

      // Filter overdue tasks (Pending or In Progress with dueDate < today)
      const today = new Date();
      const overdue = tasks.filter(
        (task) =>
          (task.status === "Pending" || task.status === "In Progress") &&
          task.dueDate &&
          new Date(task.dueDate) < today
      );
      setOverdueTasks(overdue);

      // Filter completed tasks
      const completed = tasks.filter((task) => task.status === "Completed");
      setCompletedTasks(completed);
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

  // Priority color function (same as ViewTasks.jsx)
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "#FF4D4F";
      case "Medium":
        return "#FAAD14";
      case "Low":
        return "#52C41A";
      default:
        return "#D9D9D9";
    }
  };

  return (
    <div className="dashboard container mt-4">
      <h2 className="dashboard-title">Admin Task Dashboard</h2>

      {/* Progress Bar */}
      <div className="row mb-5">
        <div className="col-md-6 mx-auto">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Overall Progress</h5>
              <div className="progress mb-3" style={{ height: "25px" }}>
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
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card text-white bg-primary dashboard-card">
            <div className="card-body">
              <h5 className="card-title">In Progress</h5>
              <p className="card-text display-6">{progressData.inProgressTasks}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-warning dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Pending</h5>
              <p className="card-text display-6">{progressData.pendingTasks}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-danger dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Overdue</h5>
              <p className="card-text display-6">{progressData.overdueTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Section */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Overdue Tasks</h5>
              {overdueTasks.length > 0 ? (
                <div className="row g-4">
                  {overdueTasks.map((task) => (
                    <div key={task._id} className="col-md-4">
                      <div
                        className="task-card"
                        style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}
                      >
                        <div className="card-body">
                          <h6 className="task-title">{task.title}</h6>
                          <p className="task-detail">
                            <strong>Due:</strong>{" "}
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleDateString()
                              : "Not set"}
                          </p>
                          <p className="task-detail">
                            <strong>Priority:</strong> {task.priority}
                          </p>
                          <p className="task-detail">
                            <strong>Assigned:</strong>{" "}
                            {task.assignedUsers.length > 0
                              ? task.assignedUsers.join(", ")
                              : "Not assigned"}
                          </p>
                          <p className="task-detail">
                            <strong>Category:</strong> {task.category || "None"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-tasks">No overdue tasks.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Tasks Section */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card dashboard-card">
            <div className="card-body">
              <h5 className="card-title">Completed Tasks</h5>
              {completedTasks.length > 0 ? (
                <div className="row g-4">
                  {completedTasks.map((task) => (
                    <div key={task._id} className="col-md-4">
                      <div
                        className="task-card"
                        style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}
                      >
                        <div className="card-body">
                          <h6 className="task-title">{task.title}</h6>
                          <p className="task-detail">
                            <strong>Due:</strong>{" "}
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleDateString()
                              : "Not set"}
                          </p>
                          <p className="task-detail">
                            <strong>Priority:</strong> {task.priority}
                          </p>
                          <p className="task-detail">
                            <strong>Assigned:</strong>{" "}
                            {task.assignedUsers.length > 0
                              ? task.assignedUsers.join(", ")
                              : "Not assigned"}
                          </p>
                          <p className="task-detail">
                            <strong>Category:</strong> {task.category || "None"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-tasks">No completed tasks.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div className="row mb-5">
        <div className="col-md-8 mx-auto">
          <div className="card dashboard-card">
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