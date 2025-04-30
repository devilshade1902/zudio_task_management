import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaExclamationCircle, FaBell, FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';
import io from 'socket.io-client';
import './Notifications.css';

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
  const [name, setName] = useState('');

  useEffect(() => {
    console.log('Mounting Notifications component');

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const userName = decoded.name || 'User';
        console.log('Decoded user name:', userName);
        setName(userName);
        socket.emit('join', userName.trim().toLowerCase());
        console.log(`Joining room: ${userName.trim().toLowerCase()}`);
        fetchNotifications(userName);
      } catch (err) {
        console.error('Error decoding token:', err.message);
        setName('Guest');
      }
    } else {
      console.log('No token, setting name to Guest');
      setName('Guest');
    }

    const onConnect = () => {
      console.log('Connected to Socket.IO server');
    };

    const onNewNotification = (notification) => {
      console.log('Received new notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setVisibleNotifications((prev) => {
        const updated = [notification, ...prev].slice(0, 5);
        console.log('Updated visible notifications:', updated);
        return updated;
      });
      setTimeout(() => {
        setVisibleNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      }, 5000);
    };

    const onConnectError = (err) => {
      console.error('Socket.IO connect_error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        transport: socket.io.engine.transport.name,
      });
      if (name !== 'Guest') {
        fetchNotifications(name);
      }
    };

    socket.on('connect', onConnect);
    socket.on('newNotification', onNewNotification);
    socket.on('connect_error', onConnectError);

    return () => {
      console.log('Unmounting Notifications component');
      socket.off('connect', onConnect);
      socket.off('newNotification', onNewNotification);
      socket.off('connect_error', onConnectError);
    };
  }, [name]);

  const fetchNotifications = async (userName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token for fetching notifications');
        return;
      }
      console.log('Fetching notifications for user:', userName);
      const res = await axios.get('http://localhost:5001/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API response:', res.data);
      const now = new Date();
      const filteredNotifications = res.data.filter((notification) => {
        const createdAt = new Date(notification.createdAt);
        const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });
      console.log('Filtered notifications:', filteredNotifications);
      setNotifications(filteredNotifications);
      setVisibleNotifications(filteredNotifications.slice(0, 5));
    } catch (err) {
      console.error('Error fetching notifications:', err.response?.data?.message || err.message);
      setTimeout(() => {
        if (userName && localStorage.getItem('token')) {
          console.log('Retrying fetchNotifications for user:', userName);
          fetchNotifications(userName);
        }
      }, 1000);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Marked notification ${id} as read`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setVisibleNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Error marking notification as read:', err.response?.data?.message || err.message);
    }
  };

  const removeNotification = (id) => {
    setVisibleNotifications((prev) => prev.filter((n) => n._id !== id));
    console.log(`Removed notification ${id} from visible`);
  };

  return (
    <div className="notifications-toast-container">
      {visibleNotifications.map((notification) => (
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