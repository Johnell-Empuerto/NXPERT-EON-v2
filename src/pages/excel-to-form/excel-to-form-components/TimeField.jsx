import React, { useState, useEffect, useRef } from "react";
import "./TimeField.css";

const TimeField = ({
  label,
  name,
  value,
  onChange,
  height = 38,
  onHeightChange,
  required = false,
  timeFormat = "HH:mm",
  minTime = "",
  maxTime = "",
  allowSeconds = false,
  disabled = false,
}) => {
  const [timeValue, setTimeValue] = useState(value || "");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [ampm, setAmPm] = useState("AM");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const timeParts = value.split(":");
      if (timeParts.length >= 2) {
        let h = parseInt(timeParts[0], 10);
        const m = timeParts[1];
        const s = timeParts[2] || "";

        if (timeFormat === "hh:mm aa") {
          // Convert 24h to 12h
          const isPM = h >= 12;
          setAmPm(isPM ? "PM" : "AM");
          h = h % 12 || 12;
          setHours(h.toString().padStart(2, "0"));
        } else {
          setHours(h.toString().padStart(2, "0"));
        }

        setMinutes(m);
        setSeconds(s);
      }
    }
  }, [value, timeFormat]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTimeChange = () => {
    let h = parseInt(hours, 10);

    // Convert 12h to 24h if needed
    if (timeFormat === "hh:mm aa") {
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    }

    const formattedHours = h.toString().padStart(2, "0");
    let formattedTime = `${formattedHours}:${minutes.padStart(2, "0")}`;

    if (allowSeconds) {
      formattedTime += `:${seconds.padStart(2, "0")}`;
    }

    setTimeValue(formattedTime);
    onChange(name, formattedTime);
    setIsOpen(false);
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return "Select time...";

    if (timeFormat === "hh:mm aa") {
      const [h, m, s] = timeStr.split(":");
      const hourInt = parseInt(h, 10);
      const ampm = hourInt >= 12 ? "PM" : "AM";
      const hour12 = hourInt % 12 || 12;

      if (s) {
        return `${hour12}:${m}:${s} ${ampm}`;
      }
      return `${hour12}:${m} ${ampm}`;
    }

    return timeStr;
  };

  const generateOptions = (start, end) => {
    const options = [];
    for (let i = start; i <= end; i++) {
      options.push(
        <option key={i} value={i.toString().padStart(2, "0")}>
          {i.toString().padStart(2, "0")}
        </option>
      );
    }
    return options;
  };

  return (
    <div className="time-field-container" ref={containerRef}>
      <label className="time-field-label">
        {required && <span className="required-asterisk">*</span>}
      </label>

      <div className="time-field-wrapper">
        <div
          className="time-display"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            height: `${height}px`,
            borderColor: isOpen ? "#2196f3" : "#cccccc",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {formatDisplayTime(timeValue)}
          <span className="time-icon">🕒</span>
        </div>

        {isOpen && !disabled && (
          <div className="time-picker-popup custom-time-picker">
            <div className="time-picker-header">
              <span>Select Time</span>
              <button
                className="close-time-picker"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="time-picker-content">
              <div className="time-inputs">
                {/* Hours */}
                <div className="time-input-group">
                  <label>HH</label>
                  <select
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="time-select"
                  >
                    <option value="">--</option>
                    {timeFormat === "hh:mm aa"
                      ? generateOptions(1, 12)
                      : generateOptions(0, 23)}
                  </select>
                </div>

                <div className="time-separator">:</div>

                {/* Minutes */}
                <div className="time-input-group">
                  <label>MM</label>
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="time-select"
                  >
                    <option value="">--</option>
                    {generateOptions(0, 59)}
                  </select>
                </div>

                {/* Seconds */}
                {allowSeconds && (
                  <>
                    <div className="time-separator">:</div>
                    <div className="time-input-group">
                      <label>SS</label>
                      <select
                        value={seconds}
                        onChange={(e) => setSeconds(e.target.value)}
                        className="time-select"
                      >
                        <option value="">--</option>
                        {generateOptions(0, 59)}
                      </select>
                    </div>
                  </>
                )}

                {/* AM/PM */}
                {timeFormat === "hh:mm aa" && (
                  <div className="time-input-group">
                    <label>AM/PM</label>
                    <select
                      value={ampm}
                      onChange={(e) => setAmPm(e.target.value)}
                      className="time-select"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="time-picker-actions">
                <button
                  type="button"
                  onClick={handleTimeChange}
                  className="time-confirm-btn"
                  disabled={!hours || !minutes}
                >
                  Set Time
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHours("");
                    setMinutes("");
                    setSeconds("");
                    setAmPm("AM");
                    setTimeValue("");
                    onChange(name, "");
                    setIsOpen(false);
                  }}
                  className="time-clear-btn"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeField;
