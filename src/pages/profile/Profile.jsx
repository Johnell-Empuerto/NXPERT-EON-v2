import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faUserTag,
  faCalendarAlt,
  faIdBadge,
  faBuilding,
  faClock,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import swal from "sweetalert";

import profilePlaceholder from "../../assets/images/placeholder.png";
import industrialimage from "../../assets/images/industrial-image.jpg";
import "./Profile.css";

// Placeholder for a professional background image
const BACKGROUND_IMAGE_URL = industrialimage; // Industrial/factory background

const Profile = ({ user, setUser }) => {
  const [profile, setProfile] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/users/${user?.user_id}`
        );
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    if (user?.user_id) {
      fetchProfile();
    }
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString.split("T")[0];
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("user_id", user.user_id);

    try {
      const res = await fetch(
        `http://localhost:5000/api/usersprofile/upload/${user.user_id}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (res.ok) {
        // Update profile image immediately
        setProfile({ ...profile, profile_image: data.imagePath });
        setUser({ ...user, profile_image: data.imagePath });
        // Add success alert here
        swal("Success!", "Profile picture updated successfully.", "success"); // <-- ADD THIS LINE
      } else {
        swal("Upload Failed", data.error, "error");
      }
    } catch (err) {
      console.error(err);
      swal("Upload Failed", "Something went wrong", "error");
    }
  };

  if (!profile) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <>
      {/* Page Header */}
      <div className="profile-page-header">
        <h1 className="profile-page-title">Profile</h1>
        <p className="profile-page-subtitle">
          View and update your personal information
        </p>
      </div>

      <div className="profile-wrapper">
        <div className="profile-card-v2">
          {/* Card Header (Background Image) */}
          <div
            className="card-header-v2"
            style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
          >
            <div
              className="card-photo-v2"
              onClick={() => fileInput.current.click()}
              style={{ cursor: "pointer" }}
            >
              <img
                src={
                  profile.profile_image
                    ? `http://localhost:5000${profile.profile_image}`
                    : profilePlaceholder
                }
                alt={`${profile.name} Profile`}
              />
              <input
                type="file"
                ref={fileInput}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="change-photo-text">Change Profile</div>
            </div>
          </div>

          {/* Card Body (User Info) */}
          <div className="card-body-v2">
            {/* Centered Name/Role Section */}
            <div className="card-heading-section">
              <h3 className="card-name-v2">{profile.name}</h3>
              <p className="card-description-v2">
                {profile.role} at {profile.department}
              </p>
            </div>

            {/* Detailed Info Grid */}
            <div className="card-info-grid">
              <div className="info-item">
                <FontAwesomeIcon icon={faIdBadge} className="info-icon" />
                <div>
                  <span className="info-label">Employee ID</span>
                  <span className="info-value">{profile.emp_id}</span>
                </div>
              </div>

              <div className="info-item">
                <FontAwesomeIcon icon={faUserTag} className="info-icon" />
                <div>
                  <span className="info-label">Age / Status</span>
                  <span className="info-value">
                    {profile.age} /{" "}
                    <span
                      className={`status-badge status-${profile.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {profile.status}
                    </span>
                  </span>
                </div>
              </div>

              <div className="info-item">
                <FontAwesomeIcon icon={faEnvelope} className="info-icon" />
                <div>
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.email}</span>
                </div>
              </div>

              <div className="info-item">
                <FontAwesomeIcon icon={faPhone} className="info-icon" />
                <div>
                  <span className="info-label">Contact Number</span>
                  <span className="info-value">{profile.contact_number}</span>
                </div>
              </div>

              <div className="info-item">
                <FontAwesomeIcon icon={faClock} className="info-icon" />
                <div>
                  <span className="info-label">Shift</span>
                  <span className="info-value">{profile.shift}</span>
                </div>
              </div>

              <div className="info-item">
                <FontAwesomeIcon icon={faCalendarAlt} className="info-icon" />
                <div>
                  <span className="info-label">Date Hired</span>
                  <span className="info-value">
                    {formatDate(profile.date_hired)}
                  </span>
                </div>
              </div>

              <div className="info-item full-width">
                <FontAwesomeIcon icon={faUserCheck} className="info-icon" />
                <div>
                  <span className="info-label">Account Created</span>
                  <span className="info-value">
                    {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
