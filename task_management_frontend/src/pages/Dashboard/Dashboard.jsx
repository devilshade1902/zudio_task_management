// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Dashboard.css";
import ChatBox from "../../components/chatbox/Chatbox";

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

  // Fetch tasks and compute stats
  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/tasks');
      setProgressData({
        totalTasks: response.data.totalTasks,
        completedTasks: response.data.completedTasks,
        inProgressTasks: response.data.inProgressTasks,
        pendingTasks: response.data.pendingTasks,
        overdueTasks: response.data.overdueTasks,
        highPriority: response.data.highPriority,
        mediumPriority: response.data.mediumPriority,
        lowPriority: response.data.lowPriority,
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const completionPercentage = (progressData.completedTasks / progressData.totalTasks) * 100 || 0;

  return (
    <div className="dashboard container mt-4">
      <h2 className="text-center mb-4">Task Progress Dashboard</h2>
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
      <div className="row g-4 mt-4">
        <div className="col-md-4">
          <div className="card border-danger shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-danger">High Priority</h5>
              <p className="card-text display-6">{progressData.highPriority}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-warning shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-warning">Medium Priority</h5>
              <p className="card-text display-6">{progressData.mediumPriority}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-success shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-success">Low Priority</h5>
              <p className="card-text display-6">{progressData.lowPriority}</p>
            </div>
          </div>
        </div>
      </div>
      <ChatBox />
      <div style={{ height: "100vh" }}></div>
    </div>
  );
};

export default Dashboard;