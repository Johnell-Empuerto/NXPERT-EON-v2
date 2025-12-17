import React, { useState, useEffect } from "react";
import "./Login.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faArrowLeft,
  faEnvelope,
  faKey,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import swal from "sweetalert";

import NPAX from "../../assets/images/logo-npax.png";
import sideImage from "../../assets/images/manager-supervisor-worker-discussing-about-production-results-new-strategy-factory-industrial-hall.jpg";
import forgotPasswordImage from "../../assets/images/portrait-male-engineer-working-field-engineers-day-celebration-min.jpg";

const Login = ({ setIsLoggedIn, setUser }) => {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmpId, setForgotEmpId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Enter empId, 2: Enter code, 3: Enter new password
  const [isLoading, setIsLoading] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState("");
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // Timer for resend code
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
        setUser(data.user);
        localStorage.setItem(
          "auth",
          JSON.stringify({
            user: data.user,
            timestamp: new Date().getTime(),
          })
        );

        // **Save the token separately for API calls**
        localStorage.setItem("token", data.token);

        swal("Login Successful", `Welcome, ${data.user.name}!`, "success").then(
          () => {
            navigate("/dashboard");
          }
        );
      } else {
        swal(
          "Login Failed",
          data.message || "Invalid Employee ID or password",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      swal("Server Error", "Something went wrong. Please try again.", "error");
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();

    if (!forgotEmpId) {
      swal("Error", "Please enter your Employee ID", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password/request-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empId: forgotEmpId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Mask email for display
        const emailMasked = data.email
          ? data.email.replace(
              /(.{1,3})(.*)(@.*)/,
              (match, start, middle, end) =>
                start + "*".repeat(middle.length) + end
            )
          : "your email";

        setEmailSentTo(emailMasked);
        setStep(2);
        setTimer(600); // 10 minutes timer
        swal(
          "Code Sent",
          `Verification code sent to ${emailMasked}`,
          "success"
        );
      } else {
        swal("Request Failed", data.message, "error");
      }
    } catch (err) {
      console.error(err);
      swal("Server Error", "Something went wrong. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      swal("Error", "Please enter a valid 6-digit verification code", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password/verify-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: forgotEmpId,
            verificationCode,
            // No newPassword field here
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStep(3);
        swal("Code Verified", "Please enter your new password", "success");
      } else {
        swal("Verification Failed", data.message, "error");
      }
    } catch (err) {
      console.error(err);
      swal("Server Error", "Something went wrong. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) {
      swal(
        "Please wait",
        `You can resend code in ${formatTimer(timer)}`,
        "info"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password/request-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empId: forgotEmpId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setTimer(600); // Reset to 10 minutes
        swal(
          "Code Resent",
          "New verification code sent to your email",
          "success"
        );
      } else {
        swal("Resend Failed", data.message, "error");
      }
    } catch (err) {
      console.error(err);
      swal("Server Error", "Failed to resend code. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== verifyPassword) {
      swal(
        "Password Mismatch",
        "New password and verify password do not match",
        "error"
      );
      return;
    }

    if (newPassword.length < 6) {
      swal(
        "Invalid Password",
        "Password must be at least 6 characters long",
        "error"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/forgot-password/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: forgotEmpId,
            verificationCode,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        swal(
          "Success",
          "Password reset successfully! You can now login with your new password.",
          "success"
        ).then(() => {
          handleBackToLogin();
        });
      } else {
        swal("Reset Failed", data.message, "error");
      }
    } catch (err) {
      console.error(err);
      swal("Server Error", "Something went wrong. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotEmpId("");
    setVerificationCode("");
    setNewPassword("");
    setVerifyPassword("");
    setStep(1);
    setEmailSentTo("");
    setTimer(0);
  };

  return (
    <div className="login-split-layout">
      {/* Left Side - Image */}
      <div className="login-image-section">
        <div className="image-overlay"></div>
        <img
          src={showForgotPassword ? forgotPasswordImage : sideImage}
          alt={
            showForgotPassword
              ? "Password reset security"
              : "Factory team discussing production strategy"
          }
          className="side-image"
        />
        <div className="image-content">
          <img src={NPAX} alt="NPAX LOGO" />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="login-form-section">
        <div className="login-container">
          <div className="login-header">
            <div className="brand-logo-row">
              <FontAwesomeIcon icon={faChartLine} className="brand-icon" />
              <h1 className="brand-title">NXPERT EON</h1>
            </div>
            <p className="brand-subtitle">
              {showForgotPassword
                ? step === 1
                  ? "Reset your account password"
                  : step === 2
                  ? "Enter verification code sent to your email"
                  : "Create your new password"
                : "Ensuring full traceability across all production stages"}
            </p>
          </div>

          {showForgotPassword ? (
            <>
              <div className="back-to-login" onClick={handleBackToLogin}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back to Login</span>
              </div>

              {/* Step 1: Enter Employee ID */}
              {step === 1 && (
                <form className="login-form" onSubmit={handleRequestReset}>
                  <div className="form-group">
                    <label htmlFor="forgotEmpId" className="form-label">
                      <FontAwesomeIcon
                        icon={faKey}
                        style={{ marginRight: "8px" }}
                      />
                      Employee ID
                    </label>
                    <input
                      type="text"
                      id="forgotEmpId"
                      className="form-input"
                      placeholder="Enter your Employee ID"
                      required
                      value={forgotEmpId}
                      onChange={(e) => setForgotEmpId(e.target.value)}
                    />
                    <div className="form-hint">
                      Enter the Employee ID associated with your account
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${isLoading ? "loading" : ""}`}
                    disabled={isLoading}
                  >
                    <span className="btn-text">
                      {isLoading ? "Sending Code..." : "Send Verification Code"}
                    </span>
                    <span className="btn-loader"></span>
                  </button>
                </form>
              )}

              {/* Step 2: Enter Verification Code */}
              {step === 2 && (
                <form className="login-form" onSubmit={handleVerifyCode}>
                  <div className="verification-info">
                    <FontAwesomeIcon icon={faEnvelope} className="email-icon" />
                    <p>We sent a 6-digit verification code to:</p>
                    <p className="email-display">{emailSentTo}</p>
                    {timer > 0 && (
                      <p className="timer">
                        Code expires in: {formatTimer(timer)}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="verificationCode" className="form-label">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      id="verificationCode"
                      className="form-input code-input"
                      placeholder="Enter 6-digit code"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <button
                      type="submit"
                      className={`submit-btn ${isLoading ? "loading" : ""}`}
                      disabled={isLoading}
                    >
                      <span className="btn-text">
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </span>
                      <span className="btn-loader"></span>
                    </button>
                  </div>

                  <div className="resend-section">
                    <p>Didn't receive the code?</p>
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleResendCode}
                      disabled={timer > 0}
                    >
                      Resend Code {timer > 0 && `(${formatTimer(timer)})`}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Enter New Password */}
              {step === 3 && (
                <form className="login-form" onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label htmlFor="newPassword" className="form-label">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      className="form-input"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <div className="password-hint">
                      Must be at least 6 characters long
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="verifyPassword" className="form-label">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="verifyPassword"
                      className="form-input"
                      placeholder="Re-enter new password"
                      required
                      value={verifyPassword}
                      onChange={(e) => setVerifyPassword(e.target.value)}
                    />
                    {newPassword &&
                      verifyPassword &&
                      newPassword !== verifyPassword && (
                        <div className="password-error">
                          Passwords do not match
                        </div>
                      )}
                    {newPassword &&
                      verifyPassword &&
                      newPassword === verifyPassword &&
                      newPassword.length >= 6 && (
                        <div className="password-success">
                          Passwords match ✓
                        </div>
                      )}
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${isLoading ? "loading" : ""}`}
                    disabled={
                      isLoading ||
                      newPassword !== verifyPassword ||
                      newPassword.length < 6
                    }
                  >
                    <span className="btn-text">
                      {isLoading ? "Resetting Password..." : "Reset Password"}
                    </span>
                    <span className="btn-loader"></span>
                  </button>
                </form>
              )}
            </>
          ) : (
            // Login Form
            <>
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="empid" className="form-label">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    id="empid"
                    className="form-input"
                    placeholder="Enter your Employee ID"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <a
                      href="#"
                      className="forgot-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowForgotPassword(true);
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="submit-btn">
                  <span className="btn-text">Sign In</span>
                  <span className="btn-loader"></span>
                </button>
              </form>

              <div className="divider">
                <span className="divider-text">or</span>
              </div>

              <p className="signup-text">
                Don't have an account? Please contact the administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
