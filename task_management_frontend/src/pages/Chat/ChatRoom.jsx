import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import "./ChatRoom.css";
import Topbar from "../../components/Topbar/Topbar";
import Sidebar from "../../components/Sidebar/Sidebar";

function ChatRoom() {
  const { roomId } = useParams();
 

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const username = queryParams.get("username");
   const taskTitle = queryParams.get("task");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5001");
    socketRef.current.emit("joinRoom", { roomId, username });

    socketRef.current.on("message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

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

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const messageData = { username, message: newMessage, roomId };
    socketRef.current.emit("sendMessage", messageData);

    // Instantly show locally
    setMessages((prev) => [
      ...prev,
      { ...messageData, _id: Date.now().toString(), createdAt: new Date().toISOString() }
    ]);

    try {
      const response = await fetch(`/api/chat/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, message: newMessage }),
      });

      if (!response.ok) {
        console.error(`Error sending message: ${response.status} ${response.statusText}`);
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const deleteMessage = async (id) => {
    try {
      const response = await fetch(`/api/chat/messages/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete message");

      setMessages(messages.filter((msg) => msg._id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Could not delete the message.");
    }
  };

  return (
    <div>
      <Topbar />
      <Sidebar />
      <div className="chat-room-page">
        <div className="chat-room-container">
          <header className="chat-room-header">
            <h1>Chat Room:</h1>
            <p className="chat-room-subtitle">{taskTitle}</p>
          </header>
          <div className="chat-messages-container">
            {messages.length === 0 ? (
              <p className="no-messages">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg._id} className={`chat-message ${msg.username === username ? "self" : "other"}`}>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <strong>{msg.username}</strong>
                      <span className="timestamp">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                    {msg.username === username && (
                      <button onClick={() => deleteMessage(msg._id)} className="delete-button">🗑</button>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type a message"
              className="chat-input"
            />
            <button onClick={sendMessage} className="send-button">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;
