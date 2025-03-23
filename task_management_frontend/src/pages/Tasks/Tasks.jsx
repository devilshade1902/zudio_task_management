// task-management-frontend/src/pages/Tasks/Tasks.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Tasks.css';

const Tasks = () => {
  const [taskData, setTaskData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    employeesAssigned: 0,
    tasks: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    employeesAssigned: 0,
  });

  // Fetch tasks from backend
  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tasks');
      setTaskData({
        totalTasks: response.data.totalTasks,
        completedTasks: response.data.completedTasks,
        pendingTasks: response.data.pendingTasks,
        employeesAssigned: response.data.employeesAssigned,
        tasks: response.data.tasks,
      });
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle input changes in the form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: name === 'employeesAssigned' ? parseInt(value) || 0 : value,
    }));
  };

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault(); // Prevent form submission refresh
    if (!newTask.title) return;
    try {
      await axios.post('http://localhost:5000/api/tasks', {
        title: newTask.title,
        description: newTask.description,
        employeesAssigned: newTask.employeesAssigned,
      });
      setNewTask({ title: '', description: '', employeesAssigned: 0 });
      setIsModalOpen(false); // Close modal
      fetchTasks(); // Refresh task list
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  return (
    <div className="tasks-container">
      <h2 className="tasks-title">Tasks Overview</h2>
      <button className="create-task-btn" onClick={() => setIsModalOpen(true)}>
        Create New Task
      </button>

      {/* Modal for Task Creation */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  name="title"
                  value={newTask.title}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={newTask.description}
                  onChange={handleInputChange}
                  placeholder="Enter task description"
                />
              </div>
              <div className="form-group">
                <label>Employees Assigned:</label>
                <input
                  type="number"
                  name="employeesAssigned"
                  value={newTask.employeesAssigned}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-btn">Add Task</button>
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="cards-container">
        <div className="card">
          <h3>Total Tasks</h3>
          <p>{taskData.totalTasks}</p>
        </div>
        <div className="card">
          <h3>Tasks Completed</h3>
          <p>{taskData.completedTasks} / {taskData.totalTasks}</p>
        </div>
        <div className="card">
          <h3>Tasks Pending</h3>
          <p>{taskData.pendingTasks}</p>
        </div>
        <div className="card">
          <h3>Employees Assigned</h3>
          <p>{taskData.employeesAssigned}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="task-list">
  <h3>Task List</h3>
  {taskData.tasks.length === 0 ? (
    <p>No tasks available</p>
  ) : (
    <ul>
      {taskData.tasks.map(task => (
        <li key={task._id} className="task-item">
          <div>
            <strong>{task.title}</strong>
            <span className={`status ${task.completed ? 'completed' : 'pending'}`}>
              {task.completed ? 'Completed' : 'Pending'}
            </span>
          </div>
          {task.description && <p className="description">{task.description}</p>}
          <p className="employees">Employees: {task.employeesAssigned}</p>
        </li>
      ))}
    </ul>
  )}
</div>
    </div>
  );
};

export default Tasks;