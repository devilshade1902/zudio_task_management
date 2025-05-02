import React, { useEffect, useState } from 'react';
import TaskCard from './TaskCard';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const currentUser = 'dora'; // Replace with actual user from auth context later

  useEffect(() => {
    fetch('http://localhost:5001/api/tasks')
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks))
      .catch((err) => console.error('Error fetching tasks:', err));
  }, []);

  return (
    <div className="task-list">
      <h1>Task List</h1>
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} currentUser={currentUser} />
      ))}
    </div>
  );
}

export default TaskList;
