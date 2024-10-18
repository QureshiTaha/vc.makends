import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import useSocket from "../../hooks/useSocket";
import NotificationHandler from "../../utils/NotificationHandler.js";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = useParams();
  const [receiver, setReceiver] = useState({}); // your friend
  const [lastStatusChecked, setLastStatusChecked] = useState(Date.now());
  const [message, setMessage] = useState("");
  const from = localStorage.getItem("phone");
  const timeOut = 60000;
  const mintimeOut = 10000;
  const messagesEndRef = useRef(null);
  const { socket, isConnected, NotificationModal } = useSocket();
  const { notifyMe } = NotificationHandler();

  if (phone) {
    localStorage.setItem("recent-phone", phone);
  }

  const createRoomNumber = (phone, from) => {
    // concate both number and add them in asssending order
    if (from > phone) {
      return `${from}-${phone}`;
    } else {
      return `${phone}-${from}`;
    }
  };

  // notifyMe({
  //   title: "New Message",
  //   message: message,
  //   senderName: receiver.username ? receiver.username : phone,
  //   onclickRoute: "/chat/" + phone,
  // });

  const conversationId = createRoomNumber(from, phone);
  const { messages, addMessage, clearChats, clearInfoMsg } =
    useChatDB(conversationId);
  useEffect(() => {
    const room = createRoomNumber(from, phone);
    socket.emit("msg-join", { phone, from, room });
  }, [phone]);

  const handleReceiveMessage = useCallback((data) => {
    const { from, message, time, type } = data;
    const newMessage = { from, message, time, type };
    const cases = {
      text: () => addMessage(newMessage),
      video: () => addMessage(newMessage),
      audio: () => addMessage(newMessage),
      file: () => addMessage(newMessage),
      image: () => addMessage(newMessage),
      info: () => addMessage(newMessage),
    };
    if (newMessage.type) {
      console.log("newMessage.type", newMessage.type);
      cases[newMessage.type]();
      if (newMessage.type === "info") {
        clearInfoMsg();
      }
    }
  }, []);

  const handleSenderUser = useCallback((data) => {
    const { user } = data;
    if (user.phone === phone) {
      setReceiver(user);
    }
  }, []);

  const handleJoinUser = useCallback((data) => {
    const { user, receiver } = data;
    if (user) {
      if (receiver.phone === phone) {
        setReceiver(receiver);
      } else {
        setReceiver(user);
      }
    }
  }, []);

  const handleUserLeft = useCallback((data) => {
    const { user } = data;
    if (user.phone === phone) {
      setReceiver(user);
    }
  }, []);

  useEffect(() => {
    socket.on("receive-message", handleReceiveMessage);
    socket.on("user-status", handleSenderUser);
    socket.on("user-joined", handleJoinUser);
    socket.on("user-left-chat", handleUserLeft);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("user-status", handleSenderUser);
      socket.off("user-joined", handleJoinUser);
      socket.off("user-left-chat", handleUserLeft);
    };
  }, [handleReceiveMessage, handleSenderUser, handleJoinUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const getStatus = async () => {
      if (Date.now() - lastStatusChecked > timeOut) {
        socket.emit("get-status", {
          phone,
          from,
          room: createRoomNumber(from, phone),
        });
        setLastStatusChecked(Date.now());
      }
    };

    // Set up the interval
    const interval = setInterval(getStatus, timeOut);

    // Cleanup function to clear the interval
    return () => {
      clearInterval(interval);
    };
  }, [lastStatusChecked, phone, from]);

  const sendMessage = (e) => {
    if (!isConnected) {
      notifyMe({
        title: "No Internet Connection -Server unavailable",
        message: "Please check your internet connection and try again",
        senderName: receiver.username ? receiver.username : phone,
        onclickRoute: "/chat/" + phone,
      });
      alert("No Internet Connection -Server unavailable");
      e.preventDefault();
      return;
    }
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
      setMessage("");
    }
    e.preventDefault();
  };

  const handleFileUpload = () => {
    // Handle file upload logic
  };
  useEffect(() => {
    console.log("receiver?.joined", receiver?.joined, from);
  }, [receiver]);

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
                  receiver.status
                    ? receiver.status === "online" &&
                      (receiver?.joined == from || !receiver?.joined)
                      ? receiver.status
                      : "busy"
                    : ""
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
              className={`msg ${msg.type} ${
                msg.from === from ? "right-msg" : "left-msg"
              }`}
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
        <NotificationModal />
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
