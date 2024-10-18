// src/components/Home.js

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Timeformater from "../utils/Timeformater";
import { openDB } from "idb";
import { BiLogOutCircle } from "react-icons/bi";
import { FaSearch } from "react-icons/fa";
import useSocket from "../hooks/useSocket";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";
const APIBASE = SOCKET_URL;
const Home = () => {
  const [phone, setPhone] = useState("");
  const [contacts, setContacts] = useState([]);
  const [islogin, setIsLogin] = useState(false);
  const { socket, isConnected, NotificationModal } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContacts = async () => {
      const token = localStorage.getItem("token");
      const phone = localStorage.getItem("phone");
      if (token && phone) {
        setIsLogin(true);
        socket.emit("msg-join", { phone, from: phone });

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

          const createRoomNumber = (phone, from) => {
            // concate both number and add them in asssending order
            if (from > phone) {
              return `${from}-${phone}`;
            } else {
              return `${phone}-${from}`;
            }
          };
          const lastMessagePromises = Object.keys(allContacts).map(
            async (contact) => {
              const key = createRoomNumber(phone, contact);
              const db = await dbPromise;
              const allChats = await db.getAll("chats");
              const conversationChats = allChats.filter(
                (msg) => msg.conversationId === key && msg.type === "text"
              );
              const lastMessage =
                conversationChats[conversationChats.length - 1];
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
                  <div className="msg-status- online" />
                </div>
                <div className="desc-contact">
                  <p className="name">{contact[1].username}</p>
                  <p className="message">{contact[1].lastMessage}</p>
                </div>

                <div className="timer">
                  {" "}
                  <Timeformater type="home" inputDate={contact[1].sendTime} />
                </div>
              </div>
            ))}

        {/* Add user Floating button */}

        <button className="floating-add-button" onClick={addContact}>
          +
        </button>
      </div>
      <NotificationModal />
    </section>
  );
};

export default Home;
