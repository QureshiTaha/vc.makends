// src/hooks/useChatDB.js
import { useEffect, useState, useMemo } from "react";
import { openDB } from "idb";

const useChatDB = (conversationId) => {
  const [messages, setMessages] = useState([]);

  const dbPromise = useMemo(
    () =>
      openDB("chatDB", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("chats")) {
            db.createObjectStore("chats", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        },
      }),
    []
  );

  useEffect(() => {
    const loadChats = async () => {
      try {
        const db = await dbPromise;
        const allChats = await db.getAll("chats");
        const conversationChats = allChats.filter(
          (msg) => msg.conversationId === conversationId
        );
        setMessages(conversationChats);
      } catch (error) {
        console.error("Failed to load chats from DB:", error);
      }
    };
    loadChats();
  }, [dbPromise, conversationId]);

  const addMessage = async (message) => {
    try {
      const db = await dbPromise;
      const messageToSave = {
        ...message,
        conversationId,
      };
      await db.add("chats", messageToSave);
      const Last = await getLastMessage();
      console.log("GEt message", Last);

      setMessages((prev) => [...prev, message]);
    } catch (error) {
      console.error("Failed to add message to DB:", error);
    }
  };

  const getLastMessage = async () => {
    try {
      const db = await dbPromise;
      const allChats = await db.getAll("chats");
      const conversationChats = allChats.filter(
        (msg) => msg.conversationId === conversationId
      );
      return conversationChats[conversationChats.length - 1];
    } catch (error) {
      console.error("Failed to get last message from DB:", error);
    }
  };

  const clearChats = async () => {
    try {
      const db = await dbPromise;

      const allChats = await db.getAll("chats");
      const conversationChats = allChats.filter(
        (msg) => msg.conversationId === conversationId
      );
      if (conversationChats.length === 0) {
        return; // Exit if there are no messages to delete
      }
      await Promise.all(
        conversationChats.map((msg) => db.delete("chats", msg.id))
      );
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear chats from DB:", error);
    }
  };

  const clearInfoMsg = async () => {
    try {
      const db = await dbPromise;
      const allChats = await db.getAll("chats");
      const conversationChats = allChats.filter(
        (msg) => msg.conversationId === conversationId && msg.type === "info"
      );
      if (conversationChats.length === 0) {
        return; // Exit if there are no messages to delete
      }
      await Promise.all(
        conversationChats.map((msg) => db.delete("chats", msg.id))
      );
    } catch (error) {
      console.error("Failed to clear chats from DB:", error);
    }
  };

  return { messages, addMessage, clearChats, getLastMessage, clearInfoMsg };
};

export default useChatDB;
