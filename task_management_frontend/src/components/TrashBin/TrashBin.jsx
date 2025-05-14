import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTrashRestore, FaTrash } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import "./TrashBin.css";

const TrashBin = () => {
  const [trashedTasks, setTrashedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsAdmin(decoded.role === 'Admin');
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid authentication token');
      }
    }
    fetchTrashedTasks();
  }, []);

  const fetchTrashedTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/tasks/trash', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrashedTasks(response.data.tasks);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trashed tasks:', err.response?.data?.message || err.message);
      setError('Failed to load trashed tasks. Please try again.');
      setLoading(false);
    }
  };

  const handleRestore = async (taskId) => {
    if (window.confirm("Are you sure you want to restore this task?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:5001/api/tasks/trash/${taskId}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTrashedTasks(prev => prev.filter(task => task._id !== taskId));
      } catch (err) {
        console.error('Error restoring task:', err.response?.data?.message || err.message);
        setError('Failed to restore task. Please try again.');
      }
    }
  };

  const handlePermanentDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5001/api/tasks/trash/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTrashedTasks(prev => prev.filter(task => task._id !== taskId));
      } catch (err) {
        console.error('Error permanently deleting task:', err.response?.data?.message || err.message);
        setError('Failed to permanently delete task. Please try again.');
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#FF4D4F';
      case 'Medium': return '#FAAD14';
      case 'Low': return '#52C41A';
      default: return '#D9D9D9';
    }
  };

  if (!isAdmin) {
    return <div className="trashbin-container">Access denied. Admins only.</div>;
  }

  if (loading) {
    return (
      <div className="trashbin-container trashbin-loading">
        <div className="loader">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trashbin-container error">
        <p>{error}</p>
        <button onClick={() => { setError(null); fetchTrashedTasks(); }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="trashbin-container">
      <div className="trashbin-header">
        <h2>Trash Bin</h2>
      </div>
      <div className="trashbin-list">
        {trashedTasks.length === 0 ? (
          <p className="trashbin-no-tasks">No tasks in the trash bin.</p>
        ) : (
          trashedTasks.map((task) => (
            <div
              key={task._id}
              className="trashbin-task-card"
              style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}
            >
              <div className="trashbin-task-content">
                <h4>{task.title}</h4>
                <p className="trashbin-task-description">{task.description || "No description"}</p>
                <p><strong>Priority:</strong> {task.priority}</p>
                <p><strong>Due:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>
                <p><strong>Assigned:</strong> {task.assignedUsers.length > 0 ? task.assignedUsers.join(', ') : "Not assigned"}</p>
                <p><strong>Deleted At:</strong> {new Date(task.deletedAt).toLocaleString()}</p>
              </div>
              <div className="trashbin-actions">
                <button onClick={() => handleRestore(task._id)} title="Restore Task">
                  <FaTrashRestore />
                </button>
                <button onClick={() => handlePermanentDelete(task._id)} title="Permanently Delete">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TrashBin;