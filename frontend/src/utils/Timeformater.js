import React from "react";

export default function Timeformater({ inputDate, type = "chat" }) {
  if (!inputDate) return "";
  try {
    const now = new Date();
    const time = new Date(inputDate);
    const timeDifference = Math.floor((now.getTime() - time.getTime()) / 1000); // difference in seconds

    if (timeDifference < 60) {
      return type === "chat" ? "now" : "now";
    } else if (timeDifference < 120) {
      return "1 minute ago";
    } else if (timeDifference < 300) {
      return Math.floor(timeDifference / 60) + " minutes ago";
    } else {
      return time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  } catch (error) {
    return "";
  }
}
