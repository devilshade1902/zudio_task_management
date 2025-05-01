import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TaskCard.css';

function TaskCard({ task, currentUser }) {
  const navigate = useNavigate();

  const joinChatRoom = () => {
    const roomname = `${encodeURIComponent(task.title)}`;
    navigate(`/chat/${roomname}`, { state: { username: currentUser } });
  };
  console.log("Rendering task card:", task);

  const completeTask = async () => {
    try {
      await fetch(`/tasks/complete/${task._id}`, { method: 'POST' });

      const roomId = `${task._id}`;
      const response = await fetch(`http://localhost:5001/delete-room/${roomId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(`Chat room for task "${task.title}" deleted successfully.`);
      } else {
        alert(`Failed to delete chat room for task "${task.title}".`);
      }
    } catch (error) {
      console.error('Error completing task or deleting chat room:', error);
    }
  };

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <button onClick={joinChatRoom}>Join Chat Room</button>
      <button onClick={completeTask}>Delete Room</button>
    </div>
  );
}

export default TaskCard;