import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaExclamationCircle, FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { CgProfile } from 'react-icons/cg';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import io from 'socket.io-client';
import './Topbar.css';

const socket = io('http://localhost:5001', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
});

const Topbar = ({ isOpen, toggle }) => {
  const [name, setName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userName = decoded.name || 'User';
        console.log('Decoded user name:', userName);
        setName(userName);
        socket.emit('join', userName.trim().toLowerCase());
        fetchNotifications(userName);
      } catch (err) {
        console.error('Error decoding token:', err);
        setName('Guest');
      }
    } else {
      console.log('No token found, setting name to Guest');
      setName('Guest');
    }

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server from Topbar');
    });

    socket.on('newNotification', (notification) => {
      console.log('Received new notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connect_error:', err.message);
      if (name !== 'Guest') {
        fetchNotifications(name);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('newNotification');
      socket.off('connect_error');
    };
  }, [name]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && !event.target.closest('.bell-icon')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchNotifications = async (userName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token, skipping fetchNotifications');
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
    } catch (err) {
      console.error('Error marking notification as read:', err.response?.data?.message || err.message);
    }
  };

  const handleSignOut = () => {
    console.log('Signing out, clearing token');
    localStorage.removeItem('token');
    setName('Guest');
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`topbar ${isOpen ? 'shifted' : ''}`}>
      <h1>Task Management</h1>
      <nav className="nav-links">
        <Link to="/dashboard">Admin Dashboard</Link>
        <div className="notification-icon-container">
          <FaBell className="bell-icon" onClick={toggleNotifications} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </div>
        <div className="user-info">
          <CgProfile className="profile-icon" size={28} />
          <span className="username">Welcome {name}</span>
        </div>
        <Link to="/" onClick={handleSignOut}>
          Sign Out
        </Link>
      </nav>
      {showNotifications && (
        <div className="notification-modal-overlay">
          <div className="notification-modal" ref={modalRef}>
            <div className="modal-header">
              <h3>Notifications</h3>
              <button
                className="modal-close"
                onClick={() => setShowNotifications(false)}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p>No new notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item notification-${notification.type.toLowerCase()}`}
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
                    onClick={() => markAsRead(notification._id)}
                    title="Dismiss"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;