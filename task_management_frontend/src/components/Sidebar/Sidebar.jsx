import React, { useState, useEffect } from 'react';
import { FiMenu, FiX } from "react-icons/fi";
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import "./Sidebar.css";

const Sidebar = ({ isOpen, toggle }) => {
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
      }
    }
  }, []);

  return (
    <div className='sidebar-container'>
      <button className={`sidebar-toggle ${isOpen ? "shifted" : ""}`} onClick={toggle}>
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <h2>Sidebar</h2>
        <ul className='sidebar-menu'>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li className="text-wrap">Home</li>
          </NavLink>
          <NavLink
            to="/dashboard/view-tasks"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li className="text-wrap">Tasks</li>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/dashboard/users"
              className={({ isActive }) => (isActive ? "active" : "")}
              style={{ textDecoration: 'none', color: 'white' }}
            >
              <li className="text-wrap">Users</li>
            </NavLink>
          )}
          <NavLink
            to="/dashboard/mytasks"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li className="text-wrap">My Tasks</li>
          </NavLink>
          <NavLink
            to="/dashboard/meetings"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li className="text-wrap">Meetings</li>
          </NavLink>
          <NavLink
            to="/dashboard/calendar"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li className="text-wrap">Calendar</li>
          </NavLink>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;