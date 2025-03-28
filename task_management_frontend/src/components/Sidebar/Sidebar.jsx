// src/components/Sidebar/Sidebar.jsx
import React from 'react';
import { FiMenu, FiX } from "react-icons/fi";
import "./Sidebar.css";
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, toggle }) => {
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
            end // Add this to ensure exact match
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li>Home</li>
          </NavLink>
          <NavLink
            to="/dashboard/view-tasks"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li>View Tasks</li>
          </NavLink>
          <NavLink
            to="/dashboard/users"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ textDecoration: 'none', color: 'white' }}
          >
            <li>Users</li>
          </NavLink>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;