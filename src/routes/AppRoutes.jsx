import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/login/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import UserMaster from "../pages/usermaster/UserMaster";

const AppRoutes = () => {
  const authData = JSON.parse(localStorage.getItem("auth"));
  const [isLoggedIn, setIsLoggedIn] = useState(!!authData);
  const [user, setUser] = useState(authData ? authData.user : null);
  const [currentPage, setCurrentPage] = useState("home");

  const idleTimeout = useRef(null);

  // Function to logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("auth");
    clearTimeout(idleTimeout.current);
  };

  // Reset idle timer on any user activity
  const resetIdleTimer = () => {
    if (idleTimeout.current) clearTimeout(idleTimeout.current);
    idleTimeout.current = setTimeout(() => {
      handleLogout();
      alert("Logged out due to inactivity");
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    if (isLoggedIn) {
      // Listen to user activity
      window.addEventListener("mousemove", resetIdleTimer);
      window.addEventListener("keydown", resetIdleTimer);
      window.addEventListener("click", resetIdleTimer);
      window.addEventListener("scroll", resetIdleTimer);
      window.addEventListener("touchstart", resetIdleTimer);

      // Start the timer
      resetIdleTimer();
    }

    return () => {
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("click", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      clearTimeout(idleTimeout.current);
    };
  }, [isLoggedIn]);

  return (
    <>
      {/* Header removed from here - it's now only inside Dashboard component */}

      <Routes>
        <Route
          path="/login"
          element={<Login setIsLoggedIn={setIsLoggedIn} setUser={setUser} />}
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? (
              <Dashboard
                user={user}
                setUser={setUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                handleLogout={handleLogout} // Pass handleLogout to Dashboard
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />

        <Route
          path="/usermaster"
          element={isLoggedIn ? <UserMaster /> : <Navigate to="/login" />}
        />
      </Routes>
    </>
  );
};

export default AppRoutes;
