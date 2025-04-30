import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaExclamationCircle, FaBell, FaCheckCircle, FaTimes ,FaInfoCircle} from 'react-icons/fa';
import io from 'socket.io-client';
import './Notifications.css';

// Initialize Socket.IO client
const socket = io('http://localhost:5001', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
});

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    console.log('Mounting Notifications component');

    // Log socket connection attempt
    console.log('Attempting Socket.IO connection');

    // Fetch initial notifications
    fetchNotifications();

    // Join WebSocket room
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT Decoded:', decoded);
        const room = decoded.name.trim().toLowerCase();
        socket.emit('join', room);
        console.log(`Joining room: ${room}`);
      } catch (err) {
        console.error('Error decoding token:', err.message);
      }
    } else {
      console.error('No JWT token found in localStorage');
    }

    // Socket.IO event listeners
    const onConnect = () => {
      console.log('Connected to Socket.IO server');
    };

    const onNewNotification = (notification) => {
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
    };

    const onConnectError = (err) => {
      console.error('Socket.IO connect_error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        transport: socket.io.engine.transport.name,
      });
    };

    const onReconnect = (attempt) => {
      console.log(`Reconnected to Socket.IO server after ${attempt} attempts`);
    };

    const onReconnectError = (err) => {
      console.error('Socket.IO reconnect_error:', {
        message: err.message,
        description: err.description,
        context: err.context,
      });
    };

    const onError = (err) => {
      console.error('Socket.IO error:', err);
    };

    socket.on('connect', onConnect);
    socket.on('newNotification', onNewNotification);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect', onReconnect);
    socket.on('reconnect_error', onReconnectError);
    socket.on('error', onError);

    // Cleanup
    return () => {
      console.log('Unmounting Notifications component');
      socket.off('connect', onConnect);
      socket.off('newNotification', onNewNotification);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect', onReconnect);
      socket.off('reconnect_error', onReconnectError);
      socket.off('error', onError);
      // Keep socket connected
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
      setVisibleNotifications(res.data.slice(0, 5));
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
            {notification.type === 'STATUS_CHANGED' && <FaInfoCircle />}
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