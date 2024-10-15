import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import io from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaFileUpload,
  FaHome,
  FaPaperPlane,
  FaTrash,
  FaVideo,
} from "react-icons/fa";
import Dropdown from "react-bootstrap/Dropdown";
import { HiDotsVertical } from "react-icons/hi";
import Timeformater from "../../utils/Timeformater.js";
import useChatDB from "../../hooks/useChatDB.js";
// const SOCKET_URL =  "https://vc-api.makends.com";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";
const socket = io(SOCKET_URL);
const Chat = () => {
  const navigate = useNavigate();
  const { phone } = useParams();
  const [receiver, setReceiver] = useState({}); // your friend
  const [sender, setSender] = useState({}); // your self
  const [lastStatusChecked, setLastStatusChecked] = useState(Date.now());
  const [message, setMessage] = useState("");
  const from = localStorage.getItem("phone");
  const timeOut = 60000;
  const mintimeOut = 5000;
  const messagesEndRef = useRef(null);
  const offlineMessages = useRef([]);

  const conversationId = `${from}-${phone}`;
  const { messages, addMessage, clearChats } = useChatDB(conversationId);

  const createRoomNumber = (phone, from) => {
    // concate both number and add them in asssending order
    if (from > phone) {
      return `${from}${phone}`;
    } else {
      return `${phone}${from}`;
    }
  };
  useEffect(() => {
    const room = createRoomNumber(from, phone);
    console.log("room", room);
    // socket.auth = { room };
    // socket.connect();

    socket.emit("msg-join", { phone, from, room });
  }, [phone]);

  const handleReceiveMessage = useCallback((data) => {
    const { from, message, sendTime, type } = data;
    console.log("Received message:", data);
    const newMessage = { from, message, time: sendTime, type };
    addMessage(newMessage);
  }, []);

  const handleUserDisconnected = useCallback((data) => {
    socket.disconnect();
    console.log(`User ${data.phone} is offline`);
  }, []);

  const handleUserReconnected = useCallback(async () => {
    console.log(`User ${from} is online`);
    offlineMessages.current.forEach((msg) => {
      socket.emit("send-message", msg);
    });
    offlineMessages.current = [];
  }, [from]);

  const handleSenderUser = useCallback((data) => {
    const { user } = data;
    console.log("user-status", user);
    if (user) {
      setReceiver(user);
    }
  }, []);

  const handleJoinUser = useCallback((data) => {
    const { user, receiver } = data;
    if (user) {
      console.log("User joined", user);
      setReceiver(receiver);
      setSender(user);
    }
  }, []);

  useEffect(() => {
    socket.on("receive-message", handleReceiveMessage);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("user-reconnected", handleUserReconnected);
    socket.on("user-status", handleSenderUser);
    socket.on("user-joined", handleJoinUser);

    return () => {
      console.log("Cleaning up receive-message listener");
      socket.off("receive-message", handleReceiveMessage);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("user-reconnected", handleUserReconnected);
      socket.off("user-status", handleSenderUser);
      socket.off("user-joined", handleJoinUser);
    };
  }, [
    handleReceiveMessage,
    handleUserDisconnected,
    handleUserReconnected,
    handleSenderUser,
    handleJoinUser,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const getStatus = async () => {
      // if (Date.now() - lastStatusChecked > timeOut) {
        socket.emit("get-status", { phone, from });
        setLastStatusChecked(Date.now());
      // }
    };

    // Set up the interval
    const interval = setInterval(getStatus, timeOut);

    // Cleanup function to clear the interval
    return () => {
      clearInterval(interval);
    };
  }, [lastStatusChecked, phone, from]);

  const sendMessage = (e) => {
    if (message.trim()) {
      const newMessage = {
        from,
        to: phone,
        message,
        time: new Date(),
        type: "text",
      };
      socket.emit("send-message", newMessage);
      console.log("Check with:", Date.now() - lastStatusChecked > mintimeOut);

      if (Date.now() - lastStatusChecked > mintimeOut) {
        socket.emit("get-status", { phone, from });
        setLastStatusChecked(Date.now());
      }
      // Check if offline then send msg
      addMessage(newMessage);

      setMessage("");
    }
    e.preventDefault();
  };

  const handleFileUpload = () => {
    // Handle file upload logic
  };

  return (
    <section className="homeContainer">
      <section className="msger ">
        <header className="msger-header">
          <div className="msger-header-title">
            <div
              className="msg-img"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80)",
              }}
            >
              <div
                className={`${
                  receiver.status ? receiver.status : ""
                } msg-status`}
              ></div>
            </div>
            <span className="msg-name">
              {receiver.username ? receiver.username : phone}
            </span>
          </div>

          <div className="msger-header-options">
            <div>
              <Dropdown>
                <Dropdown.Toggle
                  variant=""
                  style={{ backgroundColor: "transparent" }}
                  size="sm"
                  className="options-btn "
                >
                  <HiDotsVertical />
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate("/")}>
                    <FaHome style={{ margin: "10px" }} /> Home
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => navigate(`/video-call/${phone}`)}
                  >
                    <FaVideo style={{ margin: "10px" }} /> video Call
                  </Dropdown.Item>
                  <Dropdown.Item onClick={clearChats}>
                    <FaTrash style={{ margin: "10px", color: "red" }} /> Delete
                    Conversation
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </header>
        <main className="msger-chat">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.from === from ? "msg right-msg" : "msg left-msg"}
            >
              {msg.from !== from ? (
                <div
                  className="msg-img"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80)",
                  }}
                />
              ) : (
                <></>
              )}
              <div className="msg-bubble bubble mine">
                <div className="msg-text">
                  {
                    // msg.message
                    // If \n add new line
                    msg.message.split("\n").map((line, index) => (
                      <p key={index}>{line}</p>
                    ))
                  }
                </div>
                {msg?.time ? (
                  <div className="msg-info">
                    <div className="msg-info-time">
                      {/* {timeFormatter(msg.time)} */}
                      <Timeformater inputDate={msg.time} />
                    </div>
                  </div>
                ) : (
                  <></>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} style={{ height: "60px" }} />
        </main>
        <form className="msger-inputarea" onSubmit={sendMessage}>
          <textarea
            rows={message.split("\n").length > 1 ? 3 : 1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                sendMessage(e);
              }
            }}
            placeholder="Enter your message..."
            cols="40"
            className="msger-input"
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style={{ resize: "none", padding: "10px 15px" }}
          ></textarea>
          <button type="submit" className="msger-send-btn">
            <FaPaperPlane />
          </button>
          <button
            type="file"
            className="msger-send-btn"
            onClick={() => handleFileUpload()}
          >
            <FaFileUpload />
          </button>
        </form>
      </section>
    </section>
  );
};

export default Chat;
