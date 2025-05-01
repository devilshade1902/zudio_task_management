import { BrowserRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ViewTasks from './pages/ViewTasks/Viewtasks';
import Users from './pages/Users/Users';
import MyTasks from './pages/MyTasks/MyTasks';
import MeetingCard from './pages/Meetings/MeetingCard';
import MeetingLobby from './pages/Meetings/MeetingLobby';
import LoginSignup from './pages/LoginSignup/LoginSignup';
import ForgotPassword from './components/Forgotpassword/ForgotPassword';
import VerifyOtp from './components/VerifyOtp/VerifyOtp';
import CalendarView from './pages/calendar/Calendar';
import ChatRoom from './pages/Chat/ChatRoom';
import TaskList from './pages/Chat/TaskList';
function App() {
  function ChatRoomWrapper() {
    const { roomId } = useParams();
    const location = useLocation();
    console.log('Navigated to roomId:', roomId);
    console.log('Location state:', location.state);
  
    const username = location.state?.username || 'Guest';
    return <ChatRoom roomId={roomId} username={username} />;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/meeting-lobby" element={<MeetingLobby />} />
        <Route path="chat/:roomId" element={<ChatRoomWrapper />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="view-tasks" element={<ViewTasks />} />
          <Route path="users" element={<Users />} />
          <Route path="mytasks" element={<MyTasks />} />
          <Route path="meetings" element={<MeetingCard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="tasklist" element={<TaskList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}


export default App;