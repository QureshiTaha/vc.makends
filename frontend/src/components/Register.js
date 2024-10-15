// src/components/Register.js

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3000";
const APIBASE = SOCKET_URL;
const Register = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await axios.post(`${APIBASE}/api/auth/register`, {
        phone,
        password,
        username,
      });
      // Redirect to home or login page after successful registration
      navigate("/login");
    } catch (err) {
      console.log("Cache error:", err);

      // setError(
      //   "Registration failed: " + (err.response.data || "Unknown error")
      // );
    }
  };

  return (
    <section className="homeContainer bg-colour-gradient">
      <div style={{ height: "100vh" }}>
        <div className="center-container ">
          <section className="login form-container">
            <div className="">
              <h2>Register</h2>
              {error && <p style={{ color: "red" }}>{error}</p>}
              <input
                type="text"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button onClick={handleRegister}>Register</button>
              <p>
                Already have an account?{" "}
                <a href="/" onClick={() => navigate("/")}>
                  Login here
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

export default Register;
