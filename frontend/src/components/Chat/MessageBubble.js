// src/components/Chat/MessageBubble.js
import React from "react";
import TimeFormatter from "../../utils/Timeformater";

const MessageBubble = React.memo(({ msg, isOwn }) => (
  <div className={isOwn ? "msg right-msg" : "msg left-msg"}>
    {!isOwn && (
      <div
        className="msg-img"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80)",
        }}
      />
    )}
    <div className={`msg-bubble bubble ${isOwn ? "mine" : ""}`}>
      <div className="msg-text">
        {msg.message.split("\n").map((line, index) => (
          <p key={index}>{line}</p>
        ))}
        {msg.type === "file" && (
          <a href={msg.message} target="_blank" rel="noopener noreferrer">
            Download File
          </a>
        )}
      </div>
      {msg.time && (
        <div className="msg-info">
          <div className="msg-info-time">
            <TimeFormatter inputDate={msg.time} />
          </div>
        </div>
      )}
    </div>
  </div>
));

export default MessageBubble;
