// src/components/Topbar/Topbar.jsx
import React from "react";
import "./Topbar.css";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";

const Topbar = ({ isOpen, toggle }) => { // Changed isopen to isOpen
  return (
    <div className={`topbar ${isOpen ? "shifted" : ""}`}>
      <h1>Task Management</h1>
      <nav className="nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign Up</Link>
        <CgProfile className="profile-icon" size={30} />
      </nav>
    </div>
  );
};

export default Topbar;