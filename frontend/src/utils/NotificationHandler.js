import React from "react";

export default function NotificationHandler() {
  document.addEventListener("DOMContentLoaded", function () {
    if (!Notification) {
      alert(
        "Desktop notifications not available in your browser. Try Chromium."
      );
      return;
    }
    if (Notification.permission !== "granted") Notification.requestPermission();
  });

  //   function notifyMe({ callerName }) {
  const notifyMe = ({
    title = "Message on VC.M",
    message,
    senderName = "",
    onclickRoute = "/",
  }) => {
    if (Notification.permission !== "granted") Notification.requestPermission();
    else {
      var notification = new Notification(title, {
        body: `${message} from ${senderName}`,
        tag: "VC.M",
        renotify: true,
      });
      notification.onclick = function () {
        window.open(onclickRoute);
      };
    }
  };
  return { notifyMe };
}
