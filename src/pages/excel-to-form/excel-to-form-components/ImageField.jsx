// src/excel-to-form-components/ImageField.js
import React, { useState, useRef, useEffect } from "react";

const ImageField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
  // Image field specific props
  allowCamera = true,
  allowUpload = true,
  maxFileSize = 5, // MB
  required = false,
}) => {
  const [mode, setMode] = useState("view"); // view, camera
  const [imageSrc, setImageSrc] = useState(value || "");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize with existing value
  useEffect(() => {
    if (value) {
      setImageSrc(value);
      setPreviewUrl(value);
    }
  }, [value]);

  // Camera effects
  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported on this device");
        setMode("view");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(`Camera error: ${err.message}`);
      setMode("view");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSize}MB limit`);
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image (JPEG, PNG, GIF, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target.result;
      saveImage(imageDataUrl);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      saveImage(imageDataUrl);
    }
  };

  const saveImage = (imageDataUrl) => {
    setPreviewUrl(imageDataUrl);
    onChange(name, imageDataUrl, "image", label);
    setMode("view");
    setError("");
  };

  const clearImage = () => {
    setImageSrc("");
    setPreviewUrl("");
    onChange(name, "", "image", label);
    setMode("view");
  };

  const renderCameraMode = () => (
    <div className="image-field-camera">
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            maxHeight: "300px",
            backgroundColor: "#000",
            borderRadius: "4px",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <div className="camera-controls" style={{ marginTop: "10px" }}>
        <button
          onClick={captureImage}
          className="btn-primary"
          style={{ marginRight: "10px", padding: "8px 16px" }}
        >
          📸 Capture Photo
        </button>
        <button
          onClick={() => {
            stopCamera();
            setMode("view");
          }}
          className="btn-secondary"
          style={{ padding: "8px 16px" }}
        >
          Cancel
        </button>
      </div>
      {!cameraActive && (
        <div style={{ marginTop: "10px", color: "#666", fontStyle: "italic" }}>
          Starting camera...
        </div>
      )}
    </div>
  );

  const renderViewMode = () => (
    <div className="image-field-view">
      {previewUrl ? (
        <div className="image-preview">
          <img
            src={previewUrl}
            alt={label}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              border: "1px solid #ddd",
              borderRadius: "4px",
              objectFit: "contain",
            }}
          />
          <div className="image-actions" style={{ marginTop: "10px" }}>
            <button
              onClick={clearImage}
              className="btn-danger"
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Remove Image
            </button>
          </div>
        </div>
      ) : (
        <div
          className="image-placeholder"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            height: "150px",
            border: "2px dashed #ccc",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div
            className="placeholder-text"
            style={{ textAlign: "center", color: "#666" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>📷</div>
            <div>{label || "Click to add image"}</div>
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              (Upload or take photo)
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="image-field-wrapper"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "150px",
        marginBottom: "10px",
      }}
    >
      <div
        className="image-field-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <label style={{ fontWeight: "bold", color: "#333" }}>{label}</label>
        <div className="image-mode-buttons">
          {mode === "view" && (
            <div style={{ display: "flex", gap: "5px" }}>
              {allowUpload && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  📁 Upload
                </button>
              )}
              {allowCamera && navigator.mediaDevices?.getUserMedia && (
                <button
                  onClick={() => setMode("camera")}
                  className="btn-secondary"
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  📸 Camera
                </button>
              )}
            </div>
          )}
          {mode !== "view" && (
            <button
              onClick={() => {
                stopCamera();
                setMode("view");
              }}
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileUpload}
      />

      {error && (
        <div
          className="error-message"
          style={{
            color: "#dc3545",
            margin: "10px 0",
            padding: "8px",
            backgroundColor: "#f8d7da",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="image-field-content">
        {mode === "camera" ? renderCameraMode() : renderViewMode()}
      </div>

      {required && !previewUrl && (
        <div
          className="required-indicator"
          style={{ color: "red", fontSize: "12px", marginTop: "5px" }}
        >
          * Required
        </div>
      )}
    </div>
  );
};

export default ImageField;
