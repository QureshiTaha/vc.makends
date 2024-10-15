// src/components/Home.js

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Timeformater from "../utils/Timeformater";
import { openDB } from "idb";
import { BiLogOutCircle } from "react-icons/bi";
import { FaSearch } from "react-icons/fa";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";
const APIBASE = SOCKET_URL;
const Home = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [contacts, setContacts] = useState([]);
  const [islogin, setIsLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContacts = async () => {
      const token = localStorage.getItem("token");
      const phone = localStorage.getItem("phone");
      if (token && phone) {
        setIsLogin(true);
        try {
          const response = await axios.get(
            `${APIBASE}/api/auth/contacts?phone=${phone}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const { data } = response;
          let allContacts = data.contacts;

          // Create an array of promises for fetching last messages
          const lastMessagePromises = Object.keys(allContacts).map(
            async (contact) => {
              const lastMessage = await fetchLastMessageByConversation(
                phone,
                allContacts[contact].phone
              );
              if (lastMessage) {
                allContacts[contact].lastMessage = lastMessage.message;
                allContacts[contact].sendTime = lastMessage.time;
              }
            }
          );

          // Wait for all last messages to be fetched
          await Promise.all(lastMessagePromises);

          // Sort contacts by sendTime after all last messages are fetched
          const sortedContacts = Object.entries(allContacts).sort(
            (a, b) => new Date(b[1].sendTime) - new Date(a[1].sendTime)
          );

          // Update the state with the sorted contacts
          setContacts(sortedContacts);
          console.log("sortedContacts", sortedContacts);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        }
        setPhone(localStorage.getItem("phone"));
      } else {
        setIsLogin(false);
        navigate("/login");
      }
    };

    fetchContacts();
  }, [islogin]);

  const dbPromise = openDB("chatDB", 1, {
    upgrade(db) {
      db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
    },
  });

  const fetchLastMessageByConversation = async (fromPhone, toPhone) => {
    const db = await dbPromise;
    const conversationId = `${fromPhone}-${toPhone}`;
    const allChats = await db.getAll("chats");
    const filteredMessages = allChats.filter(
      (msg) => msg.conversationId === conversationId
    );

    if (filteredMessages.length > 0) {
      const lastMessage = filteredMessages.sort(
        (a, b) => new Date(b.time) - new Date(a.time)
      )[0];

      return lastMessage;
    }
    return null;
  };

  const handleLogin = async () => {
    try {
      const { data } = await axios.post(`${APIBASE}/api/auth/login`, {
        phone,
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("phone", phone);
      navigate("/");
      setIsLogin(true);
    } catch (error) {
      alert("Login failed: " + error.response.data);
    }
  };

  const addContact = async () => {
    const newContact = prompt("Enter contact phone number");
    if (newContact) {
      const token = localStorage.getItem("token");
      try {
        const addContact = await axios
          .post(
            `${APIBASE}/api/auth/add-contact`,
            { phone, contact: newContact },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => JSON.parse(res.data))
          .catch((err) => err.response.data);

        console.log("addContact", addContact);
        if (addContact.status === "success") {
          alert("Contact added successfully");
        } else if (addContact.error) {
          alert(addContact.error);
        } else {
          alert("Something went wrong");
        }
      } catch (error) {
        console.log("Cache error:", error);
      }
    }
  };

  return (
    <section className="homeContainer ">
      <div className="discussions ">
        <div className="discussion search">
          <div className="searchbar">
            <FaSearch size={20} style={{ margin: "10px" }} />
            <input type="text" placeholder="Search..." />
          </div>
          <div onClick={() => navigate("/login")}>
            <BiLogOutCircle
              size={30}
              style={{ margin: "10px", color: "red" }}
            />
          </div>
        </div>

        <div className="discussion message-active">
          <div
            className="photo-contact"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1435348773030-a1d74f568bc2?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1050&q=80")',
            }}
          >
            <div className="online" />
          </div>
          <div className="desc-contact">
            <p className="name">Megan Leib</p>
            <p className="message">9 pm at the bar if possible 😳</p>
          </div>
          <div className="timer">12 sec</div>
        </div>

        {!contacts && !contacts.length
          ? null
          : contacts.map((contact) => (
              <div
                key={contact}
                className="discussion message-active"
                onClick={() => navigate(`/chat/${contact[0]}`)}
              >
                <div
                  className="photo-contact"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80")',
                  }}
                >
                  <div className="online" />
                </div>
                <div className="desc-contact">
                  <p className="name">{contact[1].username}</p>
                  <p className="message">{contact[1].lastMessage}</p>
                  {/* <pre
                    onClick={() => alert(JSON.stringify(contacts[contact]))}
                  >{`${JSON.stringify(contacts[contact])}`}</pre> */}
                </div>

                <div className="timer">
                  {" "}
                  <Timeformater type="home" inputDate={contact[1].updatedAt} />
                </div>
              </div>
              // <li key={contact}>
              //   <span onClick={() => navigate(`/chat/${contact}`)}>{contact}</span>
              //   <button onClick={() => navigate(`/video-call/${contact}`)}>
              //     Video Call
              //   </button>
              // </li>
            ))}

        {/* Add user Floating button */}

        <button className="floating-add-button" onClick={addContact}>
          +
        </button>
      </div>
    </section>
  );
};

export default Home;
