// src/components/Home.js

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import { BiLogOutCircle } from "react-icons/bi";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";
const APIBASE = SOCKET_URL;
const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [islogin, setIsLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const InitUser = async () => {
      const token = localStorage.getItem("token");
      const phone = localStorage.getItem("phone");
      if (token && phone) {
        setPhone(localStorage.getItem("phone"));
        setIsLogin(true);
        // navigate("/");
      }
    };

    InitUser();
  }, [islogin]);

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

  return (
    <section className="homeContainer bg-colour-gradient">
      <div style={{ height: "100vh" }}>
        <div className="center-container ">
          <section
            className="login form-container"
            style={{ display: islogin ? "none" : "block" }}
          >
            <h1>Login</h1>
            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>
            <p>
              Don't have an account?{" "}
              <a href="/register" onClick={() => navigate("/register")}>
                Register here
              </a>
            </p>
          </section>

          <section
            className="register form-container"
            style={{ display: islogin ? "block" : "none" }}
          >
            <h1>Logout</h1>
            <p>Are you sure you want to logout?</p>
            <button
              onClick={() => {
                localStorage.clear();
                setIsLogin(false);
              }}
            >
              <span className="d-space-between">
                <span>Logout</span>
                <BiLogOutCircle />
              </span>
            </button>

            <button onClick={() => navigate("/")}>
              <span className="d-space-between">
                <span>Back to Home</span>
                <FaHome />
              </span>
            </button>
          </section>
        </div>
      </div>
    </section>
  );
};

export default Login;
