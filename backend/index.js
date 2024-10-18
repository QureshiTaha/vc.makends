const { spawn } = require("node:child_process");
const _ = require("lodash");

let appProcess;

function startApp() {
  console.log("Starting the app...");
  appProcess = spawn("node", ["start.js"], { stdio: "inherit" });

  appProcess.on("close", (code) => {
    console.log(`App exited with code ${code}. Restarting...`);
    startApp();
  });
}

startApp();
