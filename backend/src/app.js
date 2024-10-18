const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const http = require("http"); // Import http
const { Server } = require("socket.io"); // Import socket.io
const app = express();
const port = process.env.PORT || 3000;
const database = require("./Modules/config");
const routes = require("./routes");
const setupSocketEvents = require("./functions/socketHandler");
const readline = require("readline");
// var logger = require("morgan");

const pino = require("pino");
const pinoHttp = require("pino-http");
const pretty = require("pino-pretty");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

API_PREFIX = process.env.API_PREFIX || "/api";
// const winston = require('winston');
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, json } = format;

module.exports = {
  start: async () => {
    if (process.env.DEBUG == 1) {
      app.use((req, res, next) => {
        console.log("\x1b[4m \x1b[32m", "\n", "\x1b[0m");
        console.log("request : \n", req.body, "\n");
        res.on("finish", () => {
          // console.log("response : \m",res,"\n");
          console.log("\x1b[4m \x1b[31m", "\n", "\x1b[0m");
        });
        next();
      });
    }

    const Wlogger = createLogger({
      level: "info",
      format: combine(timestamp(), json()),
      transports: [
        new transports.Console(),
        new transports.File({ filename: "./logs/logs.log" }),
      ],
    });

    // const logger = pino({ level: 'info' });
    const logger = pino(
      { level: "trace" },
      pino.destination("./logs/access.log")
    );
    const httpLogger = pinoHttp({
      logger,
      stream: pretty(process.stdout),
    });
    // const httpLogger = pinoHttp({ logger });

    app.use(httpLogger);
    // app.use(logger("dev"));
    // app.use(
    //   logger("combined", {
    //     stream: fs.createWriteStream("./logs/access.log", { flags: "a" }),
    //   })
    // );

    // Create a write stream for the log file
    const logStream = fs.createWriteStream("./logs/logs.log", { flags: "a" });
    // Override the console.log and console.error functions to log to the file as well as the console
    const originalLog = console.log;
    const originalError = console.error;
    console.log = function (...args) {
      try {
        originalLog.apply(console, args);
        // logStream.write(`[LOG] ${JSON.stringify(args)}\n`); //Logger
      } catch (error) {
        console.log("Logging Error",error);        
      }
      // process.stdout.write(`[LOG] ${JSON.stringify(args)}\n`);
    };
    console.error = function (...args) {
      originalError.apply(console, args);
      logStream.write(`[ERROR] ${JSON.stringify(args)}\n`);
      process.stderr.write(`[ERROR] ${JSON.stringify(args)}\n`);
    };

    app.get("/console-logs", (req, res) => {
      let { pwd } = req.query;
      if (pwd && pwd == "Xoxo@vc.makends.com") {
        // Create a read stream for the log file
        const stream = fs.createReadStream("./logs/logs.log", {
          encoding: "utf-8",
        });
        // Pipe the stream to the response
        stream.pipe(res);
        // Handle errors and close the stream when the response ends
        stream.on("error", (err) => {
          console.error(err);
          res.end();
        });

        res.on("close", () => {
          stream.close();
        });
      } else {
        res.status(404).send("<pre>Cannot GET /logs</pre>");
      }
    });

    app.get("/access-logs", (req, res) => {
      const { pwd, page, perPage } = req.query;
      if (pwd && pwd === "Xoxo@vc.makends.com") {
        // Create a read stream for the log file
        const stream = fs.createReadStream("./logs/access.log", {
          encoding: "utf-8",
        });

        const lines = [];
        let lineCount = 0;

        // Create a readline interface to read the file line by line
        const rl = readline.createInterface({ input: stream });

        // Read each line and add it to the lines array
        rl.on("line", (line) => {
          // lines.push(line);
          lines.push(JSON.parse(line));
          lineCount++;
        });

        // When all lines have been read, send the response
        rl.on("close", () => {
          // Calculate the start and end indexes for the requested page
          const start = (page - 1) * perPage;
          const end = start + perPage;

          // Slice the lines array to include only the requested lines
          const pagedLines = lines.slice(start, end);

          // Build the response object
          const response = {
            totalCount: lineCount,
            fetchedCount: pagedLines.length,
            lines: pagedLines,
          };

          // Send the response
          res.json(response);
        });

        // Handle errors and close the stream when the response ends
        stream.on("error", (err) => {
          console.error(err);
          res.end();
        });

        res.on("close", () => {
          stream.close();
        });
      } else {
        res.status(404).send("<pre>Cannot GET /logs</pre>");
      }
    });

    const corsOptions = {
      origin: "*",
      credentials: true, //access-control-allow-credentials:true
      optionSuccessStatus: 200,
    };
    app.use(cors(corsOptions));

    app.get("/", (req, res) => {
      // res.json("Hello World!");
      res.status(200).json("Hello World! , I am alive");
    });

    app.use(API_PREFIX, routes);

    // app.listen(port, () => {
    //   console.log(
    //     "\x1b[32m%s\x1b[0m",
    //     `Node environment started listening at http://127.0.0.1:${port}`
    //   );
    // });
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*", // Allow all origins, or specify your allowed origins
        methods: ["GET", "POST"],
      },
    });

    setupSocketEvents(io);
    server.listen(port, () => {
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Node environment started listening at "http://localhost:${port}"`
      );
    });
  },
};
