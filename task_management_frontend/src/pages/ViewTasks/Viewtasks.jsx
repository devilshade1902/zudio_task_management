import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { jwtDecode } from 'jwt-decode';
import "./ViewTasks.css";
import Select from 'react-select';

const ViewTasks = () => {
  const [tasks, setTasks] = useState({
    "Pending": [],
    "In Progress": [],
    "Completed": []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isNewTask, setIsNewTask] = useState(false);
  const [users, setUsers] = useState(["None"]);
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
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers([...response.data.map(user => user.name), "None"]);
    } catch (err) {
      console.error('Error fetching users:', err.response?.data?.message || err.message);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/tasks');
      const tasksByStatus = {
        "Pending": [],
        "In Progress": [],
        "Completed": []
      };
      response.data.tasks.forEach(task => {
        if (tasksByStatus[task.status]) {
          tasksByStatus[task.status].push({
            ...task,
            assignedUsers: task.assignedUsers || [],
          });
        }
      });
      setTasks(tasksByStatus);
    } catch (err) {
      console.error('Error fetching tasks:', err.response?.data?.message || err.message);
      setError('Failed to load tasks. Please try again.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTasks(),
        isAdmin ? fetchUsers() : Promise.resolve(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [isAdmin]);

  const handleDelete = async (taskId, status) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`http://localhost:5001/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTasks(prev => ({
          ...prev,
          [status]: prev[status].filter(task => task._id !== taskId)
        }));
      } catch (err) {
        console.error('Error deleting task:', err.response?.data?.message || err.message);
        setError('Failed to delete task. Please try again.');
      }
    }
  };

  const handleEdit = (task) => {
    if (!isAdmin) return;
    setSelectedTask({
      ...task,
      assignedUsers: task.assignedUsers || [],
    });
    setIsNewTask(false);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (!isAdmin) return;
    setSelectedTask({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      dueDate: "",
      assignedUsers: [],
      employeesAssigned: 0,
      document: null,
      category: ""
    });
    setIsNewTask(true);
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#FF4D4F';
      case 'Medium': return '#FAAD14';
      case 'Low': return '#52C41A';
      default: return '#D9D9D9';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: selectedTask.title,
        description: selectedTask.description,
        status: selectedTask.status,
        priority: selectedTask.priority,
        dueDate: selectedTask.dueDate || null,
        assignedUsers: selectedTask.assignedUsers,
        employeesAssigned: selectedTask.employeesAssigned,
        document: selectedTask.document,
        category: selectedTask.category,
      };
      if (isNewTask) {
        await axios.post('http://localhost:5001/api/tasks', taskData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.put(`http://localhost:5001/api/tasks/${selectedTask._id}`, taskData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Error saving task:', err.response?.data?.message || err.message);
      setError(`Failed to ${isNewTask ? 'create' : 'update'} task. Please try again.`);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const sourceTasks = [...tasks[source.droppableId]];
    const [movedTask] = sourceTasks.splice(source.index, 1);
    const updatedTask = { ...movedTask, status: destination.droppableId };

    const destinationTasks = [...tasks[destination.droppableId]];
    destinationTasks.splice(destination.index, 0, updatedTask);

    setTasks(prev => ({
      ...prev,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destinationTasks
    }));

    try {
      const taskData = {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate || null,
        assignedUsers: updatedTask.assignedUsers,
        employeesAssigned: updatedTask.employeesAssigned,
        document: updatedTask.document,
        category: updatedTask.category,
      };
      await axios.put(`http://localhost:5001/api/tasks/${movedTask._id}`, taskData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error('Error updating task status:', err.response?.data?.message || err.message);
      setError(`Failed to update task status: ${err.response?.data?.message || err.message}. Reverting changes.`);
      // Revert optimistic update
      setTasks(prev => ({
        ...prev,
        [source.droppableId]: [...prev[source.droppableId], movedTask],
        [destination.droppableId]: prev[destination.droppableId].filter(task => task._id !== movedTask._id)
      }));
      setTimeout(() => setError(null), 5000); // Clear error after 5s
    }
  };

  if (loading) {
    return (
      <div className="kanban-container viewtasks-loading">
        <div className="loader">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kanban-container error">
        <p>{error}</p>
        <button onClick={() => { setError(null); fetchTasks(); }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2>Tasks Overview</h2>
        {isAdmin && (
          <button className="add-task-btn" onClick={handleAddNew}>
            <FaPlus /> Add New Task
          </button>
        )}
      </div>

      {isAdmin ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            {Object.entries(tasks).map(([status, taskList]) => (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    className="kanban-column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h3>{status} ({taskList.length})</h3>
                    <div className="task-list">
                      {taskList.map((task, index) => (
                        <Draggable
                          key={task._id.toString()}
                          draggableId={task._id.toString()}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="task-card"
                              style={{
                                borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                                ...provided.draggableProps.style
                              }}
                            >
                              <div className="card-header">
                                <h4>{task.title}</h4>
                                <div className="card-actions">
                                  <button onClick={() => handleEdit(task)}><FaEdit /></button>
                                  <button onClick={() => handleDelete(task._id, status)}><FaTrash /></button>
                                </div>
                              </div>
                              <p className="task-description">{task.description || "No description"}</p>
                              <p><strong>Priority:</strong> {task.priority}</p>
                              <p><strong>Due:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>
                              <p><strong>Assigned:</strong> {task.assignedUsers.length > 0 ? task.assignedUsers.join(', ') : "Not assigned"}</p>
                              <p><strong>Employees:</strong> {task.employeesAssigned}</p>
                              <p><strong>Category:</strong> {task.category || "None"}</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="kanban-board">
          {Object.entries(tasks).map(([status, taskList]) => (
            <div className="kanban-column" key={status}>
              <h3>{status} ({taskList.length})</h3>
              <div className="task-list">
                {taskList.map((task) => (
                  <div
                    key={task._id}
                    className="task-card"
                    style={{
                      borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                    }}
                  >
                    <div className="card-header">
                      <h4>{task.title}</h4>
                    </div>
                    <p className="task-description">{task.description || "No description"}</p>
                    <p><strong>Priority:</strong> {task.priority}</p>
                    <p><strong>Due:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>
                    <p><strong>Assigned:</strong> {task.assignedUsers.length > 0 ? task.assignedUsers.join(', ') : "Not assigned"}</p>
                    <p><strong>Employees:</strong> {task.employeesAssigned}</p>
                    <p><strong>Category:</strong> {task.category || "None"}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && selectedTask && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{isNewTask ? 'Create New Task' : 'Update Task'}</h3>
            <form onSubmit={handleSubmit} className="modal-form">
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
                    value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ""}
                    onChange={handleInputChange}
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
                  <select name="priority" value={selectedTask.priority} onChange={handleInputChange}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <Select
                    isMulti
                    options={users.filter(user => user !== "None").map(user => ({ value: user, label: user }))}
                    value={selectedTask.assignedUsers.map(user => ({ value: user, label: user }))}
                    onChange={selected => setSelectedTask(prev => ({
                      ...prev,
                      assignedUsers: selected.map(opt => opt.value)
                    }))}
                    isDisabled={!isAdmin}
                  />
                </div>
                <div className="form-group">
                  <label>Employees Assigned</label>
                  <input
                    type="number"
                    name="employeesAssigned"
                    value={selectedTask.employeesAssigned}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Upload Document</label>
                  <input type="file" accept=".pdf,.docx,.png,.jpg" onChange={handleFileChange} />
                  {selectedTask.document && <p>Current: {selectedTask.document}</p>}
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      name="category"
                      value={selectedTask.category || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., Development, Design"
                    />
                  </div>
                )}
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
                <button type="submit" className="submit-btn">
                  {isNewTask ? 'Create Task' : 'Update Task'}
                </button>
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTasks;