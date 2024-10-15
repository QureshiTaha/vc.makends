// src/components/Chat/Chat.js
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useSocket from "../../hooks/useSocket";
import useChatDB from "../../hooks/useChatDB";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const Chat = () => {
  const navigate = useNavigate();
  const { phone } = useParams(); // Recipient's phone
  const from = localStorage.getItem("phone"); // Sender's phone
  const [receiver, setReceiver] = useState({});
  const [sender, setSender] = useState({ phone });
  const [message, setMessage] = useState("");
  const offlineMessages = React.useRef([]);

  // Log phone and from to verify correctness
  useEffect(() => {
    console.log("Chat Component Mounted");
    console.log("phone from params:", phone);
    console.log("from from localStorage:", from);
  }, [phone, from]);

  const { socket, isConnected } = useSocket();
  const conversationId = `${from}-${phone}`;
  const { messages, addMessage, clearChats } = useChatDB(conversationId);

  // Handle incoming messages
  const handleReceiveMessage = useCallback(
    (data) => {
      const { from: msgFrom, message: msgContent, sendTime, type } = data;
      if (msgFrom === phone) {
        const newMessage = {
          from: msgFrom,
          message: msgContent,
          time: sendTime,
          type,
        };
        addMessage(newMessage);
        console.log("Received message:", newMessage);
      }
    },
    [addMessage, phone]
  );

  // Handle user status updates
  const handleUserStatus = useCallback((data) => {
    const { user } = data;
    if (user) {
      setReceiver(user);
      console.log("User status updated:", user);
    }
  }, []);

  // Handle user joined
  const handleUserJoined = useCallback((data) => {
    const { user, you } = data;
    if (user) {
      setReceiver(user);
      setSender(you);
      console.log("User joined:", user, "You:", you);
    }
  }, []);

  // Handle user disconnected
  const handleUserDisconnected = useCallback((data) => {
    console.log(`User ${data.phone} is offline`);
  }, []);

  // Handle user reconnected
  const handleUserReconnected = useCallback(() => {
    console.log(`User ${from} is online`);
    offlineMessages.current.forEach((msg) => {
      socket.emit("send-message", msg);
      console.log("Sent offline message:", msg);
      addMessage(msg);
    });
    offlineMessages.current = [];
  }, [addMessage, from, socket]);

  // Initialize socket listeners and emit 'msg-join' after connection
  useEffect(() => {
    if (!phone || !from) {
      console.error("Phone or From information is missing.");
      return;
    }

    const handleConnect = () => {
      socket.emit("msg-join", { phone, from });
      console.log("Socket connected. Emitted 'msg-join' with:", {
        phone,
        from,
      });
    };

    if (isConnected) {
      socket.emit("msg-join", { phone, from });
      console.log("Already connected. Emitted 'msg-join' with:", {
        phone,
        from,
      });
    }

    socket.on("connect", handleConnect);

    socket.on("receive-message", handleReceiveMessage);
    socket.on("user-status", handleUserStatus);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("user-reconnected", handleUserReconnected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("user-status", handleUserStatus);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("user-reconnected", handleUserReconnected);
    };
  }, [
    socket,
    isConnected,
    phone,
    from,
    handleReceiveMessage,
    handleUserStatus,
    handleUserJoined,
    handleUserDisconnected,
    handleUserReconnected,
  ]);

  // Periodically check user status
  useEffect(() => {
    if (!phone || !from) return;

    const getStatus = () => {
      socket.emit("get-status", { phone, from });
      console.log("Emitted 'get-status' with:", { phone, from });
    };
    getStatus(); // Initial check
    const interval = setInterval(getStatus, 5000);
    return () => clearInterval(interval);
  }, [phone, from, socket]);

  // Send message handler
  const sendMessage = useCallback(
    (e) => {
      e.preventDefault();
      if (message.trim()) {
        const newMessage = {
          from,
          to: phone,
          message,
          time: new Date(),
          type: "text",
        };
        if (receiver.status === "online") {
          socket.emit("send-message", newMessage);
          console.log("Sent message:", newMessage);
        } else {
          offlineMessages.current.push(newMessage);
          console.log("Stored offline message:", newMessage);
        }
        setMessage("");
        addMessage(newMessage);
      }
    },
    [addMessage, from, message, phone, receiver.status, socket]
  );

  // File upload handler
  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (file) {
        // TODO: Implement actual file upload logic (e.g., upload to server or cloud storage)
        // For demonstration, we'll simulate a file URL
        const fileUrl = URL.createObjectURL(file); // Replace with actual upload URL
        const newMessage = {
          from,
          to: phone,
          message: fileUrl,
          time: new Date(),
          type: "file",
        };
        if (receiver.status === "online") {
          socket.emit("send-message", newMessage);
          console.log("Sent file message:", newMessage);
        } else {
          offlineMessages.current.push(newMessage);
          console.log("Stored offline file message:", newMessage);
        }
        addMessage(newMessage);
      }
    },
    [addMessage, from, phone, receiver.status, socket]
  );

  // Delete all chats handler
  const deleteAllChats = useCallback(() => {
    clearChats();
    console.log("All chats cleared from IndexedDB.");
  }, [clearChats]);

  return (
    <section className="homeContainer">
      <section className="msger">
        <ChatHeader
          sender={sender}
          receiver={receiver}
          onDelete={deleteAllChats}
        />
        <MessageList messages={messages} from={from} />
        <MessageInput
          message={message}
          setMessage={setMessage}
          onSend={sendMessage}
          onFileUpload={handleFileUpload}
        />
      </section>
    </section>
  );
};

export default Chat;
