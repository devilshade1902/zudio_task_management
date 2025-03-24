// src/App.jsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout/Layout"; // Fixed import casing
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import SignUp from "./pages/Signup/Signup";
import Tasks from "./pages/Tasks/Tasks";
import AssignTasks from "./pages/AssignTasks/Assigntasks";
import ViewTasks from "./pages/ViewTasks/Viewtasks";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />  {/* Default page is Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="assign-tasks" element={<AssignTasks />} />
          <Route path="view-tasks" element={<ViewTasks />} /> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;