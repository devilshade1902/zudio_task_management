import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import Tasks from "./pages/Tasks/Tasks";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login />} /> {/* Set login as the default page */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
