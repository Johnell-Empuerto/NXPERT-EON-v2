import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faEnvelope,
  faServer,
} from "@fortawesome/free-solid-svg-icons";
import swal from "sweetalert";
import "./Setting.css";

const Setting = () => {
  const [settings, setSettings] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "", // This will be empty after save (security)
    smtpFromEmail: "",
    smtpFromName: "",
    smtpSecure: false,
  });

  const [loading, setLoading] = useState(true);

  // Load settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/settings/get-smtp");
        const data = await res.json();
        if (data.success) {
          setSettings({
            ...data.settings,
            smtpPass: "", // Never load password from backend
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Save settings to backend
  // Save settings to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      (settings.smtpHost || settings.smtpUser || settings.smtpPass) &&
      (!settings.smtpHost ||
        !settings.smtpPort ||
        !settings.smtpUser ||
        !settings.smtpPass)
    ) {
      swal(
        "Validation Error",
        "Please fill all required SMTP fields or leave them empty.",
        "warning"
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      swal("Error", "You must login first", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/settings/save-smtp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          throw new Error(data.error || "Failed to save SMTP settings");
        }
      }

      if (data.success) {
        swal("Success!", "Settings saved to server!", "success");

        // Update the state with the saved settings from backend
        if (data.settings) {
          setSettings({
            ...data.settings,
            smtpPass: "", // Always keep password empty after save
          });
        }
      } else {
        swal("Error", data.message || "Failed to save SMTP settings", "error");
      }
    } catch (err) {
      console.error(err);
      swal("Error", err.message || "Could not connect to server", "error");
    }
  };

  const testSMTPConnection = async () => {
    if (
      !settings.smtpHost ||
      !settings.smtpPort ||
      !settings.smtpUser ||
      !settings.smtpPass
    ) {
      swal(
        "Missing Fields",
        "Please fill all SMTP fields before testing",
        "warning"
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        swal("Success!", "SMTP connection is working!", "success");
      } else {
        swal("Failed", data.message || "SMTP test failed", "error");
      }
    } catch (err) {
      swal("Error", "Backend server not reachable", "error");
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="settings-wrapper">
      <div className="settings-header">
        <h1 className="settings-title">SMTP Settings</h1>
        <p className="settings-subtitle">
          Configure email (SMTP) server for sending notifications.
        </p>
      </div>

      <div className="settings-container">
        <div className="settings-card">
          <form onSubmit={handleSubmit}>
            {/* SMTP Section */}
            <div className="settings-section">
              <h3 className="section-title">
                <FontAwesomeIcon icon={faEnvelope} className="section-icon" />
                Email (SMTP) Server Configuration
              </h3>

              {/* SMTP Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>SMTP Host</label>
                  <input
                    type="text"
                    name="smtpHost"
                    value={settings.smtpHost}
                    onChange={handleChange}
                    placeholder="smtp.gmail.com"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Port</label>
                  <input
                    type="number"
                    name="smtpPort"
                    value={settings.smtpPort}
                    onChange={handleChange}
                    placeholder="587"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SMTP Username</label>
                  <input
                    type="email"
                    name="smtpUser"
                    value={settings.smtpUser}
                    onChange={handleChange}
                    placeholder="your@gmail.com"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Password</label>
                  <input
                    type="password"
                    name="smtpPass"
                    value={settings.smtpPass}
                    onChange={handleChange}
                    placeholder="Enter only when changing"
                    className="form-input"
                  />
                  <small className="field-note">
                    Left blank = keep current password
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>"From" Email</label>
                  <input
                    type="email"
                    name="smtpFromEmail"
                    value={settings.smtpFromEmail}
                    onChange={handleChange}
                    placeholder="no-reply@yourapp.com"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>"From" Name</label>
                  <input
                    type="text"
                    name="smtpFromName"
                    value={settings.smtpFromName}
                    onChange={handleChange}
                    placeholder="My App"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="smtpSecure"
                    checked={settings.smtpSecure}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">Use SSL/TLS (secure)</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-test"
                  onClick={testSMTPConnection}
                >
                  <FontAwesomeIcon icon={faServer} /> Test SMTP Connection
                </button>
              </div>
            </div>

            <div className="settings-actions">
              <button type="submit" className="save-btn">
                <FontAwesomeIcon icon={faSave} /> Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Setting;
