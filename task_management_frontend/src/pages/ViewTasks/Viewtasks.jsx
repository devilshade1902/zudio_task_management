// src/pages/Tasks/ViewTasks.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTrash, FaEdit } from 'react-icons/fa';
import "./ViewTasks.css";

const ViewTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const users = ["John Doe", "Jane Smith", "Alice Brown", "Bob Johnson"];

  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tasks');
      setTasks(response.data.tasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`http://localhost:5000/api/tasks/${taskId}`);
        setTasks(tasks.filter(task => task._id !== taskId));
      } catch (err) {
        console.error('Error deleting task:', err);
        alert("Failed to delete task. Please try again.");
      }
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedTask(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedTask(prev => ({ ...prev, document: file.name }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/tasks/${selectedTask._id}`, selectedTask);
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Error updating task:', err);
      alert("Failed to update task. Please try again.");
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "High": return "card high-priority";
      case "Medium": return "card medium-priority";
      case "Low": return "card low-priority";
      default: return "card";
    }
  };

  return (
    <div className="view-tasks-container">
      <h2>Assigned Tasks</h2>
      {tasks.length === 0 ? (
        <p>No tasks available</p>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task._id} className={getPriorityClass(task.priority)}>
              <div className="card-body">
                <div className="card-header">
                  <h3 className="card-title">{task.title}</h3>
                  <div>
                    <button className="edit-btn" onClick={() => handleEdit(task)} title="Edit Task">
                      <FaEdit />
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(task._id)} title="Delete Task">
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="card-text">{task.description || "No description provided"}</p>
                <p><strong>Status:</strong> {task.status}</p>
                <p><strong>Priority:</strong> {task.priority || "Not set"}</p>
                <p><strong>Due Date:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>
                <p><strong>Assigned To:</strong> {task.assignedUser || "Not assigned"}</p>
                {task.document && <p><strong>Document:</strong> {task.document}</p>}
                <p><strong>Employees Assigned:</strong> {task.employeesAssigned}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Modal */}
      {isModalOpen && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update Task</h3>
            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="title"
                    value={selectedTask.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={selectedTask.status} onChange={handleInputChange}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select name="priority" value={selectedTask.priority || "Medium"} onChange={handleInputChange}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select name="assignedUser" value={selectedTask.assignedUser || ""} onChange={handleInputChange}>
                    <option value="">Select User</option>
                    {users.map((user, index) => (
                      <option key={index} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Upload Document</label>
                  <input type="file" accept=".pdf,.docx,.png,.jpg" onChange={handleFileChange} />
                  {selectedTask.document && <p>Current: {selectedTask.document}</p>}
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={selectedTask.description || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn">Update Task</button>
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTasks;