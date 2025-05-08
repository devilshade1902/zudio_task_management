import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TaskCard.css';

function TaskCard({ task, currentUser }) {
  const navigate = useNavigate();

  const joinChatRoom = () => {
    const roomname = encodeURIComponent(task.title);
    navigate(`/chat/${roomname}`, { state: { username: currentUser, roomId: task._id, roomname: task.title } });
  };

  return (
    <div className="task-card">
      <h3 className="task-card-title">{task.title}</h3>
      <div className="task-card-actions">
        <button className="task-card-button join-button" onClick={joinChatRoom}>
          Join Chat Room
        </button>
      </div>
    </div>
  );
}

export default TaskCard;