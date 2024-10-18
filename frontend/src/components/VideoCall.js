// VideoCall.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";
import Draggable, { DraggableCore } from "react-draggable"; // Both at the same time
import {
  FaMicrophone,
  FaMicrophoneAltSlash,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";

const socket = io(SOCKET_URL, {
  withCredentials: false, // Prevent sending credentials to match server's CORS settings
});

const VideoCall = () => {
  const { phone } = useParams();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isInitCall, setIsInitCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [readyForOffer, setReadyForOffer] = useState(false);
  const [to, setTo] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const from = localStorage.getItem("phone");
  const navigate = useNavigate();

  useEffect(() => {
    const initCall = async () => {
      setTo(phone);
      const localVideo = localVideoRef.current;

      if (from) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setLocalStream(stream);
        localVideo.srcObject = stream;
        socket.emit("join-video-call", from);
        setReadyForOffer(true);
        setIsInitCall(true);
      } else {
        alert("You are logged out");
        navigate("/");
      }
    };

    initCall();
  }, [phone, navigate, from]);

  const PeerConnection = (function () {
    let peerConnection;

    const createPeerConnection = async () => {
      const config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun2.1.google.com:19302" },
        ],
      };
      peerConnection = new RTCPeerConnection(config);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("icecandidate", {
            candidate: event.candidate,
            to: phone,
          });
        }
      };

      return peerConnection;
    };

    return {
      getInstance: async () => {
        if (!peerConnection) {
          peerConnection = await createPeerConnection();
        }
        return peerConnection;
      },
    };
  })();

  useEffect(() => {
    if (isInitCall && readyForOffer) {
      const sendOffer = async () => {
        const pc = await PeerConnection.getInstance();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { from, to, offer: pc.localDescription });
      };

      sendOffer();
    }
  }, [readyForOffer, isInitCall, from, to]);

  useEffect(() => {
    if (isInitCall) {
      socket.on("offer", async ({ from, offer }) => {
        const pc = await PeerConnection.getInstance();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { from, to, answer: pc.localDescription });
      });

      socket.on("answer", async ({ answer }) => {
        const pc = await PeerConnection.getInstance();
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("icecandidate", async (candidate) => {
        const pc = await PeerConnection.getInstance();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error.message);
        alert(`Socket error: ${error.message}`);
      });
      socket.on("user-video-call-disconnect", async () => {
        const pc = await PeerConnection.getInstance();
        pc.close();
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
        alert("Call Declined");
        window.location = "/chat/" + phone;
      });
    }

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("icecandidate");
      socket.off("error");
      socket.off("user-video-call-disconnect");
    };
  }, [isInitCall]);

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !isVideoOn;
    setIsVideoOn((prev) => !prev);
  };

  const toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled = !isAudioOn;
    setIsAudioOn((prev) => !prev);
  };
  const disconnectCall = async () => {
    const pc = await PeerConnection.getInstance();
    pc.close();
    socket.emit("user-video-call-disconnect", { from, to });
    socket.disconnect();
    localStream.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    window.location = "/chat/" + phone;
  };
  return (
    <div className="homeContainer">
      <section className="msger ">
        <header className="msger-header" style={{ position: "absolute" }}>
          <h2>Video Call with {phone}</h2>
        </header>
        <video
          ref={remoteVideoRef}
          autoPlay
          style={{ border: "1px solid black", height: "100%", width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Draggable
            // grid={[25, 25]}
            bounds=".msger"
          >
            <div>
              <video
                title="Local Video"
                ref={localVideoRef}
                autoPlay
                muted
                style={{ width: "200px", border: "none" }}
              />
            </div>
          </Draggable>
        </div>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "10px",
            }}
          >
            <button onClick={toggleVideo}>
              {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
            </button>
            <button onClick={toggleAudio}>
              {isAudioOn ? <FaMicrophone /> : <FaMicrophoneAltSlash />}
            </button>
            <button onClick={disconnectCall}>
              <FaPhoneSlash />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VideoCall;
