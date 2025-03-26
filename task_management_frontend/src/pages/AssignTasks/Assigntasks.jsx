// src/pages/Tasks/AssignTasks.jsx
import React, { useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import "./AssignTasks.css";

const AssignTasks = () => {
  const [task, setTask] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    dueDate: "",
    assignedUser: "",
    document: null,
  });

  const users = ["John Doe", "Jane Smith", "Alice Brown", "Bob Johnson"];
  const navigate = useNavigate(); // Initialize useNavigate

  const handleChange = (e) => {
    setTask({ ...task, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTask({ ...task, document: file.name });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedUser: task.assignedUser,
        document: task.document,
      };

      await axios.post('http://localhost:5001/api/tasks', taskData);
      setTask({
        title: "",
        description: "",
        status: "Pending",
        priority: "Medium",
        dueDate: "",
        assignedUser: "",
        document: null,
      });
      navigate('/dashboard/view-tasks'); // Redirect to ViewTasks after success
    } catch (err) {
      console.error('Error assigning task:', err);
      alert("Failed to assign task. Please try again.");
    }
  };

  return (
    <div className="assign-tasks-container">
      <h2>Assign New Task</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              name="title"
              value={task.title}
              onChange={handleChange}
              placeholder="Enter task title"
              required
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={task.dueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={task.status} onChange={handleChange}>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select name="priority" value={task.priority} onChange={handleChange}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label>Assign To</label>
            <select name="assignedUser" value={task.assignedUser} onChange={handleChange} required>
              <option value="">Select User</option>
              {users.map((user, index) => (
                <option key={index} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Upload Document</label>
            <input type="file" accept=".pdf,.docx,.png,.jpg" onChange={handleFileChange} />
            {task.document && <p className="file-name">📄 {task.document}</p>}
          </div>
        </div>
        <div className="form-group full-width">
          <label>Description</label>
          <textarea
            name="description"
            value={task.description}
            onChange={handleChange}
            placeholder="Enter task details"
            required
          ></textarea>
        </div>
        <button type="submit">Assign Task</button>
      </form>
    </div>
  );
};

export default AssignTasks;