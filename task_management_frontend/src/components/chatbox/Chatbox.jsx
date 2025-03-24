// src/components/chatbox/ChatBox.jsx
import React, { useState } from "react";
import "./Chatbox.css";
import { IoChatbubbleEllipses, IoClose, IoSend } from "react-icons/io5";

const ChatBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, { text: message, sender: "user" }]);
      setMessage("");
    }
  };

  return (
    <div className="chat-container">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button className="chat-toggle-button" onClick={() => setIsOpen(true)}>
          <IoChatbubbleEllipses size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbox">
          <div className="chatbox-header">
            <span>Chat Support</span>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <IoClose size={20} />
            </button>
          </div>

          <div className="chatbox-messages">
            {/* Default Welcome Message */}
            <div className="message bot">
                <strong>Hello, welcome to Chat Support! 😊</strong> <br />
                How can I help you?
            </div>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="chatbox-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>
              <IoSend size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
