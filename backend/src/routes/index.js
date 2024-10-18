const express = require("express");
const auth = require("./auth");
// const testing = require("./testing");

const router = express.Router();

router.use("/testing", (req, res) => {
  // testing(req, res);
  res.send("testing");
});

router.use("/auth",auth)
module.exports = router;
