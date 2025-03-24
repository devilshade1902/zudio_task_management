// src/components/Sidebar/Sidebar.jsx
import React from 'react';
import { FiMenu, FiX } from "react-icons/fi";
import "./Sidebar.css";
import { Link } from 'react-router-dom';

const Sidebar = ({ isOpen, toggle }) => {
  return (
    <div className='sidebar-container'>
      <button className={`sidebar-toggle ${isOpen ? "shifted" : ""}`} onClick={toggle}>
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <h2>Sidebar</h2>
        <ul className='sidebar-menu'>
          <Link to='/dashboard' style={{ textDecoration: 'none', color: 'white' }}><li>Home</li></Link>
          <Link to='/tasks' style={{ textDecoration: 'none', color: 'white' }}><li>Tasks</li></Link>
          <li>Employees</li>
          <li>Chat</li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;