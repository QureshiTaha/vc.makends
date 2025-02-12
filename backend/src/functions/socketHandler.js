const functions = require("./functions");
const fs = require("fs").promises;
const randomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const createRoomNumber = (phone, from) => {
  // concate both number and add them in asssending order
  if (from > phone) {
    return `${from}-${phone}`;
  } else {
    return `${phone}-${from}`;
  }
};

let allusers = {};
let pendingMsg = {};
let videoUsers = {};
JSON_FILE_PATH = "users.json";
PENDING_MSG_PATH = "pending.json";
// open local fs file forall users.json
const loadAllUsers = async () => {
  try {
    const usersData = await fs.readFile(JSON_FILE_PATH, "utf8");
    allusers = JSON.parse(usersData);
    const pendingData = await fs.readFile(PENDING_MSG_PATH, "utf8");
    pendingMsg = JSON.parse(pendingData);
  } catch (error) {
    console.error("Error loading data:", error);
  }
};

// Save all users to JSON file
const saveAllUsers = async () => {
  try {
    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(allusers, null, 2));
  } catch (error) {
    console.error("Error saving users:", error);
  }
};

const addPendingMsg = async (key, value) => {
  if (pendingMsg.hasOwnProperty(key)) {
    pendingMsg[key].push(value);
  } else {
    pendingMsg[key] = [value];
  }
  await fs.writeFile("pending.json", JSON.stringify(pendingMsg), (err) => {
    if (err) throw err;
  });
};

const removePendingMsg = async (key) => {
  if (pendingMsg.hasOwnProperty(key)) {
    pendingMsg[key] = [];
  }
  await fs.writeFile("pending.json", JSON.stringify(pendingMsg), (err) => {
    if (err) throw err;
  });
};

