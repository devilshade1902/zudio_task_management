// src/pages/Tasks/ViewTasks.jsx
import React from "react";
import "./ViewTasks.css";

const ViewTasks = () => {
  // Dummy task data
  const tasks = [
    {
      title: "Design Homepage",
      description: "Create a modern UI for the homepage.",
      status: "In Progress",
      priority: "High",
      dueDate: "2024-03-30",
      assignedUser: "John Doe",
    },
    {
      title: "Fix Login Bug",
      description: "Resolve authentication issues.",
      status: "Pending",
      priority: "Medium",
      dueDate: "2024-04-02",
      assignedUser: "Jane Smith",
    },
    {
      title: "Update Documentation",
      description: "Add new API references.",
      status: "Completed",
      priority: "Low",
      dueDate: "2024-03-25",
      assignedUser: "Alice Brown",
    },
  ];

  // Function to determine card color based on priority
  const getPriorityClass = (priority) => {
    switch (priority) {
      case "High":
        return "card border-danger";
      case "Medium":
        return "card border-warning";
      case "Low":
        return "card border-success";
      default:
        return "card";
    }
  };

  return (
    <div className="view-tasks-container">
      <h2>Assigned Tasks</h2>
      <div className="tasks-grid">
        {tasks.map((task, index) => (
          <div key={index} className={getPriorityClass(task.priority)}>
            <div className="card-body">
              <h3 className="card-title">{task.title}</h3>
              <p className="card-text">{task.description}</p>
              <p><strong>Status:</strong> {task.status}</p>
              <p><strong>Priority:</strong> {task.priority}</p>
              <p><strong>Due Date:</strong> {task.dueDate}</p>
              <p><strong>Assigned To:</strong> {task.assignedUser}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewTasks;
