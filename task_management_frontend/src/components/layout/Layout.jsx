// src/components/Layout/Layout.jsx
import React, { useState } from "react";
import Topbar from "../Topbar/Topbar";
import Sidebar from "../Sidebar/Sidebar";
import { Outlet } from "react-router-dom";
import "./Layout.css";

const Layout = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="layout">
      <Topbar isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
      <Sidebar isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
      <main className={`main-content ${isOpen ? "shifted" : ""}`}>
        <Outlet /> {/* Renders Dashboard, Login, etc. */}
      </main>
    </div>
  );
};

export default Layout;