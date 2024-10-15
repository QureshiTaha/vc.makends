// src/components/Chat/MessageInput.js
import React, { useRef, useCallback } from "react";
import { FaPaperPlane, FaFileUpload } from "react-icons/fa";

const MessageInput = React.memo(({ message, setMessage, onSend, onFileUpload }) => {
  const fileInputRef = useRef(null);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        onSend(e);
      }
    },
    [onSend]
  );

  const handleFileChange = useCallback(
    (e) => {
      onFileUpload(e);
    },
    [onFileUpload]
  );

  return (
    <form className="msger-inputarea" onSubmit={onSend}>
      <textarea
        rows={message.split("\n").length > 1 ? 3 : 1}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter your message..."
        className="msger-input"
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{ resize: "none", padding: "10px 15px" }}
        aria-label="Message Input"
      ></textarea>
      <button type="submit" className="msger-send-btn" aria-label="Send Message">
        <FaPaperPlane />
      </button>
      <label htmlFor="file-upload" className="msger-send-btn" aria-label="Upload File">
        <FaFileUpload />
      </label>
      <input
        type="file"
        id="file-upload"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </form>
  );
});

export default MessageInput;
