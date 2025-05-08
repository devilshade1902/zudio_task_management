import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaBell, FaExclamationCircle, FaCheckCircle, FaTimes, FaInfoCircle, FaCalendarPlus, FaCalendarTimes, FaCalendarCheck, FaTrash } from 'react-icons/fa';
import { CgProfile } from 'react-icons/cg';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import socket from '../../socket'; // Import shared socket
import './Topbar.css';

const Topbar = ({ isOpen, toggle }) => {
  const [name, setName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const modalRef = useRef(null);
  const [viewedIds, setViewedIds] = useState(() => {
    const stored = localStorage.getItem(`viewedNotificationIds_${name}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [isFetching, setIsFetching] = useState(false);
  const fetchNotificationsRef = useRef(null); // Ref to hold stable fetchNotifications

  // Fetch notifications function
  const fetchNotifications = useCallback(async (userName, currentViewedIds) => {
    if (isFetching || !userName || userName === 'Guest') {
      console.log('Skipping fetch in Topbar: already fetching or invalid user');
      return;
    }
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token, skipping fetchNotifications in Topbar');
        setNotifications([]);
        return;
      }
      console.log('Fetching notifications for user in Topbar:', userName);
      const res = await axios.get('http://localhost:5001/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API response in Topbar:', res.data);
      setNotifications(res.data.filter((notification) => !currentViewedIds.includes(notification._id) || new Date(notification.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)));
    } catch (err) {
      console.error('Error fetching notifications in Topbar:', err.response?.data?.message || err.message);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching]); // viewedIds removed from here

  // Store fetchNotifications in a ref
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    let userName = 'Guest';
    if (token) {
      try {
        const decoded = jwtDecode(token);
        userName = decoded.name || 'User';
        setName(userName);
        const storedViewedIds = JSON.parse(localStorage.getItem(`viewedNotificationIds_${userName}`) || '[]');
        setViewedIds(storedViewedIds);
        socket.emit('join', userName.trim().toLowerCase());
        if (userName !== 'Guest') {
          // Call fetchNotifications using the ref with the current viewedIds
          fetchNotificationsRef.current(userName, storedViewedIds);
        }
      } catch (err) {
        console.error('Error decoding token in Topbar:', err);
        setName('Guest');
        setNotifications([]);
      }
    } else {
      setName('Guest');
      setNotifications([]);
    }

    const onConnect = () => {
      console.log('Connected to Socket.IO server from Topbar, socket ID:', socket.id);
      if (userName && userName !== 'Guest') {
        socket.emit('join', userName.trim().toLowerCase());
      }
    };

    const onConnectError = (err) => {
      console.error('Socket.IO connect_error in Topbar:', err.message);
      console.log('Skipping fetch on connect error in Topbar');
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };
  }, []); // Empty dependency array for initial setup and connection

  useEffect(() => {
    if (name && name !== 'Guest') {
      localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(viewedIds));
    }
  }, [viewedIds, name]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && !event.target.closest('.bell-icon')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5001/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Marked notification ${id} as read from Topbar`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setViewedIds((prev) => {
        const updated = [...prev, id];
        localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Error marking notification as read from Topbar:', err.response?.data?.message || err.message);
    }
  };

  const handleSignOut = () => {
    console.log('Signing out, clearing token');
    localStorage.removeItem('token');
    setName('Guest');
    setNotifications([]);
    setViewedIds([]);
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const notificationCount = notifications.length;

  return (
    <div className={`topbar ${isOpen ? 'shifted' : ''}`}>
      <h1>Task Management</h1>
      <nav className="nav-links">
        <Link to="/dashboard">Admin Dashboard</Link>
        <div className="notification-icon-container">
          <FaBell className="bell-icon" onClick={toggleNotifications} />
          {notificationCount > 0 && (
            <span className="notification-badge">{notificationCount}</span>
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;