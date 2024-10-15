// src/components/Chat/ChatHeader.js
import React from "react";
import { FaHome, FaVideo, FaTrash } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import Dropdown from "react-bootstrap/Dropdown";
import { useNavigate } from "react-router-dom";

const ChatHeader = React.memo(({ sender, receiver, onDelete }) => {
  const navigate = useNavigate();

  return (
    <header className="msger-header">
      <div className="msger-header-title">
        <div
          className="msg-img"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80)",
          }}
        >
          <div className={`${
              receiver.status ? receiver.status : ""
            } msg-status`}></div>
        </div>
        <span className="msg-name">
          {sender.username ? sender.username : sender.phone}
        </span>
      </div>

      <div className="msger-header-options">
        <Dropdown>
          <Dropdown.Toggle
            variant=""
            style={{ backgroundColor: "transparent" }}
            size="sm"
            className="options-btn"
            aria-label="Options"
          >
            <HiDotsVertical />
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item onClick={() => navigate("/")}>
              <FaHome style={{ margin: "10px" }} /> Home
            </Dropdown.Item>
            <Dropdown.Item onClick={() => navigate(`/video-call/${sender.phone}`)}>
              <FaVideo style={{ margin: "10px" }} /> Video Call
            </Dropdown.Item>
            <Dropdown.Item onClick={onDelete}>
              <FaTrash style={{ margin: "10px", color: "red" }} /> Delete Conversation
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
});

export default ChatHeader;
