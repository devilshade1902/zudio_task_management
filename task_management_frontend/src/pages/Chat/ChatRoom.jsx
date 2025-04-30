import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import '../Chat/ChatRoom.css'

const socket = io('http://localhost:5001');

function ChatRoom() {
  const [room, setRoom] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  const joinRoom = () => {
    if (room && username) {
      socket.emit('joinRoom', { room, username });
      setJoinedRoom(room);
      setChat([]);
    }
  };

  const sendMessage = () => {
    if (message.trim() !== '' && joinedRoom !== '') {
      socket.emit('sendMessage', { room: joinedRoom, message, username });
      setMessage('');
    }
  };

  useEffect(() => {
    socket.on('message', (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => socket.off('message');
  }, []);

  return (
    <div className="app-container">
      <div className="chat-box">
        <h2 className="chat-title">💬 Real-Time Chat</h2>

        {/* Room Join Section */}
        {!joinedRoom && (
          <div className="join-section">
            <input
              className="input"
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="input"
              type="text"
              placeholder="Enter room name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <button onClick={joinRoom} className="join-button">
              Join Room
            </button>
          </div>
        )}

        {/* Chat Section */}
        {joinedRoom && (
          <>
            <div className="joined-room">
              Joined Room: <span className="joined-room-name">{joinedRoom}</span>
            </div>

            <div className="chat-messages">
              {chat.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <span className="chat-username">{msg.username}</span>: {msg.message}
                </div>
              ))}
            </div>

            <div className="message-input-section">
              <input
                className="input message-input"
                type="text"
                placeholder="Type your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="send-button">
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;
