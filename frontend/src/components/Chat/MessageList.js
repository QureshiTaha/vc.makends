// src/components/Chat/MessageList.js
import React, { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";

const MessageList = React.memo(({ messages, from }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="msger-chat">
      {messages.map((msg, index) => (
        <MessageBubble key={index} msg={msg} isOwn={msg.from === from} />
      ))}
      <div ref={messagesEndRef} />
    </main>
  );
});

export default MessageList;
