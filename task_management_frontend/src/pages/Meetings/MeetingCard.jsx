import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import "./MeetingCard.css";

const MeetingCard = () => {
  const [meetings, setMeetings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isNewMeeting, setIsNewMeeting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setIsAdmin(decoded.role === "Admin");
      } catch (err) {
        console.error("Token decoding failed", err);
      }
    }

    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/meetings");
      setMeetings(res.data);
    } catch (err) {
      console.error("Failed to load meetings", err);
    }
  };

  const handleEnterLobby = (meeting, isAdmin) => {
    const meetingNumber = extractMeetingNumber(meeting.link);
    const passcode = extractPasscode(meeting.link);
    const role = isAdmin ? 1 : 0;
  
    const lobbyUrl = `/meeting-lobby?meetingNumber=${meetingNumber}&passcode=${passcode}&role=${role}`;
    
    window.open(lobbyUrl, "_blank");
  };
  
  const handleAddNewMeeting = () => {
    setSelectedMeeting({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: "",
      link: "",
    });
    setIsNewMeeting(true);
    setIsModalOpen(true);
  };

  const handleEdit = (meeting) => {
    setSelectedMeeting(meeting);
    setIsNewMeeting(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this meeting?")) {
      await axios.delete(`http://localhost:5001/api/meetings/${id}`);
      fetchMeetings();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedMeeting((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let meetingData = { ...selectedMeeting };
      if (isNewMeeting) {
        const zoomResponse = await axios.post(
          "http://localhost:5001/api/zoom/create-meeting",
          {
            topic: selectedMeeting.title,
            description: selectedMeeting.description,
            startTime: `${selectedMeeting.date}T${selectedMeeting.time}`,
            duration: selectedMeeting.duration || 30,
          }
        );

        meetingData.link = zoomResponse.data.join_url;
        meetingData.start_url = zoomResponse.data.start_url;

        await axios.post("http://localhost:5001/api/meetings", meetingData);
      } else {
        await axios.put(
          `http://localhost:5001/api/meetings/${selectedMeeting._id}`,
          meetingData
        );
      }

      setIsModalOpen(false);
      fetchMeetings();
    } catch (err) {
      console.error("Failed to save meeting", err);
    }
  };

  const extractMeetingNumber = (link) => {
    const match = link.match(/\/j\/(\d+)|\/s\/(\d+)/);
    return match ? match[1] || match[2] : "";
  };

  const extractPasscode = (link) => {
    try {
      const url = new URL(link);
      return url.searchParams.get("pwd") || "";
    } catch (err) {
      console.error("Failed to extract passcode from link", err);
      return "";
    }
  };

  const handleJoinMeeting = async (meeting, isAdmin) => {
    const client = ZoomMtgEmbedded.createClient();
    const meetingSDKElement = document.getElementById("meetingSDKElement");
  
    try {
      const meetingNumber = extractMeetingNumber(meeting.link);
      const passcode = extractPasscode(meeting.link);
  
      // Choose the correct role (1 for host, 0 for attendee)
      const role = isAdmin ? 1 : 0; // Admin is host (role 1), user is attendee (role 0)
  
      const res = await fetch("http://localhost:5001/api/zoom/generate-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingNumber,
          role, // Pass the role correctly
        }),
      });
  
      const data = await res.json();
  
      client
        .init({
          zoomAppRoot: meetingSDKElement,
          language: "en-US",
          patchJsMedia: true,
        })
        .then(() => {
          client
            .join({
              sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
              signature: data.signature,
              meetingNumber,
              password: passcode,
              userName: meeting.userName || "Guest",
            })
            .then(() => {
              console.log("Joined successfully");
            })
            .catch((error) => {
              console.error("Failed to join the meeting", error);
            });
        })
        .catch((error) => {
          console.error("Failed to initialize the client", error);
        });
    } catch (err) {
      console.error("Error joining Zoom SDK meeting", err);
    }
  };
  
  return (
    <div className="meetings-container">
      <div className="meetings-header">
        <h2>Meetings</h2>
        {isAdmin && (
          <button className="add-meeting-btn" onClick={handleAddNewMeeting}>
            <FaPlus /> Create Meeting
          </button>
        )}
      </div>

      <div className="meeting-list">
        {meetings.map((meeting) => (
          <div key={meeting._id} className="meeting-card">
            <div className="card-header">
              <h4>{meeting.title}</h4>
              {isAdmin && (
                <div className="card-actions">
                  <button onClick={() => handleEdit(meeting)}>
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(meeting._id)}>
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
            <p>{meeting.description}</p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(meeting.date).toLocaleDateString()}
            </p>
            <p>
              <strong>Time:</strong> {meeting.time}
            </p>
            <p>
              <strong>Link:</strong>{" "}
              <a
                href={isAdmin ? meeting.start_url : meeting.link}
                target="_blank"
                rel="noreferrer"
              >
                {isAdmin ? "Start Meeting" : "Join Meeting"}
              </a>
            </p>
            <button
              className="sdk-join-btn"
              onClick={() => handleEnterLobby(meeting, isAdmin)}
            >
              Enter Meeting Lobby
            </button>
          </div>
        ))}
      </div>

      {isAdmin && isModalOpen && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="modal-content">
            <h3>{isNewMeeting ? "Create Zoom Meeting" : "Edit Meeting"}</h3>
            <input
              type="text"
              name="title"
              placeholder="Title"
              value={selectedMeeting.title}
              onChange={handleChange}
              required
            />
            <textarea
              name="description"
              placeholder="Description"
              value={selectedMeeting.description}
              onChange={handleChange}
            />
            <input
              type="date"
              name="date"
              value={selectedMeeting.date}
              onChange={handleChange}
              required
            />
            <input
              type="time"
              name="time"
              value={selectedMeeting.time}
              onChange={handleChange}
              required
            />
            {isNewMeeting && (
              <input
                type="number"
                name="duration"
                placeholder="Duration (minutes)"
                value={selectedMeeting.duration}
                onChange={handleChange}
              />
            )}
            {!isNewMeeting && (
              <input
                type="url"
                name="link"
                placeholder="Meeting Link"
                value={selectedMeeting.link}
                onChange={handleChange}
              />
            )}
            <div className="modal-actions">
              <button type="submit">{isNewMeeting ? "Create" : "Update"}</button>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Zoom Embedded SDK mount point */}
      <div id="meetingSDKElement" style={{ width: "100%", height: "600px", marginTop: "2rem" }}></div>
    </div>
  );
};

export default MeetingCard;
