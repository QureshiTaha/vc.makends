const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { phone, password, username } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({
      phone,
      password: hashedPassword,
      username,
    });
    res.status(201).send({ phone: user.phone });
  } catch (error) {
    console.error(error);
    res.status(400).json({ status: "failed", error: error });
  }
});

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ where: { phone } });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token, phone, user });
  } else {
    res.status(401).send("Invalid credentials");
  }
});

router.post("/add-contact", async (req, res) => {
  const { phone, contact } = req.body;
  const user = await User.findOne({ where: { phone } });

  if (user) {
    user.contacts = JSON.parse(user.contacts) || [];
    // Check if contact is ther in DB
    const fetchUser = await User.findOne({ where: { phone: contact } });
    if (fetchUser) {
      if (!user.contacts.includes(contact)) {
        user.contacts.push(contact);
        await user.save();
        res.status(200).json({
          status: "success",
          message: "Contact added successfully",
          contacts: user.contacts,
        });
      } else {
        res
          .status(400)
          .json({ status: "failed", error: "Contact already exists" });
      }
    } else {
      res.status(404).json({ status: "failed", error: "Contact not found" });
    }
  }
});

//GET contacts
router.get("/contacts", async (req, res) => {
  const { phone } = req.query;
  const user = await User.findOne({ where: { phone } });
  if (user) {
    userContacts = {};
    user.contacts = JSON.parse(user.contacts) || [];
    for (let i = 0; i < user.contacts.length; i++) {
      const fetchUser = await User.findOne({
        where: { phone: user.contacts[i] },
      });
      if (fetchUser) userContacts[fetchUser.phone] = fetchUser;
    }
    res.json({ contacts: userContacts });
  } else {
    res.status(404).send("User not found");
  }
});

module.exports = router;
