import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Chat from "./components/Chat/Chat";
import VideoCall from "./components/VideoCall";
import Register from "./components/Register";
import Login from "./components/Login";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./assets/home.css";
import "./assets/chat.css";
const App = () => {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chat/:phone" element={<Chat />} />
          <Route path="/video-call/:phone" element={<VideoCall />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
