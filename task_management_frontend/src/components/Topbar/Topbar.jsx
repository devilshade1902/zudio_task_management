import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaBell, FaExclamationCircle, FaCheckCircle, FaTimes, FaInfoCircle, FaCalendarPlus, FaCalendarTimes, FaCalendarCheck, FaTrash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import socket from '../../socket';
import ProfileSettings from '../profileSettings/ProfileSettings';
import './Topbar.css';

const BACKEND_URL = 'http://localhost:5001';

const Topbar = ({ isOpen, toggle }) => {
  const [name, setName] = useState('');
  const [profile, setProfile] = useState({ email: '', profilePicture: null, twoFAEnabled: false });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const notificationModalRef = useRef(null);
  const profileModalRef = useRef(null);
  const [viewedIds, setViewedIds] = useState(() => {
    const stored = localStorage.getItem(`viewedNotificationIds_${name}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [isFetching, setIsFetching] = useState(false);
  const fetchNotificationsRef = useRef(null);
  const navigate = useNavigate();

  // Get user initial for default avatar
  const getUserInitial = () => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

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
      const res = await axios.get(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API response in Topbar:', res.data);
      setNotifications(res.data.filter((notification) => !currentViewedIds.includes(notification._id) || new Date(notification.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)));
    } catch (err) {
      console.error('Error fetching notifications in Topbar:', err.response?.data?.message || err.message);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching]);

  // Fetch user profile
  const fetchProfile = useCallback(async (userName) => {
    if (!userName || userName === 'Guest') return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${BACKEND_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched profile in Topbar:', res.data);
      const profilePicture = res.data.profilePicture
        ? res.data.profilePicture.startsWith('http')
          ? `${res.data.profilePicture}?t=${Date.now()}`
          : `${BACKEND_URL}${res.data.profilePicture}?t=${Date.now()}`
        : null;
      setProfile({
        email: res.data.email,
        profilePicture,
        twoFAEnabled: res.data.twoFAEnabled || false,
      });
    } catch (err) {
      console.error('Error fetching profile in Topbar:', err.response?.data?.message || err.message);
    }
  }, []);

  // Store fetchNotifications in a ref
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  // Initial setup
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
          fetchNotificationsRef.current(userName, storedViewedIds);
          fetchProfile(userName);
        }
      } catch (err) {
        console.error('Error decoding token in Topbar:', err);
        setName('Guest');
        setNotifications([]);
        setProfile({ email: '', profilePicture: null, twoFAEnabled: false });
      }
    } else {
      setName('Guest');
      setNotifications([]);
      setProfile({ email: '', profilePicture: null, twoFAEnabled: false });
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
  }, [fetchProfile]);

  useEffect(() => {
    if (name && name !== 'Guest') {
      localStorage.setItem(`viewedNotificationIds_${name}`, JSON.stringify(viewedIds));
    }
  }, [viewedIds, name]);

  // Handle click outside for both modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationModalRef.current &&
        !notificationModalRef.current.contains(event.target) &&
        !event.target.closest('.bell-icon')
      ) {
        setShowNotifications(false);
      }
      if (
        profileModalRef.current &&
        !profileModalRef.current.contains(event.target) &&
        !event.target.closest('.profile-pic') &&
        !event.target.closest('.profile-pic-initial')
      ) {
        setShowProfileSettings(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BACKEND_URL}/api/notifications/${id}/read`, {}, {
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
    setProfile({ email: '', profilePicture: null, twoFAEnabled: false });
    navigate('/');
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const toggleProfileSettings = () => {
    setShowProfileSettings((prev) => !prev);
  };

  const notificationCount = notifications.length;

  const onProfileUpdate = (updatedProfile) => {
    console.log('Updating profile in Topbar:', updatedProfile);
    const profilePicture = updatedProfile.profilePicture
      ? updatedProfile.profilePicture.startsWith('http')
        ? `${updatedProfile.profilePicture}?t=${Date.now()}`
        : `${BACKEND_URL}${updatedProfile.profilePicture}?t=${Date.now()}`
      : profile.profilePicture;
    setProfile({
      ...profile,
      email: updatedProfile.email || profile.email,
      profilePicture,
      twoFAEnabled: updatedProfile.twoFAEnabled !== undefined ? updatedProfile.twoFAEnabled : profile.twoFAEnabled,
    });
    if (updatedProfile.name && updatedProfile.name !== name) {
      console.log(`Updating name from ${name} to ${updatedProfile.name}`);
      setName(updatedProfile.name);
      localStorage.removeItem(`viewedNotificationIds_${name}`);
      localStorage.setItem(`viewedNotificationIds_${updatedProfile.name}`, JSON.stringify(viewedIds));
      socket.emit('join', updatedProfile.name.trim().toLowerCase());
    } else {
      console.log('No name update needed or name unchanged');
    }
  };

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
          {profile.profilePicture && profile.profilePicture !== '/default-profile.png' && profile.profilePicture !== '' ? (
            <img
              src={profile.profilePicture}
              alt="Profile"
              className="profile-pic w-10 h-10 rounded-full cursor-pointer"
              onClick={toggleProfileSettings}
              onError={(e) => {
                console.error('Profile picture failed to load:', profile.profilePicture);
                e.target.style.display = 'none';
                setProfile((prev) => ({ ...prev, profilePicture: null }));
              }}
            />
          ) : (
            <div
              className="profile-pic-initial w-10 h-10 rounded-full cursor-pointer"
              onClick={toggleProfileSettings}
            >
              {getUserInitial()}
            </div>
          )}
          <span className="username">Welcome {name}</span>
        </div>
      </nav>
      {showNotifications && (
        <div className="notification-modal-overlay">
          <div className="notification-modal" ref={notificationModalRef}>
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
      {showProfileSettings && (
        <ProfileSettings
          user={{ name, email: profile.email, profilePicture: profile.profilePicture, twoFAEnabled: profile.twoFAEnabled }}
          onClose={toggleProfileSettings}
          onLogout={handleSignOut}
          onProfileUpdate={onProfileUpdate}
          ref={profileModalRef}
        />
      )}
    </div>
  );
};

export default Topbar;