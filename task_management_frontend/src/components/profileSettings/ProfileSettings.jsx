import React, { useState, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaSignOutAlt, FaTrash, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import './ProfileSettings.css';

const ProfileSettings = forwardRef(({ user, onClose, onLogout, onProfileUpdate }, ref) => {
  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    profilePicture: user.profilePicture || null,
  });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [twoFA, setTwoFA] = useState(user.twoFAEnabled || false);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totp, setTotp] = useState('');
  const [totpError, setTotpError] = useState('');
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const [tempProfilePicture, setTempProfilePicture] = useState(null); // Temporary state for preview
  const [profilePictureFile, setProfilePictureFile] = useState(null); // Store file for upload
  const BACKEND_URL = 'http://localhost:5001';

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${BACKEND_URL}/api/users/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActivities(res.data.activities.slice(0, 5));
      } catch (err) {
        setError('Failed to load activities');
      }
    };
    fetchActivities();

    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode, BACKEND_URL]);

  // Get user initial for default avatar
  const getUserInitial = () => {
    return profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
  };

  // Update profile
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${BACKEND_URL}/api/users/me`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Profile updated:', res.data);
      onProfileUpdate({
        name: res.data.name,
        email: res.data.email,
        profilePicture: res.data.profilePicture,
        twoFAEnabled: res.data.twoFAEnabled,
      });
      alert('Profile updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Change password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setError('New passwords do not match');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BACKEND_URL}/api/users/password`, {
        currentPassword: password.current,
        newPassword: password.new,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Password changed');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  // Handle profile picture selection (preview)
  const handleProfilePictureSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setTempProfilePicture(reader.result); // Preview image
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile picture to backend
  const saveProfilePicture = async () => {
    if (!profilePictureFile) {
      setError('No profile picture selected');
      return;
    }
    const formData = new FormData();
    formData.append('profilePicture', profilePictureFile);
    try {
      const token = localStorage.getItem('token');
      console.log('Uploading with token:', token);
      const res = await axios.post(`${BACKEND_URL}/api/users/picture`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const newProfilePicture = res.data.profilePicture;
      console.log('New profile picture URL:', newProfilePicture);
      setProfile({ ...profile, profilePicture: newProfilePicture });
      setTempProfilePicture(null); // Clear preview
      setProfilePictureFile(null); // Clear file
      onProfileUpdate({ profilePicture: newProfilePicture });
      alert('Profile picture saved');
    } catch (err) {
      console.error('Profile picture upload error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to upload picture');
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Toggle 2FA
  const toggleTwoFA = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${BACKEND_URL}/api/users/2fa`, { enabled: !twoFA }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!twoFA) {
        setQrCodeUrl(res.data.qrCodeUrl);
        setShowQrCodeModal(true);
      } else {
        setTwoFA(false);
        onProfileUpdate({ twoFAEnabled: false });
        alert('2FA disabled');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update 2FA settings');
    }
  };

  // Verify TOTP
  const handleTotpVerification = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BACKEND_URL}/api/users/verify-totp`, { token: totp }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTwoFA(true);
      onProfileUpdate({ twoFAEnabled: true });
      setShowQrCodeModal(false);
      setTotp('');
      alert('2FA enabled successfully');
    } catch (err) {
      setTotpError(err.response?.data?.message || 'Failed to verify 2FA code');
    }
  };

  // Delete account
  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${BACKEND_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        onLogout();
      } catch (err) {
        setError('Failed to delete account');
      }
    }
  };

  const modalContent = (
    <div className="profile-modal-overlay">
      <div className="profile-settings notification-modal" ref={ref}>
        <button className="modal-close" onClick={onClose} title="Close">
          <FaTimes />
        </button>
        <div className="profile-header">
          <div className="profile-pic-container">
            {tempProfilePicture ? (
              <img src={tempProfilePicture} alt="Profile Preview" className="profile-pic-large" />
            ) : profile.profilePicture && profile.profilePicture !== '/default-profile.png' ? (
              <img
                src={profile.profilePicture}
                alt="Profile"
                className="profile-pic-large"
                onError={(e) => {
                  console.error('Profile picture failed to load in ProfileSettings:', profile.profilePicture);
                  setProfile((prev) => ({ ...prev, profilePicture: null }));
                }}
              />
            ) : (
              <div className="profile-pic-initial">
                {getUserInitial()}
              </div>
            )}
            <label className="profile-pic-upload">
              <FaCamera />
              <input type="file" accept="image/*" onChange={handleProfilePictureSelect} hidden />
            </label>
            {tempProfilePicture && (
              <button className="save-button" onClick={saveProfilePicture}>
                Save Profile Picture
              </button>
            )}
          </div>
          <h3>{profile.name}</h3>
        </div>

        <div className="profile-section">
          <button
            className="toggle-button"
            onClick={() => setShowProfileInfo(!showProfileInfo)}
          >
            Profile Information
          </button>
          {showProfileInfo && (
            <form onSubmit={handleProfileUpdate} className="form-section">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
                <button type="submit" className="save-button">Save</button>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>
            </form>
          )}
        </div>

        <div className="profile-section">
          <button
            className="toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            Change Password
          </button>
          {showPassword && (
            <form onSubmit={handlePasswordChange} className="form-section">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  required
                />
                <button type="submit" className="save-button">Save</button>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  required
                />
              </div>
            </form>
          )}
        </div>

        <div className="profile-section">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            Dark Mode
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={twoFA}
              onChange={toggleTwoFA}
            />
            Two-Factor Authentication
          </label>
        </div>

        {showQrCodeModal && (
          <div className="qrcode-modal">
            <div className="qrcode-modal-content">
              <h3>Setup 2FA</h3>
              <p>Scan this QR code with your authenticator app (e.g., Google Authenticator):</p>
              <img src={qrCodeUrl} alt="QR Code" className="qrcode-image" />
              <form onSubmit={handleTotpVerification}>
                <div className="form-group">
                  <label>Enter 2FA Code</label>
                  <input
                    type="text"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    required
                    placeholder="6-digit code"
                  />
                </div>
                {totpError && <div className="error-message">{totpError}</div>}
                <div className="qrcode-modal-buttons">
                  <button type="submit" className="save-button">Verify</button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowQrCodeModal(false);
                      setTotp('');
                      setTotpError('');
                      setQrCodeUrl('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h4>Recent Activity</h4>
          {activities.length === 0 ? (
            <p>No recent activity</p>
          ) : (
            <ul className="activity-list">
              {activities.map((activity) => (
                <li key={activity._id}>
                  {activity.action} - <span>{new Date(activity.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="profile-section action-buttons">
          <button className="action-button sign-out" onClick={onLogout}>
            <FaSignOutAlt /> Sign Out
          </button>
          <button className="action-button delete-account" onClick={deleteAccount}>
            <FaTrash /> Delete Account
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

export default ProfileSettings;