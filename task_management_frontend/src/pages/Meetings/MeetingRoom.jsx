import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { JaaSMeeting } from '@jitsi/react-sdk';
import {jwtDecode} from 'jwt-decode';

const MeetingRoom = () => {
  const { roomName } = useParams();
  const [jaasJwt, setJaasJwt] = useState('');
  const [userName, setUserName] = useState('Guest');
  const jaasAppId = import.meta.env.VITE_JAAS_APP_ID;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserName(decoded.name || "User"); // fallback to "User" if name is not in token
      } catch (err) {
        console.error("Error decoding token:", err);
        setUserName("Guest");
      }
    } else {
      setUserName("Guest");
    }
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      console.log("Requesting token for room:", roomName);
      const res = await fetch('http://localhost:5001/api/generate-meeting-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token')
        },
        body: JSON.stringify({ roomName, userName })
      });

      const data = await res.json();
      console.log("Received JWT from server:", data.token);
      setJaasJwt(data.token);
    };

    if (userName !== 'Guest') {
      fetchToken();
    }
  }, [roomName, userName]);

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Meeting Room: {roomName}</h3>
      {jaasJwt && (
        <JaaSMeeting
          appId={jaasAppId}
          roomName={roomName}
          jwt={jaasJwt}
          configOverwrite={{ startWithAudioMuted: true }}
          interfaceConfigOverwrite={{ DISABLE_JOIN_LEAVE_NOTIFICATIONS: true }}
          userInfo={{ displayName: userName }}
          onReadyToClose={() => {
            window.close();
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '700px';
            iframeRef.style.width = '1200px';
          }}
        />
      )}
    </div>
  );
};

export default MeetingRoom;
