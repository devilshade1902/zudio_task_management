// src/App.jsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./components/Login/Login";
import Tasks from "./pages/Tasks/Tasks";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} /> {/* Default route */}
          <Route path="tasks" element={<Tasks />} />
          <Route path="login" element={<Login />} />
          {/* Add more routes like signup, employees, etc. as needed */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;