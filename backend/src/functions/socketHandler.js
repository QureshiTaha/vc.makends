const functions = require("./functions");
const fs = require("fs");
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
let videoUsers = {};
JSON_FILE_PATH = "users.json";

// open local fs file forall users.json
const loadAllUsers = async () => {
  // Create promise to read file
  allusers = await JSON.parse(fs.readFileSync(JSON_FILE_PATH, "utf8"));
};

const saveAllUsers = async () => {
  await Promise.all([
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(allusers), (err) => {
      if (err) throw err;
    }),
  ]);
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
      //   socket.leave(socket.id);
      console.log("🔥: A user disconnected");
      //   var phone = Object.keys(allusers).find(
      //     (key) => allusers[key].id === socket.id
      //   );
      //   console.log(phone);

      //   if (phone) {
      //     await updateStatus(phone, "offline");
      //   }
    });

    socket.on("msg-join", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      if (!phone || !from) return; // Prevent duplicate room joins
      // from = Emmiter sender
      // phone = receiver sender
      socket.join(room); //Join Chat screen
      console.log(`User ${from} opens chat of user ${phone} .`);

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
      saveAllUsers();
    });

    socket.on("msg-leave", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      console.log(
        `User with phone ${phone} left the room for ${from} in room ${room}.`
      );
      await updateStatus(from, "awaiting");
      io.to(room).emit("user-left-chat", {
        user: allusers[from],
      });
      saveAllUsers();
      socket.leave(room);
    });

    socket.on("get-status", async ({ phone, from }) => {
      const room = createRoomNumber(from, phone);
      console.log("Emitted 'get-status' with:", { phone, from });

      await functions.getUser(phone).then(async (user) => {
        if (user) {
          allusers[phone] = { ...allusers[phone], ...user.dataValues };
          console.log(`User ${user.phone} is ${user.status}`);
          io.to(room).emit("user-status", { user: allusers[phone] });
        }
      });
      saveAllUsers();
    });

    socket.on("send-message", (data) => {
      const { to, from } = data;
      const room = createRoomNumber(from, to);
      const sendTime = new Date(); // Get the current time
      data.sendTime = sendTime;
      // ping if user is online
      // const newMessage = {
      //   from,
      //   to: phone,
      //   message,
      //   time: new Date(),
      //   type: "text",
      // };
      try {
        const roomSize = io.sockets.adapter.rooms.get(room).size;
        console.log("Room Size", roomSize);

        if (roomSize < 2) {
          data.type = "info";
          data.message =
            "user is Away they'll see the msg when they come online";
          data.to = data.from;
          io.to(room).emit("receive-message", data);

          // console.log("Room Size", roomSize);
        } else {
          io.to(room).emit("receive-message", data);
          // Store msg to send later
        }
        saveAllUsers();
      } catch (error) {
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
      console.log("Offer send from:", data);
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
      console.log("Answer received:", data.from, ">", data.to);
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
