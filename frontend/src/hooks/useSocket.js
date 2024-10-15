// src/hooks/useSocket.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";

const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false, // Prevents automatic connection
    });
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

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    // Initiate connection
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};

export default useSocket;
