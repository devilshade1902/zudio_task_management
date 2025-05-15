import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import "./MeetingCard.css";
import Select from 'react-select';

const MeetingCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isNewMeeting, setIsNewMeeting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("");
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [taskUsers, setTaskUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isAdminUser = decoded.role === "Admin";
        setIsAdmin(isAdminUser);
        fetchUserEmail(decoded.id, isAdminUser);
        fetchTasks();
      } catch (err) {
        console.error("Token decoding failed", err);
      }
    }
  }, []);

  const fetchUserEmail = async (id, isAdminUser) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5001/api/users/by-id/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const email = res.data.email;
      setLoggedInUser(email);
      fetchMeetings(email, isAdminUser);
    } catch (err) {
      console.error("Failed to fetch user email", err);
    }
  };

  const fetchMeetings = async (email, isAdminUser) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found in localStorage");
      }

      const res = await axios.get("http://localhost:5001/meetings/get-meetings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;

      const filtered = isAdminUser
        ? data
        : data.filter((meeting) => {
            const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
            return meeting.createdBy === email || participants.includes(email);
          });

      // Enrich meetings with usernames from participants
      const enrichedMeetings = await Promise.all(filtered.map(async (meeting) => {
        let usernames = [];
        try {
          usernames = await Promise.all(
            meeting.participants.map(async (email) => {
              const res = await axios.get(`http://localhost:5001/api/users/by-email/${email}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              return res.data.name;
            })
          );
        } catch (e) {
          console.warn("Username fetch failed", e);
        }

        console.log("Enriched meeting with usernames:", usernames);

        return {
          ...meeting,
          usernames
        };
      }));

      setMeetings(enrichedMeetings);
    } catch (err) {
      console.error("Failed to load meetings", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get("http://localhost:5001/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data.tasks);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  const fetchUsersByTask = async (taskId) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const users = await Promise.all(
        task.assignedUsers.map(async (identifier) => {
          try {
            const res = await axios.get(`http://localhost:5001/api/users/by-email/${identifier}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
          } catch (err) {
            console.error(`Failed to fetch user ${identifier}`, err);
            return null;
          }
        })
      );
      setTaskUsers(users.filter(Boolean));
    } catch (err) {
      console.error("Error fetching users for task", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTaskChange = (selectedOption) => {
    const taskId = selectedOption ? selectedOption.value : "";
    setSelectedTask(taskId);
    setSelectedParticipants([]);
    fetchUsersByTask(taskId);
  };

  const handleAddNewMeeting = () => {
    setSelectedMeeting({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: "",
      passcode: "",
    });
    setIsNewMeeting(true);
    setIsModalOpen(true);
    setTaskUsers([]);
    setSelectedTask("");
    setSelectedParticipants([]);
  };

  const handleEdit = (meeting) => {
    setSelectedMeeting(meeting);
    setSelectedParticipants(meeting.participants);
    setSelectedTask(meeting.taskId || "");
    setIsNewMeeting(false);
    setIsModalOpen(true);

    if (tasks.length > 0) {
      fetchUsersByTask(meeting.taskId);
    } else {
      const interval = setInterval(() => {
        if (tasks.length > 0) {
          fetchUsersByTask(meeting.taskId);
          clearInterval(interval);
        }
      }, 200);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this meeting?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5001/meetings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMeetings(loggedInUser, isAdmin);
      } catch (err) {
        console.error("Failed to delete meeting", err);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedMeeting((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const roomName = `${selectedMeeting.title}`;
      const participantEmails = taskUsers
        .filter(user => selectedParticipants.includes(user._id))
        .map(user => user.email);
      const selectedTaskData = tasks.find(task => task._id === selectedTask);
      const taskTitle = selectedTaskData ? selectedTaskData.title : "";

      const payloadData = {
        ...selectedMeeting,
        roomName,
        createdBy: loggedInUser,
        participants: participantEmails,
        taskName: taskTitle,
      };

      if (isNewMeeting) {
        await axios.post("http://localhost:5001/meetings/create-meeting", payloadData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.put(`http://localhost:5001/meetings/${selectedMeeting._id}`, payloadData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsModalOpen(false);
      fetchMeetings(loggedInUser, isAdmin);
    } catch (err) {
      console.error("Meeting submit error", err);
    }
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${hour12}:00 ${ampm}`;
      times.push({ value: label, label });
    }
    return times;
  };

  const calculateEndTime = (startTime, duration) => {
    const [time, meridian] = startTime.split(" ");
    let [hour] = time.split(":").map(Number);

    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    let endHour = (hour + Number(duration)) % 24;
    const endMeridian = endHour >= 12 ? "PM" : "AM";
    const endHour12 = endHour % 12 === 0 ? 12 : endHour % 12;

    return `${endHour12}:00 ${endMeridian}`;
  };

  return (
    <div className="container">
      <div className="header">
        <h2 className="heading">Meetings</h2>
        {isAdmin && (
          <button className="primary-button" onClick={handleAddNewMeeting}>
            <FaPlus style={{ marginRight: "6px" }} /> Add Meeting
          </button>
        )}
      </div>
      <div className="meetings-list">
        {meetings.map((meeting) => (
          <div key={meeting._id} className="meeting-card">
            <div className="card-content">
              <div className="card-header">
                <h4>{meeting.title}</h4>
                {isAdmin && (
                  <div className="admin-buttons">
                    <button className="icon-button" onClick={() => handleEdit(meeting)}><FaEdit /></button>
                    <button className="icon-button" onClick={() => handleDelete(meeting._id)}><FaTrash /></button>
                  </div>
                )}
              </div>
              <p><strong>Date:</strong> {new Date(meeting.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> {meeting.time} - {calculateEndTime(meeting.time, meeting.duration)}</p>
              {meeting.taskName && (
                <p><strong>Task:</strong> {meeting.taskName}</p>
              )}
              {meeting.usernames && meeting.usernames.length > 0 && (
                <p><strong>Participants:</strong> {meeting.usernames.join(", ")}</p>
              )}
              <p><strong>Passcode:</strong> {meeting.passcode}</p>
              <button className="join-button" onClick={() => {
                const inputPasscode = prompt("Enter meeting passcode:");
                if (inputPasscode === meeting.passcode) {
                  window.open(`/meeting/${meeting.roomName}`, '_blank');
                } else {
                  alert("Incorrect passcode!");
                }
              }}>
                Join Meeting
              </button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <h2 className="modal-title">{isNewMeeting ? "Create" : "Edit"} Meeting</h2>
              <input name="title" placeholder="Meeting Title" value={selectedMeeting.title} onChange={handleChange} required />
              <textarea name="description" placeholder="Description" value={selectedMeeting.description} onChange={handleChange} />
              <label>Date</label>
              <input name="date" type="date" value={selectedMeeting.date} onChange={handleChange} required />
              <label>Duration (hours)</label>
              <Select
                options={[1, 2, 3, 4, 5, 6].map(d => ({ value: d, label: `${d} hour${d > 1 ? "s" : ""}` }))}
                value={selectedMeeting.duration ? { value: selectedMeeting.duration, label: `${selectedMeeting.duration} hour${selectedMeeting.duration > 1 ? "s" : ""}` } : null}
                onChange={(opt) => setSelectedMeeting(prev => ({ ...prev, duration: opt.value }))}
                placeholder="Choose duration"
              />
              <label>Start Time</label>
              <Select
                options={generateTimeOptions()}
                value={selectedMeeting.time ? { value: selectedMeeting.time, label: selectedMeeting.time } : null}
                onChange={(opt) => setSelectedMeeting(prev => ({ ...prev, time: opt.value }))}
                placeholder="Choose start time"
              />
              {selectedMeeting.time && selectedMeeting.duration && (
                <p className="time-range-preview">
                  Selected: {selectedMeeting.time} - {calculateEndTime(selectedMeeting.time, selectedMeeting.duration)}
                </p>
              )}
              <input name="passcode" placeholder="Meeting Passcode" value={selectedMeeting.passcode} onChange={handleChange} required />
              <label>Task</label>
              <Select
                options={tasks.map(task => ({ value: task._id, label: task.title }))}
                value={tasks.find(task => task._id === selectedTask) ? {
                  value: selectedTask,
                  label: tasks.find(task => task._id === selectedTask).title
                } : null}
                onChange={handleTaskChange}
                placeholder="Select a task..."
              />
              <label>Participants</label>
              <Select
                isMulti
                options={taskUsers.map(user => ({ value: user._id, label: user.name }))}
                value={taskUsers.filter(user => selectedParticipants.includes(user._id)).map(user => ({ value: user._id, label: user.name }))}
                onChange={(selected) => setSelectedParticipants(selected.map(opt => opt.value))}
                isLoading={loadingUsers}
                placeholder="Select participants..."
              />
              <div className="modal-buttons">
                <button className="primary-button" type="submit">
                  {isNewMeeting ? "Create Meeting" : "Update Meeting"}
                </button>
                <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingCard;