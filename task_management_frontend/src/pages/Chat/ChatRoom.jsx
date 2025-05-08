import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./ChatRoom.css";
import Topbar from "../../components/Topbar/Topbar";
import Sidebar from "../../components/Sidebar/Sidebar";

function ChatRoom() {
  const { state } = useLocation();
  const username = state?.username || "Guest";
  const roomId = state?.roomId || "default-room";
  const roomname = state?.roomname || "Default Room";

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    async function fetchMessages() {
      try {
        const response = await fetch(`/api/chat/${roomId}/messages`);
        if (!response.ok) {
          console.error(`Error fetching messages: ${response.status} ${response.statusText}`);
          return;
        }
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();
  }, [roomId]);

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    try {
      const response = await fetch(`/api/chat/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, message: newMessage }),
      });

      if (!response.ok) {
        console.error(`Error sending message: ${response.status} ${response.statusText}`);
        return;
      }

      const savedMessage = await response.json();
      setMessages((prevMessages) => [...prevMessages, savedMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="chat-room-page">
      <Topbar />
      <Sidebar />
      <div className="chat-room-container">
        <header className="chat-room-header">
          <h1>{roomname}</h1>
        </header>
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <p className="no-messages">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.username === username ? "self" : "other"}`}>
                <div className="chat-message-content">
                  <strong className="chat-message-username">{msg.username}</strong>
                  <span className="chat-message-text">{msg.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button className="send-button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;