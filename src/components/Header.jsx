// src/components/Header.js
import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faUserCircle,
  faSearch,
  faUser,
  faSignOutAlt,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import npaxlogo from "../assets/images/logo-npax.png";

const Header = ({ user, handleLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Function to handle profile click
  const handleProfileClick = () => {
    navigate("/dashboard/profile");
    setDropdownOpen(false);
  };

  const handleSettingsClick = () => {
    navigate("/dashboard/settings");
    setDropdownOpen(false);
  };

  const handleDashboardHome = () => {
    navigate("/dashboard");
  };

  return (
    <header className="app-header">
      {/* Left - Logo */}
      <div className="header-left">
        <button
          onClick={handleDashboardHome}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <img className="logo-image" src={npaxlogo} alt="NXPERT EON" />
        </button>
      </div>

      {/* Right */}
      <div className="header-right">
        {/* Search */}
        <div className="header-search">
          <FontAwesomeIcon icon={faSearch} />
          <input type="text" placeholder="Search..." />
        </div>

        {/* Notifications */}
        <button className="icon-btn">
          <FontAwesomeIcon icon={faBell} />
          <span className="badge">3</span>
        </button>

        {/* User Dropdown */}
        <div className="user-dropdown" ref={dropdownRef}>
          <button
            className="icon-btn user-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {user?.profile_image ? (
              <img
                src={`http://localhost:5000${user.profile_image}`}
                alt={user.name}
                className="header-profile-img"
              />
            ) : (
              <FontAwesomeIcon icon={faUserCircle} />
            )}
            <span style={{ marginLeft: "8px", fontSize: "15px" }}>
              {user?.name}
            </span>
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={handleProfileClick}>
                <FontAwesomeIcon icon={faUser} className="dropdown-icon" />
                Profile
              </button>

              <button onClick={handleSettingsClick}>
                <FontAwesomeIcon icon={faGear} className="dropdown-icon" />
                Settings
              </button>

              <button onClick={handleLogout}>
                <FontAwesomeIcon
                  icon={faSignOutAlt}
                  className="dropdown-icon"
                />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
