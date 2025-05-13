import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { FaExclamationCircle, FaBell, FaCheckCircle, FaTimes, FaInfoCircle, FaCalendarPlus, FaCalendarTimes, FaCalendarCheck, FaTrash } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import socket from '../../socket'; // Import shared socket
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const [name, setName] = useState('');
  const [viewedIds, setViewedIds] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const isMounted = useRef(false);

  const fetchNotifications = useCallback(async (userName) => {
    if (isFetching || !userName || userName === 'Guest') {
      console.log('Skipping fetch: already fetching or invalid user');
      return;
    }
    setIsFetching(true);
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
      const newNotifications = res.data.filter(
        (n) => !viewedIds.includes(n._id) && !notifications.some((existing) => existing._id === n._id)
      );
      setNotifications((prev) => [...prev, ...newNotifications]);
    } catch (err) {
      console.error('Error fetching notifications:', err.response?.data?.message || err.message);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, viewedIds, notifications]);

  useEffect(() => {
    isMounted.current = true;
    console.log('Notifications component mounted, socket ID:', socket.id);

    const token = localStorage.getItem('token');
    let userName = 'Guest';
    if (token) {
      try {
        const decoded = jwtDecode(token);
        userName = decoded.name || 'User';
        console.log('Decoded user name:', userName);
        setName(userName);
        const stored = localStorage.getItem(`viewedNotificationIds_${userName}`);
        setViewedIds(stored ? JSON.parse(stored) : []);
        if (userName !== 'Guest') {
          fetchNotifications(userName);
        }
      } catch (err) {
        console.error('Error decoding token:', err.message);
        setName('Guest');
        setNotifications([]);
        setVisibleNotifications([]);
      }
    } else {
      console.log('No token, setting name to Guest');
      setName('Guest');
      setNotifications([]);
      setVisibleNotifications([]);
    }

    return () => {
      isMounted.current = false;
      console.log('Unmounting Notifications component');
    };
  }, []);

  useEffect(() => {
    const onConnect = () => {
      console.log('Connected to Socket.IO server, socket ID:', socket.id);
      if (name && name !== 'Guest') {
        socket.emit('join', name.trim().toLowerCase());
        console.log(`Emitted join for room: ${name.trim().toLowerCase()}`);
      }
    };

    const onNewNotification = (notification) => {
      console.log('Received new notification:', notification);
      if (notification.isRead) {
        console.log(`Notification ${notification._id} is already read, skipping display`);
        return;
      }
      const notificationKey = `${notification.taskId}-${notification.type}-${notification.message}`;
      if (notifications.some((n) => `${n.taskId}-${n.type}-${n.message}` === notificationKey)) {
        console.log(`Notification for task ${notification.taskId} with type ${notification.type} already exists, skipping`);
        return;
      }
      setNotifications((prev) => [notification, ...prev]);
      setVisibleNotifications((prev) => {
        const updated = [notification, ...prev].slice(0, 5);
        console.log('Updated visible notifications:', updated);
        return updated;
      });

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        if (isMounted.current) {
          setVisibleNotifications((prev) => {
            const filtered = prev.filter((n) => n._id !== notification._id);
            console.log('Auto-dismissed notification:', notification._id, 'Remaining:', filtered);
            return filtered;
          });
        }
      }, 4000);
    };

    const onConnectError = (err) => {
      console.error('Socket.IO connect_error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        transport: socket.io.engine.transport.name,
      });
    };

    socket.on('connect', onConnect);
    socket.on('newNotification', onNewNotification);
    socket.on('connect_error', onConnectError);

    return () => {
      console.log('Cleaning up Socket.IO listeners');
      socket.off('connect', onConnect);
      socket.off('newNotification', onNewNotification);
      socket.off('connect_error', onConnectError);
    };
  }, [name, notifications]);

  useEffect(() => {
    if (name && name !== 'Guest') {
      localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(viewedIds));
    }
  }, [viewedIds, name]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Marked notification ${id} as read`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setVisibleNotifications((prev) => prev.filter((n) => n._id !== id));
      setViewedIds((prev) => {
        const updated = [...prev, id];
        if (name && name !== 'Guest') {
          localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(updated));
        }
        return updated;
      });
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      console.error('Error marking notification as read:', message);
      if (message === 'Notification not found') {
        // Notification already deleted, remove from UI
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setVisibleNotifications((prev) => prev.filter((n) => n._id !== id));
        setViewedIds((prev) => {
          const updated = [...prev, id];
          if (name && name !== 'Guest') {
            localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(updated));
          }
          return updated;
        });
      }
    }
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
            {notification.type === 'NEW_MEETING' && <FaCalendarPlus />}
            {notification.type === 'UPDATED_MEETING' && <FaCalendarCheck />}
            {notification.type === 'DELETED_MEETING' && <FaCalendarTimes />}
            {notification.type === 'DELETED_TASK' && <FaTrash />}
          </div>
          <div className="notification-content">
            <p>{notification.message}</p>
            <small>{new Date(notification.createdAt).toLocaleString()}</small>
          </div>
          <button
            className="notification-close"
            onClick={() => markAsRead(notification._id)}
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