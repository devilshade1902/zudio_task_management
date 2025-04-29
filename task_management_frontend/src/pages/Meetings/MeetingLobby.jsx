import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";

const MeetingLobby = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const meetingNumber = searchParams.get("meetingNumber");
    const passcode = searchParams.get("passcode");
    const role = parseInt(searchParams.get("role"), 10); // 1 or 0
    const userName = "Guest User"; // Customize if needed

    if (meetingNumber && passcode !== null && role !== null) {
      const client = ZoomMtgEmbedded.createClient();
      const meetingSDKElement = document.getElementById("meetingSDKElement");

      fetch("http://localhost:5001/api/zoom/generate-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingNumber, role }),
      })
        .then((res) => res.json())
        .then((data) => {
          client
            .init({
              zoomAppRoot: meetingSDKElement,
              language: "en-US",
              patchJsMedia: true,
            })
            .then(() => {
              client.join({
                sdkKey: import.meta.env.VITE_ZOOM_SDK_KEY,
                signature: data.signature,
                meetingNumber,
                password: passcode,
                userName,
              });
            })
            .catch((err) => console.error("Zoom Join Error:", err));
        })
        .catch((err) => console.error("Signature Fetch Error:", err));
    }
  }, [searchParams]);

  return (
    <div
      style={{
        display: "flex", // Enable flexbox
        justifyContent: "center", // Horizontally center the meeting
        alignItems: "center", // Vertically center the meeting
        height: "100vh", // Full viewport height
        backgroundColor: "#f0f0f0", // Background color
        marginTop: "2rem", // Space above the meeting container
      }}
    >
      <div
        id="meetingSDKElement"
        style={{
          width: "80%", // 80% of the screen width for better responsiveness
          maxWidth: "1200px", // Max width of the meeting container
          height: "450px", // Standard meeting height (16:9 aspect ratio)
          borderRadius: "10px", // Optional: Add rounded corners
          overflow: "hidden", // Prevent overflow from the meeting
          backgroundColor: "#fff", // Background color (optional)
        }}
      ></div>
    </div>
  );
};

export default MeetingLobby;
