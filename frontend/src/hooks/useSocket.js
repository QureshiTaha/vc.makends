// src/hooks/useSocket.js
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Modals from "../utils/Modals";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";

const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [show, setShow] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationBtn1, setNotificationBtn1] = useState({});
  const [notificationBtn2, setNotificationBtn2] = useState({});

  const location = useLocation();
  const navigate = useNavigate();
  const from = localStorage.getItem("phone");
  const recentPhone = localStorage.getItem("recent-phone");

  useEffect(() => {
    const socket = socketRef.current;
    // On leave screen
    if (recentPhone && from && location.pathname === "/") {
      socket.emit("msg-leave", { phone: recentPhone, from });
      localStorage.removeItem("recent-phone");
      console.log("msg-leave , Cleaning up msg-leave listener in popstate");
    }
  }, [location]);

  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL);
  }

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      console.log("Connected to Socket.IO server");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Disconnected from Socket.IO server");
      setIsConnected(false);
    };

    const handleError = (error) => {
      console.error("Socket.IO error:", error);
    };
    const handleIncommingVideoCall = (data) => {
      console.log("incomming-videocall", data.from);
      setNotificationMessage("Incomming Video Call from " + data.from.username);
      setShow(true);
      setNotificationBtn1({
        label: "Accept",
        onClickfunc: () => {
          navigate("/video-call/" + data.from.phone);
        },
      });
      setNotificationBtn2({
        label: "Decline",
        onClickfunc: () => {
          socket.emit("user-video-call-disconnect", {
            from,
            to: data.from.phone,
          });
          setShow(false);
        },
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);
    socket.on("error", handleError);
    socket.on("incomming-videocall", handleIncommingVideoCall);

    // Initiate connection
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
      socket.off("error", handleError);
      socket.off("incomming-videocall", handleIncommingVideoCall);
      socket.disconnect();
    };
  }, []);

  const NotificationModal = () => {
    return (
      <div>
        <Modals
          show={show}
          setShow={setShow}
          title="Incomming Video Call"
          msg={notificationMessage}
          successButtom={notificationBtn1}
          cancelButtom={notificationBtn2}
        />
      </div>
    );
  };
  return {
    NotificationModal,
    socket: socketRef.current,
    isConnected,
  };
};

export default useSocket;
