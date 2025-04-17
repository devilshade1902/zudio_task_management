import React, { useState, useEffect } from "react";
import axios from 'axios';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import "./Users.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsAdmin(decoded.role === 'Admin');
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token. Please log in again.');
        setLoading(false);
        return;
      }
    } else {
      setError('Please log in as admin to view this page.');
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
        setFilteredUsers(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.response?.data?.message || "Failed to load users. Please try again.");
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = users.filter(
      user =>
        user.name.toLowerCase().includes(term) || // Changed 'username' to 'name'
        user.email.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(user =>
        user._id === userId ? { ...user, role: newRole } : user
      ));
      setFilteredUsers(filteredUsers.map(user =>
        user._id === userId ? { ...user, role: newRole } : user
      ));
      alert('Role updated successfully');
    } catch (err) {
      console.error('Error updating role:', err);
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="users-container loading">
        <FaSpinner className="spinner" />
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return <div className="users-container error">{error}</div>;
  }

  if (!isAdmin) {
    return <div className="users-container error">Admin access required.</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h2>Users List</h2>
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="no-users">No users found.</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td className="text-wrap">{user.name}</td>
                  <td className="text-wrap">{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      className="role-select"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="text-wrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;