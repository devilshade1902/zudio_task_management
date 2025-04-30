import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaExclamationCircle, FaBell, FaCheckCircle, FaTimes } from 'react-icons/fa';
import io from 'socket.io-client';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    // Initialize Socket.IO
    const socket = io('http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Fetch initial notifications
    fetchNotifications();

    // Join WebSocket room with user name
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT Decoded:', decoded);
        socket.emit('join', decoded.name.trim().toLowerCase());
        console.log(`Joining room: ${decoded.name.trim().toLowerCase()}`);
      } catch (err) {
        console.error('Error decoding token:', err.message);
      }
    } else {
      console.error('No JWT token found in localStorage');
    }

    // Socket.IO event listeners
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socket.on('newNotification', (notification) => {
      console.log('Received new notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setVisibleNotifications(prev => {
        const updated = [notification, ...prev].slice(0, 5);
        console.log('Updated visible notifications:', updated);
        return updated;
      });
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setVisibleNotifications(prev => prev.filter(n => n._id !== notification._id));
      }, 5000);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`Reconnected to Socket.IO server after ${attempt} attempts`);
    });

    socket.on('reconnect_error', (err) => {
      console.error('Socket.IO reconnect error:', err.message);
    });

    socket.on('error', (err) => {
      console.error('Socket.IO error:', err);
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('newNotification');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.off('reconnect_error');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token for fetching notifications');
        return;
      }
      const res = await axios.get('http://localhost:5001/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched notifications:', res.data);
      setNotifications(res.data);
      setVisibleNotifications(res.data.slice(0, 5)); // Display latest 5 notifications
    } catch (err) {
      console.error('Error fetching notifications:', err.response?.data?.message || err.message);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
      setVisibleNotifications(prev => prev.filter(n => n._id !== id));
      console.log(`Marked notification ${id} as read`);
    } catch (err) {
      console.error('Error marking notification as read:', err.response?.data?.message || err.message);
    }
  };

  const removeNotification = (id) => {
    setVisibleNotifications(prev => prev.filter(n => n._id !== id));
    console.log(`Removed notification ${id} from visible`);
  };

  return (
    <div className="notifications-toast-container">
      {visibleNotifications.map(notification => (
        <div
          key={notification._id}
          className={`notification-toast notification-${notification.type.toLowerCase()}`}
        >
          <div className="notification-icon">
            {notification.type === 'OVERDUE' && <FaExclamationCircle />}
            {notification.type === 'NEW_TASK' && <FaBell />}
            {notification.type === 'COMPLETED' && <FaCheckCircle />}
          </div>
          <div className="notification-content">
            <p>{notification.message}</p>
            <small>{new Date(notification.createdAt).toLocaleString()}</small>
          </div>
          <button
            className="notification-close"
            onClick={() => {
              markAsRead(notification._id);
              removeNotification(notification._id);
            }}
            title="Dismiss"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notifications;