const getUser = async (phone) => {
  if (!phone) return;
  var user = await functions.getUser(phone).then((user) => {
    if (user) {
      allusers[phone] = { ...user.dataValues };
      return user;
    }
    return null;
  });

  return user;
};
// Update user status
const updateStatus = async (phone, status) => {
  await loadAllUsers();
  if (!phone || !status) return;
  if (allusers[phone] && allusers[phone].status !== status) {
    await functions.updateStatus(phone, status);
    allusers[phone] = { ...allusers[phone], status };
  }
  await saveAllUsers();
};
const setupSocketEvents = (io) => {
  io.on("connection", async (socket) => {
    await loadAllUsers();
    console.log(`⚡: ${socket.id} user just connected!`);
    // Remove all unused Sockets

    socket.on("disconnect", async () => {
      socket.leave(socket.id);
      console.log("🔥: A user disconnected");
      // console.log("socket",socket);

      // allusers.hasOwnProperty(key)
      // var phone = Object.keys(allusers).find(
      //   (key) => allusers[key].id === socket.id
      // );
      // console.log("phone", phone);

      // if (phone) {
      //   await updateStatus(phone, "offline");
      // }
    });

    socket.on("msg-join", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      console.log("Emitted 'msg-join' with:", { phone, from });
      if (!phone || !from) return; // Prevent duplicate room joins
      // from = Emmiter sender
      // phone = receiver sender
      // Check is user already Join socket
      Object.keys(allusers).forEach((key) => {
        // if (allusers[phone] && allusers[phone].id) socket.leave(key);
        if (allusers[from] && allusers[from].id) {
          socket.leave(allusers[from].id);
        }
        console.log("🚫 Disconnected", key);
      });

      socket.join(room); //Join Chat screen
      await updateStatus(from, "online");
      const fromUser = await getUser(from);
      const phoneUser = await getUser(phone);

      allusers[from] = {
        ...allusers[from],
        ...fromUser?.dataValues,
        id: socket.id,
        joined: phone,
      };
      allusers[phone] = {
        ...allusers[phone],
        ...phoneUser?.dataValues,
        id: socket.id,
      };

      io.to(room).emit("user-joined", {
        user: allusers[from],
        receiver: allusers[phone],
      });
      const roomSize = io.sockets.adapter.rooms.get(room)
        ? io.sockets.adapter.rooms.get(room).size
        : 0;
      if (
        pendingMsg.hasOwnProperty(room) &&
        pendingMsg[room].length &&
        roomSize > 1
      ) {
        for (let i = 0; i < pendingMsg[room].length; i++) {
          io.to(room).emit("receive-message", pendingMsg[room][i]);
          // console.log("Sending", i, pendingMsg[room][i]);
        }
        removePendingMsg(room);
      }
      saveAllUsers();
    });

    socket.on("msg-leave", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      await updateStatus(from, "awaiting");
      io.to(room).emit("user-left-chat", {
        user: allusers[from],
      });
      saveAllUsers();
      socket.leave(room);
    });

    socket.on("get-status", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      await functions.getUser(phone).then(async (user) => {
        if (user) {
          allusers[phone] = { ...allusers[phone], ...user.dataValues };
          io.to(room).emit("user-status", { user: allusers[phone] });
        }
      });
      saveAllUsers();
    });

    socket.on("send-message", async (payload) => {
      const originalMessage = payload;
      var data = JSON.parse(JSON.stringify(payload));
      const { to, from } = data;
      const room = createRoomNumber(from, to);
      await addPendingMsg(room, originalMessage);
      var clearMsg = {
        message: "clearInfo",
        time: new Date(),
        type: "clearInfo",
      };
      // ping if user is online
      // const newMessage = {
      //   from,
      //   to: phone,
      //   message,
      //   time: new Date(),
      //   type: "text",
      // };
      try {
        const roomSize = io.sockets.adapter.rooms.get(room)
          ? io.sockets.adapter.rooms.get(room).size
          : 0;
        console.log("Room Size", roomSize);

        if (roomSize < 2) {
          data.type = "info";
          data.message =
            "user is Away they'll see the msg when they come online";
          data.to = data.from;
          io.to(room).emit("receive-message", data);
        } else {
          if (pendingMsg.hasOwnProperty(room) && pendingMsg[room].length) {
            for (let i = 0; i < pendingMsg[room].length; i++) {
              io.to(room).emit("receive-message", pendingMsg[room][i]);
              // console.log("Sending", i, pendingMsg[room][i]);
            }
            removePendingMsg(room);
            // io.to(room).emit("receive-message", clearMsg);
          }
          // io.to(room).emit("receive-message", data);
          // Store msg to send later
        }
        saveAllUsers();
      } catch (error) {
        console.log("Error", error);
        io.to(room).emit("error", {
          message: "User not found",
          data,
        });
      }
    });

    // Cron to run every minute
    // setInterval(async () => {
    //   io.emit("users", allusers);
    // }, 60000);

    socket.on("join-video-call", async (from) => {
      if (!from) {
        socket.emit("error", { message: "from is required." });
        return;
      }
      console.log(`🚨🎬:${from} joined video socket connection`);
      videoUsers[from] = { username: from, id: socket.id, status: "online" };
    });

    // Signaling for video call
    socket.on("send-offer", (data) => {
      const { from, to } = data;
      // socket.to(from).emit("offer", data); // Send offer to the specified user
      if (videoUsers[to]) {
        try {
          io.to(videoUsers[to].id).emit("offer", data);
        } catch (error) {}
      } else {
        console.log("User not found", allusers);
      }
    });

    socket.on("offer", (data) => {
      const { from, to, offer } = data;
      const room = createRoomNumber(from, to);
      if (allusers[to]) {
        io.to(room).emit("incomming-videocall", { from: allusers[from] });
      }
      if (!videoUsers[from]) {
        videoUsers[from] = { username: from, id: socket.id, status: "busy" };
      } else if (!videoUsers[to]) {
        io.to(videoUsers[from].id).emit("error", {
          message: "User not ready please wait...",
        });
        return;
      } else if (videoUsers[to].status === "offline") {
        io.to(videoUsers[from].id).emit("warning", {
          message: "User is offline",
        });
        return;
      } else if (videoUsers[to].status === "busy") {
        io.to(videoUsers[from].id).emit("warning", {
          message: "User is busy",
        });
        return;
      } else {
        videoUsers[to].status = "busy";
        console.log("Offer send to:", videoUsers[to], "from", from);
        try {
          io.to(videoUsers[to].id).emit("offer", { from, to, offer });
        } catch (error) {}
      }
    });
    socket.on("icecandidate", ({ candidate, to }) => {
      if (videoUsers[to]) {
        try {
          io.to(videoUsers[to].id).emit("icecandidate", candidate);
        } catch (error) {
          console.log("icecandidate error", error);
        }
      }
      // socket.broadcast.emit("icecandidate", candidate);
    });

    socket.on("answer", (data) => {
      const { from, to, answer } = data;

      io.to(videoUsers[from].id).emit("answer", { from, to, answer });
      // socket.to(from).emit("answer", data); // Send answer to the specified user
    });

    socket.on("candidate", (data) => {
      // Emit the candidate with the correct structure
      const { candidate, to } = data;
      if (videoUsers[to]) {
        try {
          io.to(videoUsers[to].id).emit("candidate", { candidate });
        } catch (error) {}
      } else {
        console.log("User not found for candidate:", to);
      }
    });

    // user-video-call-disconnect
    socket.on("user-video-call-disconnect", (data) => {
      const { from, to } = data;
      if (videoUsers[to]) {
        try {
          videoUsers[to].status = "online";
          io.to(videoUsers[to].id).emit("user-video-call-disconnect", data);
        } catch (error) {}
      } else {
        console.log("User not found for disconnect:", to);
      }
    });
  });

  //   After emmiting socket events
  saveAllUsers();
};

module.exports = setupSocketEvents;
