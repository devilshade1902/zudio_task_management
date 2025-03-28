import React, { useState, useEffect } from "react";
import "./Topbar.css";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // Named import

const Topbar = ({ isOpen, toggle }) => {
  const [name, setName] = useState(""); // Changed variable name for clarity

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Decoded token:", decoded);
        setName(decoded.name || "User"); // Changed 'username' to 'name'
      } catch (err) {
        console.error("Error decoding token:", err);
        setName("Guest");
      }
    } else {
      setName("Guest");
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    setName("Guest");
  };

  return (
    <div className={`topbar ${isOpen ? "shifted" : ""}`}>
      <h1>Task Management</h1>
      <nav className="nav-links">
        <Link to="/dashboard">Admin Dashboard</Link>
        <div className="user-info">
          <CgProfile className="profile-icon" size={28} />
          <span className="username">Welcome {name}</span> {/* Updated to use 'name' */}
        </div>
        <Link to="/login" onClick={handleSignOut}>
          Sign Out
        </Link>
      </nav>
    </div>
  );
};

export default Topbar;