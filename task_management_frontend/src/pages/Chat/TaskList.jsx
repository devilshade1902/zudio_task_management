import React, { useEffect, useState } from 'react';
import TaskCard from './TaskCard';
import { jwtDecode } from 'jwt-decode';
import './TaskList.css';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Fetch current user
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          setCurrentUser('Guest');
          return;
        }

        // Decode token to get user ID
        const decoded = jwtDecode(token);
        const userId = decoded.id;

        const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Error fetching user:', response.statusText);
          setCurrentUser('Guest');
          return;
        }

        const userData = await response.json();
        setCurrentUser(userData.name);
      } catch (err) {
        console.error('Error fetching current user:', err);
        setCurrentUser('Guest');
      }
    };

    // Fetch tasks
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }

        const decoded = jwtDecode(token);
        const isAdmin = decoded.role === 'Admin';
        const endpoint = isAdmin
          ? 'http://localhost:5001/api/tasks'
          : `http://localhost:5001/api/tasks/mytasks?name=${encodeURIComponent(decoded.name)}`;

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Error fetching tasks:', response.statusText);
          return;
        }

        const data = await response.json();
        setTasks(isAdmin ? data.tasks : data.tasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    fetchCurrentUser();
    fetchTasks();
  }, []);

  if (!currentUser) {
    return <div className="loading">Loading user...</div>;
  }

  return (
    <div className="task-list">
      <header className="task-list-header">
        <h1>Chat Rooms</h1>
      </header>
      <div className="task-list-content">
        {tasks.length === 0 ? (
          <p className="no-tasks">No tasks available. Create one to get started!</p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task._id} task={task} currentUser={currentUser} />
          ))
        )}
      </div>
    </div>
  );
}

export default TaskList;