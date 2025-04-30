// src/App.jsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout/Layout"; // Fixed import casing
import Dashboard from "./pages/Dashboard/Dashboard";
import ViewTasks from "./pages/ViewTasks/Viewtasks";
import Users from "./pages/Users/Users";
import MyTasks from "./pages/MyTasks/MyTasks";
import MeetingCard from "./pages/Meetings/MeetingCard";
import MeetingLobby from "./pages/Meetings/MeetingLobby";
import LoginSignup from "./pages/LoginSignup/LoginSignup";
import CalendarView from './pages/calendar/Calendar';
import ChatRoom from "./pages/Chat/ChatRoom";

function App() {
  
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<Login />} />  Default page is Login */}
        <Route path="/" element={<LoginSignup />} />
        {/* <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} /> */}
        <Route path="/meeting-lobby" element={<MeetingLobby />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="view-tasks" element={<ViewTasks />} /> 
          <Route path="users" element={<Users />} /> 
          <Route path="mytasks" element={<MyTasks />} /> 
          <Route path="meetings" element={<MeetingCard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="chat" element={<ChatRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;