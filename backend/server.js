const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();
const { Server } = require("socket.io");
const sequelize = require("./database");
const authRoutes = require("./routes/auth");
const functions = require("./functions/functions");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const randomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

var allusers = {};
var videoUsers = {};

var sessionStore = {};

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use("/api/auth", authRoutes);
// Remove all unused Sockets

// io.use(async (socket, next) => {
//   const sessionID = socket.handshake.auth.sessionID;
//   if (sessionID) {
//     const session = sessionStore[sessionID];
//     if (session) {
//       socket.sessionID = sessionID;
//       socket.userID = session.userID;
//       socket.username = session.username;
//       return next();
//     }
//   }
//   const username = socket.handshake.auth.username;
//   if (!username) {
//     return next(new Error("invalid username"));
//   }
//   socket.sessionID = randomId();
//   socket.userID = randomId();
//   socket.username = username;
//   next();
// });

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  // Remove all unused Sockets

  // sessionStore[socket.sessionID] = {
  //   userID: socket.userID,
  //   username: socket.username,
  //   connected: true,
  // };

  // console.log("session", {
  //   sessionID: socket.sessionID,
  //   userID: socket.userID,
  // });

  // socket.join(socket.userID);

  socket.on("msg-join", async ({ phone, from, room }) => {
    if (!phone || !from || allusers[from]?.id === socket.id) return; // Prevent duplicate room joins
    // from = Emmiter sender
    // phone = receiver sender
    if (allusers[from]) {
      allusers[from].status = "online";
      await functions.updateStatus(from, "online");
      socket.join(room); // Join the room based on phone number
      // Loop throug contact list and send user-reconnected
      if (allusers[from].contacts) {
        for (let i = 0; i < allusers[from].contacts.length; i++) {
          const contact = allusers[from].contacts[i];
          if (contact) {
            io.to(contact).emit("user-reconnected");
          }
        }
      } else {
        await functions.getUser(from).then(async (user) => {
          if (user && user.contacts) {
            for (let i = 0; i < user.contacts.length; i++) {
              const contact = user.contacts[i];
              if (contact) {
                io.to(contact).emit("user-reconnected");
              }
            }
          }
        });
      }
    }
    allusers[from] = { id: socket.id };

    console.log(`User with phone ${phone} joined the room for ${from}.`);
    await functions.getUser(from).then(async (user) => {
      if (user) {
        allusers[from] = { ...user.dataValues, id: socket.id };
        await functions.getUser(phone).then((receiver) => {
          if (receiver) {
            io.to(phone).emit("user-joined", { user, receiver });
          }
        });
      }
    });
  });

  socket.on("disconnect", async () => {
    socket.leave(socket.id);
    console.log("🔥: A user disconnected");
    phone = Object.keys(allusers).find((key) => allusers[key].id === socket.id);
    if (phone) {
      await functions.updateStatus(phone, "offline");
    }
  });

  socket.on("join-user", async (from) => {
    if (!from || allusers[from]) return; // Prevent duplicate joins

    if (!from) {
      socket.emit("error", { message: "from is required." });
      return;
    }
    console.log(`⚡⚡⚡:${from} joined socket connection`);
    allusers[from] = { username: from, id: socket.id, status: "online" };
    io.emit("joined", allusers);
  });

  socket.on("msg-leave", async ({ phone, from }) => {
    socket.leave(phone);
    console.log(`User with phone ${phone} left the room for ${from}.`);
  });

  socket.on("get-status", async ({ phone, from }) => {
    console.log("Emitted 'get-status' with:", { phone, from });

    await functions.getUser(phone).then(async (user) => {
      if (user) {
        console.log(`User ${user.phone} is ${user.status}`);

        io.to(phone).emit("user-status", { user });
      }
    });
  });

  socket.on("send-message", (data) => {
    const { to, from } = data;
    const sendTime = new Date(); // Get the current time
    data.sendTime = sendTime;
    // ping if user is online
    try {
      if (allusers[to]) {
        io.to(allusers[to].id).emit("receive-message", data);
      }
    } catch (error) {
      io.to(allusers[from].id).emit("error", {
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
    // io.emit("joined", allusers);
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
    if (!videoUsers[from]) {
      videoUsers[from] = { username: from, id: socket.id, status: "busy" };
    } else if (!videoUsers[to]) {
      io.to(videoUsers[from].id).emit("error", { message: "User not found" });
      return;
    } else if (videoUsers[to].status === "offline") {
      io.to(videoUsers[from].id).emit("warning", {
        message: "User is offline",
      });
      return;
    } else if (videoUsers[to].status === "busy") {
      io.to(videoUsers[from].id).emit("warning", { message: "User is busy" });
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

// Sync database and start server
sequelize.sync().then(() => {
  server.listen(process.env.PORT || 3000, () => {
    console.log("Server is running on port 3000");
  });
});
