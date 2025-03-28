// src/pages/Tasks/ViewTasks.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import "./ViewTasks.css";

const ViewTasks = () => {
  const [tasks, setTasks] = useState({
    "Pending": [],
    "In Progress": [],
    "Completed": []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isNewTask, setIsNewTask] = useState(false);
  const users = ["John Doe", "Jane Smith", "Alice Brown", "Bob Johnson"];

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
          tasksByStatus[task.status].push(task);
        }
      });
      setTasks(tasksByStatus);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId, status) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`http://localhost:5001/api/tasks/${taskId}`);
        setTasks(prev => ({
          ...prev,
          [status]: prev[status].filter(task => task._id !== taskId)
        }));
      } catch (err) {
        console.error('Error deleting task:', err);
        alert("Failed to delete task. Please try again.");
      }
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsNewTask(false);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTask({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      dueDate: "",
      assignedUser: "",
      employeesAssigned: 1,
      document: null
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
      if (isNewTask) {
        await axios.post('http://localhost:5001/api/tasks', selectedTask);
      } else {
        await axios.put(`http://localhost:5001/api/tasks/${selectedTask._id}`, selectedTask);
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      alert(`Failed to ${isNewTask ? 'create' : 'update'} task. Please try again.`);
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
      await axios.put(`http://localhost:5001/api/tasks/${movedTask._id}`, updatedTask);
    } catch (err) {
      console.error('Error updating task status:', err);
      fetchTasks();
    }
  };

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2>Tasks Overview</h2>
        <button className="add-task-btn" onClick={handleAddNew}>
          <FaPlus /> Add New Task
        </button>
      </div>

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
                            <p>{task.description || "No description"}</p>
                            <p><strong>Priority:</strong> {task.priority}</p>
                            <p><strong>Due:</strong> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}</p>
                            <p><strong>Assigned:</strong> {task.assignedUser || "Not assigned"}</p>
                            <p><strong>Employees:</strong> {task.employeesAssigned}</p>
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

      {isModalOpen && selectedTask && (
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
                  <select name="assignedUser" value={selectedTask.assignedUser} onChange={handleInputChange}>
                    <option value="">Select User</option>
                    {users.map((user, index) => (
                      <option key={index} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Employees Assigned</label>
                  <input
                    type="number"
                    name="employeesAssigned"
                    value={selectedTask.employeesAssigned}
                    onChange={handleInputChange}
                    min="1"
                  />
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
                    value={selectedTask.description}
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