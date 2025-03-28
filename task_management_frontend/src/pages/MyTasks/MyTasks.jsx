import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaCheck } from "react-icons/fa";
import "./MyTasks.css";

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setName(decoded.name || "");
      } catch (err) {
        console.error("Error decoding token:", err);
        setError("Invalid token. Please log in again.");
        setLoading(false);
        return;
      }
    } else {
      setError("Please log in to view your tasks.");
      setLoading(false);
      return;
    }

    const fetchMyTasks = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/tasks/mytasks?name=${encodeURIComponent(name)}`);
        setTasks(response.data.tasks);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching my tasks:", err);
        setError("Failed to load your tasks. Please try again.");
        setLoading(false);
      }
    };

    if (name) {
      fetchMyTasks();
    }
  }, [name]);

  const handleMarkAsCompleted = async (taskId) => {
    try {
      const response = await axios.put(`http://localhost:5001/api/tasks/mytasks/${taskId}/complete`);
      setTasks(tasks.map(task =>
        task._id === taskId ? { ...task, status: "Completed" } : task
      ));
    } catch (err) {
      console.error("Error marking task as completed:", err);
      alert("Failed to mark task as completed. Please try again.");
    }
  };

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

  if (loading) {
    return <div className="mytasks-container mytasks-loading">Loading your tasks...</div>;
  }

  if (error) {
    return <div className="mytasks-container mytasks-error">{error}</div>;
  }

  return (
    <div className="mytasks-container">
      <h2>My Tasks</h2>
      <div className="mytasks-list">
        {tasks.length === 0 ? (
          <p className="mytasks-no-tasks">No tasks assigned to you.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className="mytasks-task-card"
              style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}
            >
              <div className="mytasks-task-content">
                <h4>{task.title}</h4>
                <p>{task.description || "No description"}</p>
                <p><strong>Status:</strong> {task.status}</p>
                <p><strong>Priority:</strong> {task.priority}</p>
                <p>
                  <strong>Due:</strong>{" "}
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
                </p>
                <p><strong>Employees:</strong> {task.employeesAssigned}</p>
              </div>
              {task.status !== "Completed" && (
                <button
                  className="mytasks-complete-btn"
                  onClick={() => handleMarkAsCompleted(task._id)}
                >
                  <FaCheck /> Mark as Completed
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyTasks;