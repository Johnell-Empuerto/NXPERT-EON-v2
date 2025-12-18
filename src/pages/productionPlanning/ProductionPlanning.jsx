// src/pages/production-planning/ProductionPlanning.js
import React, { useState, useEffect } from "react";
import "./ProductionPlanning.css";
import swal from "sweetalert";
import API_BASE_URL from "../../config/api";

const ProductionPlanning = () => {
  const [view, setView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [plans, setPlans] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showAddPlanForm, setShowAddPlanForm] = useState(false);
  const [showEditPlanForm, setShowEditPlanForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  const [operators, setOperators] = useState([]); // Real operators from DB
  const [loadingOperators, setLoadingOperators] = useState(true);

  // Form state for new plan
  const [newPlan, setNewPlan] = useState({
    productName: "",
    description: "",
    processType: "machining",
    quantity: 500,
    priority: "medium",
    shift: "day",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    assignedOperator: "",
    assignedMachine: "",
    notes: "",
    processSteps: [
      {
        process: "Machining",
        status: "pending",
        plannedStart: "",
        plannedEnd: "",
      },
      {
        process: "Cleaning/Deburring",
        status: "pending",
        plannedStart: "",
        plannedEnd: "",
      },
      {
        process: "Assembly/Subassembly",
        status: "pending",
        plannedStart: "",
        plannedEnd: "",
      },
      {
        process: "Quality/Final Inspection",
        status: "pending",
        plannedStart: "",
        plannedEnd: "",
      },
    ],
  });

  // Process types with colors
  const processTypes = [
    { id: "machining", name: "Machining", color: "#4f46e5" },
    { id: "cleaning", name: "Cleaning/Deburring", color: "#10b981" },
    { id: "assembly", name: "Assembly/Subassembly", color: "#f59e0b" },
    { id: "quality", name: "Quality/Final Inspection", color: "#ef4444" },
  ];

  // Add this helper function at the top of your component (after the state declarations)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";

    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }

      // Try to parse the date
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "";
      }

      // Format to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "";
    }
  };

  // Update your useEffect that fetches operators:
  useEffect(() => {
    const fetchOperators = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping operator fetch");
        setLoadingOperators(false);
        return;
      }

      try {
        console.log("Fetching operators..."); // Debug log

        const response = await fetch(`${API_BASE_URL}/api/getallusermaster`, {
          // Remove trailing slash
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Make sure token is valid
            "Content-Type": "application/json",
          },
        });

        console.log("Response status:", response.status); // Debug log

        if (!response.ok) {
          console.error("Failed to fetch operators, status:", response.status);
          setLoadingOperators(false);
          return;
        }

        const data = await response.json();
        console.log("Operators data:", data); // Debug log to see what's returned

        // Transform to match what your form expects
        const transformedOperators = data.map((user) => ({
          id: user.user_id || user.id,
          name:
            user.name ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          department: user.department || "Unknown", // Provide default if null
          // Add any other fields you need
        }));

        console.log("Transformed operators:", transformedOperators); // Debug log

        setOperators(transformedOperators);
        setLoadingOperators(false);
      } catch (error) {
        console.error("Error fetching operators:", error);
        setLoadingOperators(false);
        // Optionally show error message
        swal("Error", "Failed to load operators", "error");
      }
    };

    fetchOperators();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getWeekDates = (date) => {
    const week = [];
    const current = new Date(date);
    current.setDate(current.getDate() - current.getDay());
    for (let i = 0; i < 7; i++) {
      const day = new Date(current);
      day.setDate(day.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setView("day");
  };

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  const handlePlanDragStart = (e, plan) => {
    e.dataTransfer.setData("planId", plan.id);
  };

  const handleDayDrop = (e, date) => {
    e.preventDefault();
    const planId = e.dataTransfer.getData("planId");
    console.log(`Plan ${planId} dropped on ${date.toDateString()}`);
    // Implement real update logic later
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getPlansForDate = (date) => {
    return plans.filter((plan) => {
      const planStart = new Date(plan.startDate);
      const planEnd = new Date(plan.endDate);
      return (
        date >= planStart.setHours(0, 0, 0, 0) &&
        date <= planEnd.setHours(23, 59, 59, 999)
      );
    });
  };

  const filteredPlans = plans.filter((plan) => {
    if (filter === "all") return true;
    if (filter === "active") return plan.status === "active";
    if (filter === "completed") return plan.status === "completed";
    if (filter === "cancelled") return plan.status === "cancelled";
    if (filter === "planned") return plan.status === "planned";
    return true;
  });

  const resetNewPlanForm = () => {
    setNewPlan({
      productName: "",
      description: "",
      processType: "machining",
      quantity: 500,
      priority: "medium",
      shift: "day",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      assignedOperator: "",
      assignedMachine: "",
      notes: "",
      processSteps: [
        {
          process: "Machining",
          status: "pending",
          plannedStart: "",
          plannedEnd: "",
        },
        {
          process: "Cleaning/Deburring",
          status: "pending",
          plannedStart: "",
          plannedEnd: "",
        },
        {
          process: "Assembly/Subassembly",
          status: "pending",
          plannedStart: "",
          plannedEnd: "",
        },
        {
          process: "Quality/Final Inspection",
          status: "pending",
          plannedStart: "",
          plannedEnd: "",
        },
      ],
    });
  };

  // Add a function to fetch plans from the backend
  // Update your fetchPlans function to format dates for the form:
  const fetchPlans = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found, skipping plan fetch");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/productionplanning`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Debug: Check what dates come from database
      console.log(
        "Raw dates from database:",
        data.map((plan) => ({
          id: plan.id,
          product_name: plan.product_name,
          start_date: plan.start_date,
          end_date: plan.end_date,
          formatted_start: formatDateForInput(plan.start_date),
          formatted_end: formatDateForInput(plan.end_date),
        }))
      );

      const transformedPlans = data.map((plan) => ({
        id: plan.id,
        productName: plan.product_name,
        description: plan.description,
        processType: plan.process_type,
        quantity: plan.quantity,
        priority: plan.priority,
        shift: plan.shift,
        startDate: plan.start_date,
        endDate: plan.end_date,
        assignedOperator: plan.assigned_operator,
        assignedMachine: plan.assigned_machine,
        notes: plan.notes,
        status: plan.status || "active",
        color: getProcessColor(plan.process_type),
        progress: plan.progress || 0,
        processSteps: plan.process_steps || [
          {
            process: "Machining",
            status: "pending",
            plannedStart: "",
            plannedEnd: "",
          },
        ],
      }));

      setPlans(transformedPlans);
    } catch (error) {
      console.error("Error fetching production plans:", error);
    }
  };

  // Helper function to assign colors based on process type
  const getProcessColor = (processType) => {
    const processTypeObj = processTypes.find((p) => p.id === processType);
    return processTypeObj ? processTypeObj.color : "#4f46e5"; // Default color
  };

  // Call fetchPlans when component mounts
  useEffect(() => {
    fetchPlans();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = [];

    if (!newPlan.productName) missingFields.push("Product Name");
    if (!newPlan.description) missingFields.push("Description");
    if (!newPlan.assignedOperator) missingFields.push("Assigned Operator");
    if (!newPlan.assignedMachine) missingFields.push("Assigned Machine");
    if (!newPlan.startDate) missingFields.push("Start Date");
    if (!newPlan.endDate) missingFields.push("End Date");

    if (missingFields.length > 0) {
      swal({
        title: "Missing Required Fields",
        text: `Please fill in the following fields:\n\n• ${missingFields.join(
          "\n• "
        )}`,
        icon: "warning",
        button: "OK",
      });
      return;
    }

    // Validate dates
    const startDate = new Date(newPlan.startDate);
    const endDate = new Date(newPlan.endDate);

    if (endDate < startDate) {
      swal({
        title: "Invalid Dates",
        text: "End date cannot be earlier than start date",
        icon: "error",
        button: "OK",
      });
      return;
    }

    // Validate quantity
    if (newPlan.quantity <= 0) {
      swal({
        title: "Invalid Quantity",
        text: "Quantity must be greater than 0",
        icon: "error",
        button: "OK",
      });
      return;
    }

    const payload = {
      product_name: newPlan.productName,
      process_type: newPlan.processType,
      description: newPlan.description,
      quantity: newPlan.quantity,
      priority: newPlan.priority,
      shift: newPlan.shift,
      start_date: newPlan.startDate,
      end_date: newPlan.endDate,
      assigned_operator: newPlan.assignedOperator,
      assigned_machine: newPlan.assignedMachine,
      notes: newPlan.notes,
    };

    console.log("Payload:", payload);

    const token = localStorage.getItem("token");
    if (!token) {
      swal("Error", "You must login first", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/productionplanning`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          throw new Error(data.error || "Failed to add production plan");
        }
      }

      swal("Success", "Plan added successfully!", "success");
      setShowAddPlanForm(false);
      resetNewPlanForm();
      fetchPlans();
    } catch (err) {
      console.error(err);
      swal("Error", err.message, "error");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = [];

    if (!editPlan.productName) missingFields.push("Product Name");
    if (!editPlan.description) missingFields.push("Description");
    if (!editPlan.assignedOperator) missingFields.push("Assigned Operator");
    if (!editPlan.assignedMachine) missingFields.push("Assigned Machine");
    if (!editPlan.startDate) missingFields.push("Start Date");
    if (!editPlan.endDate) missingFields.push("End Date");

    if (missingFields.length > 0) {
      swal({
        title: "Missing Required Fields",
        text: `Please fill in the following fields:\n\n• ${missingFields.join(
          "\n• "
        )}`,
        icon: "warning",
        button: "OK",
      });
      return;
    }

    // Validate dates
    const startDate = new Date(editPlan.startDate);
    const endDate = new Date(editPlan.endDate);

    if (endDate < startDate) {
      swal({
        title: "Invalid Dates",
        text: "End date cannot be earlier than start date",
        icon: "error",
        button: "OK",
      });
      return;
    }

    // Validate quantity
    if (editPlan.quantity <= 0) {
      swal({
        title: "Invalid Quantity",
        text: "Quantity must be greater than 0",
        icon: "error",
        button: "OK",
      });
      return;
    }

    const payload = {
      product_name: editPlan.productName,
      process_type: editPlan.processType,
      description: editPlan.description,
      quantity: editPlan.quantity,
      priority: editPlan.priority,
      shift: editPlan.shift,
      start_date: editPlan.startDate,
      end_date: editPlan.endDate,
      assigned_operator: editPlan.assignedOperator,
      assigned_machine: editPlan.assignedMachine,
      notes: editPlan.notes,
      status: editPlan.status,
      progress: editPlan.progress,
    };

    const token = localStorage.getItem("token");
    if (!token) {
      swal("Error", "You must login first", "error");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/productionplanning/${editPlan.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      let data = {};
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          throw new Error(data.error || "Failed to update production plan");
        }
      }

      swal("Success", "Plan updated successfully!", "success");
      setShowEditPlanForm(false);
      setEditPlan(null);
      setIsEditing(false);
      fetchPlans();
    } catch (err) {
      console.error(err);
      swal("Error", err.message, "error");
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(selectedDate);

    return (
      <div className="calendar-month-view">
        <div className="calendar-header">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day, index) => {
            const dayPlans = getPlansForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected =
              day.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                className={`calendar-day ${isToday ? "today" : ""} ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => handleDateClick(day)}
                onDrop={(e) => handleDayDrop(e, day)}
                onDragOver={handleDragOver}
              >
                <div className="day-number">{day.getDate()}</div>
                <div className="day-plans">
                  {dayPlans.slice(0, 3).map((plan) => (
                    <div
                      key={plan.id}
                      className="plan-indicator"
                      style={{ backgroundColor: plan.color }}
                      title={`${plan.productName} (${plan.quantity} units)`}
                      draggable
                      onDragStart={(e) => handlePlanDragStart(e, plan)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanClick(plan);
                      }}
                    >
                      <span className="plan-indicator-title">
                        {plan.productName.substring(0, 10)}...
                      </span>
                    </div>
                  ))}
                  {dayPlans.length > 3 && (
                    <div className="more-plans">
                      +{dayPlans.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDates(selectedDate);

    return (
      <div className="calendar-week-view">
        <div className="week-days">
          {weekDays.map((day, index) => {
            const dayPlans = getPlansForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div key={index} className="week-day">
                <div className={`week-day-header ${isToday ? "today" : ""}`}>
                  <div className="week-day-name">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="week-day-number">{day.getDate()}</div>
                </div>
                <div className="week-day-plans">
                  {dayPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="week-plan"
                      style={{
                        backgroundColor: plan.color,
                        borderLeft: `4px solid ${plan.color}`,
                      }}
                      draggable
                      onDragStart={(e) => handlePlanDragStart(e, plan)}
                      onClick={() => handlePlanClick(plan)}
                    >
                      <div className="week-plan-title">{plan.productName}</div>
                      <div className="week-plan-desc">
                        {plan.quantity} units • {plan.shift} shift
                      </div>
                      <div className="week-plan-process">
                        {
                          processTypes.find((p) => p.id === plan.processType)
                            ?.name
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayPlans = getPlansForDate(selectedDate);

    return (
      <div className="calendar-day-view">
        <div className="day-view-header">
          <h3>{formatDate(selectedDate)}</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddPlanForm(true)}
          >
            + Add Production Plan
          </button>
        </div>

        <div className="day-timeline">
          <div className="time-slot-header">
            <div className="time-label">Time</div>
            <div className="process-columns">
              {processTypes.map((process) => (
                <div
                  key={process.id}
                  className="process-column"
                  style={{ borderLeft: `4px solid ${process.color}` }}
                >
                  {process.name}
                </div>
              ))}
            </div>
          </div>

          {["Day Shift (8 AM - 5 PM)", "Night Shift (5 PM - 12 AM)"].map(
            (shift, shiftIndex) => (
              <div key={shift} className="shift-section">
                <div className="shift-header">{shift}</div>
                {Array.from({
                  length: shiftIndex === 0 ? 8 : 7, // Day: 8 hours, Night: 7 hours
                }).map((_, hourIndex) => {
                  const actualHour =
                    shiftIndex === 0
                      ? hourIndex + 8 // Day shift: 8, 9, 10, 11, 12, 13, 14, 15
                      : hourIndex + 17; // Night shift: 17, 18, 19, 20, 21, 22, 23

                  return (
                    <div key={hourIndex} className="time-slot">
                      <div className="time-label">
                        {actualHour.toString().padStart(2, "0")}:00
                      </div>
                      <div className="process-columns">
                        {processTypes.map((process) => {
                          const processPlans = dayPlans.filter(
                            (plan) =>
                              plan.processType === process.id &&
                              plan.shift ===
                                (shiftIndex === 0 ? "day" : "night")
                          );

                          return (
                            <div key={process.id} className="process-column">
                              {processPlans.map((plan) => (
                                <div
                                  key={plan.id}
                                  className="timeline-plan"
                                  style={{ backgroundColor: plan.color }}
                                  onClick={() => handlePlanClick(plan)}
                                >
                                  <strong>{plan.productName}</strong>
                                  <div>{plan.quantity} units</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const renderPlanDetails = () => {
    if (!selectedPlan) return null;

    const processType = processTypes.find(
      (p) => p.id === selectedPlan.processType
    );

    return (
      <div className="plan-details-modal">
        <div className="plan-details-content">
          <div className="plan-details-header">
            <h3>Production Plan Details</h3>
            <button
              className="close-btn"
              onClick={() => setShowPlanDetails(false)}
            >
              ×
            </button>
          </div>

          <div className="plan-details-body">
            <div className="plan-info-section">
              <div className="plan-title-section">
                <div
                  className="plan-color-indicator"
                  style={{ backgroundColor: selectedPlan.color }}
                />
                <div>
                  <h2>{selectedPlan.productName}</h2>
                  <p className="plan-description">{selectedPlan.description}</p>
                  <div className="plan-tags">
                    <span
                      className="plan-tag"
                      style={{
                        backgroundColor: processType?.color + "20",
                        color: processType?.color,
                      }}
                    >
                      {processType?.name}
                    </span>
                    <span className={`plan-tag shift-${selectedPlan.shift}`}>
                      {selectedPlan.shift} shift
                    </span>
                  </div>
                </div>
              </div>

              <div className="plan-status-badge">
                <span className={`status-badge ${selectedPlan.status}`}>
                  {selectedPlan.status}
                </span>
                <span className={`priority-badge ${selectedPlan.priority}`}>
                  {selectedPlan.priority} priority
                </span>
              </div>
            </div>

            <div className="plan-details-grid">
              <div className="detail-item">
                <label>Start Date</label>
                <p>{formatDate(new Date(selectedPlan.startDate))}</p>
              </div>
              <div className="detail-item">
                <label>End Date</label>
                <p>{formatDate(new Date(selectedPlan.endDate))}</p>
              </div>
              <div className="detail-item">
                <label>Quantity</label>
                <p className="quantity-display">
                  {selectedPlan.quantity.toLocaleString()} units
                </p>
              </div>
              <div className="detail-item">
                <label>Assigned Machine</label>
                <p className="machine-tag">{selectedPlan.assignedMachine}</p>
              </div>
              <div className="detail-item">
                <label>Assigned Operator</label>
                <p>{selectedPlan.assignedOperator}</p>
              </div>
              <div className="detail-item">
                <label>Process Type</label>
                <p>{processType?.name}</p>
              </div>
            </div>

            <div className="plan-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  // Format dates before setting editPlan
                  const formattedPlan = {
                    ...selectedPlan,
                    startDate: formatDateForInput(selectedPlan.startDate),
                    endDate: formatDateForInput(selectedPlan.endDate),
                  };

                  console.log("Setting edit plan with dates:", {
                    original: {
                      start: selectedPlan.startDate,
                      end: selectedPlan.endDate,
                    },
                    formatted: {
                      start: formattedPlan.startDate,
                      end: formattedPlan.endDate,
                    },
                  });

                  setEditPlan(formattedPlan);
                  setShowEditPlanForm(true);
                  setShowPlanDetails(false);
                }}
              >
                Edit Plan
              </button>
              <button className="btn btn-danger">Cancel Plan</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddPlanForm = () => {
    if (loadingOperators) {
      return (
        <div className="add-plan-modal">
          <div className="add-plan-content">
            <p>Loading operators...</p>
          </div>
        </div>
      );
    }

    // Debug: Check what operators we have
    console.log("Available operators in form:", operators);

    const availableMachines = {
      machining: [
        { id: "cnc1", name: "CNC Machine #1", status: "available" },
        { id: "cnc2", name: "CNC Machine #2", status: "available" },
        { id: "cnc3", name: "CNC Machine #3", status: "maintenance" },
        { id: "lathe1", name: "Lathe Machine #1", status: "available" },
        { id: "mill1", name: "Milling Machine #1", status: "available" },
      ],
      cleaning: [
        { id: "clean1", name: "Cleaning Station #1", status: "available" },
        { id: "clean2", name: "Cleaning Station #2", status: "available" },
        { id: "deburr1", name: "Deburring Station #1", status: "available" },
      ],
      assembly: [
        { id: "assy1", name: "Assembly Line #1", status: "available" },
        { id: "assy2", name: "Assembly Line #2", status: "available" },
        { id: "assy3", name: "Assembly Line #3", status: "occupied" },
      ],
      quality: [
        { id: "qa1", name: "QA Station #1", status: "available" },
        { id: "qa2", name: "QA Station #2", status: "available" },
        { id: "cmm1", name: "CMM Machine #1", status: "available" },
      ],
    };

    const machinesForSelectedProcess =
      availableMachines[newPlan.processType] || [];

    return (
      <div className="add-plan-modal">
        <div className="add-plan-content">
          <div className="add-plan-header">
            <h3>Add New Production Plan</h3>
            <button
              className="close-btn"
              onClick={() => setShowAddPlanForm(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleAddSubmit}>
            <div className="add-plan-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={newPlan.productName}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, productName: e.target.value })
                    }
                    placeholder="e.g., Steel Bracket A-100"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    placeholder="Describe the production plan details, specifications, or requirements..."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Process Type *</label>
                  <select
                    value={newPlan.processType}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        processType: e.target.value,
                        assignedMachine: "",
                      })
                    }
                  >
                    {processTypes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={newPlan.quantity}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={newPlan.priority}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, priority: e.target.value })
                    }
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Shift *</label>
                  <select
                    value={newPlan.shift}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, shift: e.target.value })
                    }
                  >
                    <option value="day">Day Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={newPlan.startDate}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={newPlan.endDate}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, endDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Assigned Operator *</label>
                  {loadingOperators ? (
                    <div className="loading-indicator">
                      <span>Loading operators...</span>
                    </div>
                  ) : operators.length === 0 ? (
                    <div className="error-message">
                      <span>No operators available. Please contact admin.</span>
                      <select disabled>
                        <option>No operators available</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      value={newPlan.assignedOperator || ""}
                      onChange={(e) =>
                        setNewPlan({
                          ...newPlan,
                          assignedOperator: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Operator</option>
                      {operators.map((operator) => (
                        <option key={operator.id} value={operator.name}>
                          {operator.name} - {operator.department || "General"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Assigned Machine *</label>
                  <select
                    value={newPlan.assignedMachine || ""}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        assignedMachine: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Machine</option>
                    {machinesForSelectedProcess.map((machine) => (
                      <option
                        key={machine.id}
                        value={machine.name}
                        disabled={machine.status !== "available"}
                        style={{
                          color:
                            machine.status === "available"
                              ? "#1f2937"
                              : "#9ca3af",
                        }}
                      >
                        {machine.name}
                        {machine.status === "maintenance" &&
                          " (Under Maintenance)"}
                        {machine.status === "occupied" &&
                          " (Currently Occupied)"}
                      </option>
                    ))}
                  </select>
                  {newPlan.processType &&
                    machinesForSelectedProcess.length === 0 && (
                      <small className="form-hint">
                        No machines available for this process type
                      </small>
                    )}
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newPlan.notes}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, notes: e.target.value })
                  }
                  placeholder="Additional notes or instructions..."
                  rows="3"
                />
              </div>

              <div className="machine-status-legend">
                <div className="legend-item">
                  <span className="status-dot available"></span>
                  <small>Available</small>
                </div>
                <div className="legend-item">
                  <span className="status-dot occupied"></span>
                  <small>Occupied</small>
                </div>
                <div className="legend-item">
                  <span className="status-dot maintenance"></span>
                  <small>Under Maintenance</small>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPlanForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  title={
                    !newPlan.productName
                      ? "Product name required"
                      : !newPlan.description
                      ? "Description is required"
                      : !newPlan.assignedOperator
                      ? "Select an operator"
                      : !newPlan.assignedMachine
                      ? "Select a machine"
                      : !newPlan.startDate || !newPlan.endDate
                      ? "Start and end dates required"
                      : "Ready to submit"
                  }
                >
                  Create Production Plan
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderEditPlanForm = () => {
    if (!editPlan) return null;

    if (loadingOperators) {
      return (
        <div className="add-plan-modal">
          <div className="add-plan-content">
            <p>Loading operators...</p>
          </div>
        </div>
      );
    }

    const availableMachines = {
      machining: [
        { id: "cnc1", name: "CNC Machine #1", status: "available" },
        { id: "cnc2", name: "CNC Machine #2", status: "available" },
        { id: "cnc3", name: "CNC Machine #3", status: "maintenance" },
        { id: "lathe1", name: "Lathe Machine #1", status: "available" },
        { id: "mill1", name: "Milling Machine #1", status: "available" },
      ],
      cleaning: [
        { id: "clean1", name: "Cleaning Station #1", status: "available" },
        { id: "clean2", name: "Cleaning Station #2", status: "available" },
        { id: "deburr1", name: "Deburring Station #1", status: "available" },
      ],
      assembly: [
        { id: "assy1", name: "Assembly Line #1", status: "available" },
        { id: "assy2", name: "Assembly Line #2", status: "available" },
        { id: "assy3", name: "Assembly Line #3", status: "occupied" },
      ],
      quality: [
        { id: "qa1", name: "QA Station #1", status: "available" },
        { id: "qa2", name: "QA Station #2", status: "available" },
        { id: "cmm1", name: "CMM Machine #1", status: "available" },
      ],
    };

    const machinesForSelectedProcess =
      availableMachines[editPlan.processType] || [];

    return (
      <div className="add-plan-modal">
        <div className="add-plan-content">
          <div className="add-plan-header">
            <h3>Edit Production Plan</h3>
            <button
              className="close-btn"
              onClick={() => {
                setShowEditPlanForm(false);
                setEditPlan(null);
                setIsEditing(false);
              }}
            >
              ×
            </button>
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="add-plan-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={editPlan.productName}
                    onChange={(e) =>
                      setEditPlan({
                        ...editPlan,
                        productName: e.target.value,
                      })
                    }
                    placeholder="e.g., Steel Bracket A-100"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    value={editPlan.description}
                    onChange={(e) =>
                      setEditPlan({
                        ...editPlan,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the production plan details, specifications, or requirements..."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Process Type *</label>
                  <select
                    value={editPlan.processType}
                    onChange={(e) =>
                      setEditPlan({
                        ...editPlan,
                        processType: e.target.value,
                        assignedMachine: "",
                      })
                    }
                  >
                    {processTypes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={editPlan.quantity}
                    onChange={(e) =>
                      setEditPlan({
                        ...editPlan,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={editPlan.priority}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, priority: e.target.value })
                    }
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Shift *</label>
                  <select
                    value={editPlan.shift}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, shift: e.target.value })
                    }
                  >
                    <option value="day">Day Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={editPlan.startDate}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={editPlan.endDate}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, endDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    value={editPlan.status}
                    onChange={(e) =>
                      setEditPlan({ ...editPlan, status: e.target.value })
                    }
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigned Operator *</label>
                  {loadingOperators ? (
                    <div className="loading-indicator">
                      <span>Loading operators...</span>
                    </div>
                  ) : operators.length === 0 ? (
                    <div className="error-message">
                      <span>No operators available. Please contact admin.</span>
                      <select disabled>
                        <option>No operators available</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      value={editPlan.assignedOperator || ""}
                      onChange={(e) =>
                        setEditPlan({
                          ...editPlan,
                          assignedOperator: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Operator</option>
                      {operators.map((operator) => (
                        <option key={operator.id} value={operator.name}>
                          {operator.name} - {operator.department || "General"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Assigned Machine *</label>
                  <select
                    value={editPlan.assignedMachine || ""}
                    onChange={(e) =>
                      setEditPlan({
                        ...editPlan,
                        assignedMachine: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Machine</option>
                    {machinesForSelectedProcess.map((machine) => (
                      <option
                        key={machine.id}
                        value={machine.name}
                        disabled={machine.status !== "available"}
                        style={{
                          color:
                            machine.status === "available"
                              ? "#1f2937"
                              : "#9ca3af",
                        }}
                      >
                        {machine.name}
                        {machine.status === "maintenance" &&
                          " (Under Maintenance)"}
                        {machine.status === "occupied" &&
                          " (Currently Occupied)"}
                      </option>
                    ))}
                  </select>
                  {editPlan.processType &&
                    machinesForSelectedProcess.length === 0 && (
                      <small className="form-hint">
                        No machines available for this process type
                      </small>
                    )}
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editPlan.notes}
                  onChange={(e) =>
                    setEditPlan({ ...editPlan, notes: e.target.value })
                  }
                  placeholder="Additional notes or instructions..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditPlanForm(false);
                    setEditPlan(null);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary">
                  Update Production Plan
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="production-planning">
      <div className="planning-header">
        <h1>Production Planning</h1>
        <div className="header-controls">
          <div className="view-switcher">
            <button
              className={`view-btn ${view === "month" ? "active" : ""}`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={`view-btn ${view === "week" ? "active" : ""}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`view-btn ${view === "day" ? "active" : ""}`}
              onClick={() => setView("day")}
            >
              Day
            </button>
          </div>

          <div className="date-navigation">
            <button
              className="nav-btn"
              onClick={() => {
                const newDate = new Date(selectedDate);
                if (view === "month") newDate.setMonth(newDate.getMonth() - 1);
                else if (view === "week")
                  newDate.setDate(newDate.getDate() - 7);
                else newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
            >
              ←
            </button>
            <span className="current-date">
              {view === "month"
                ? selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : view === "week"
                ? `Week of ${formatDate(selectedDate)}`
                : formatDate(selectedDate)}
            </span>
            <button
              className="nav-btn"
              onClick={() => {
                const newDate = new Date(selectedDate);
                if (view === "month") newDate.setMonth(newDate.getMonth() + 1);
                else if (view === "week")
                  newDate.setDate(newDate.getDate() + 7);
                else newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
            >
              →
            </button>
            <button
              className="nav-btn"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="planning-content">
        <div className="sidebar">
          <div className="filters-section">
            <h3>Filters</h3>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>

              <button
                className={`filter-btn ${filter === "planned" ? "active" : ""}`}
                onClick={() => setFilter("planned")}
              >
                Planned
              </button>

              <button
                className={`filter-btn ${filter === "active" ? "active" : ""}`}
                onClick={() => setFilter("active")}
              >
                Active
              </button>

              <button
                className={`filter-btn ${
                  filter === "completed" ? "active" : ""
                }`}
                onClick={() => setFilter("completed")}
              >
                Completed
              </button>

              <button
                className={`filter-btn ${
                  filter === "cancelled" ? "active" : ""
                }`}
                onClick={() => setFilter("cancelled")}
              >
                Cancelled
              </button>
            </div>

            <div className="process-filters">
              <h4>Process Type</h4>
              {processTypes.map((process) => (
                <div key={process.id} className="process-filter-item">
                  <div
                    className="process-color-dot"
                    style={{ backgroundColor: process.color }}
                  />
                  <span>{process.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="plans-list">
            <div className="plans-header">
              <h3>Production Plans ({filteredPlans.length})</h3>
              <button
                className="btn-small"
                onClick={() => setShowAddPlanForm(true)}
              >
                + New
              </button>
            </div>
            <div className="plans-container">
              {filteredPlans.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    marginTop: "20px",
                  }}
                >
                  No production plans yet. Click "+ New" to create one.
                </p>
              ) : (
                filteredPlans.map((plan) => {
                  const processType = processTypes.find(
                    (p) => p.id === plan.processType
                  );
                  return (
                    <div
                      key={plan.id}
                      className="plan-card"
                      draggable
                      onDragStart={(e) => handlePlanDragStart(e, plan)}
                      onClick={() => handlePlanClick(plan)}
                    >
                      <div className="plan-card-header">
                        <div
                          className="plan-color-dot"
                          style={{ backgroundColor: plan.color }}
                        />
                        <div className="plan-title">{plan.productName}</div>
                        <span className={`plan-status ${plan.status}`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="plan-card-body">
                        <div className="plan-meta">
                          <span
                            className="plan-process"
                            style={{ color: processType?.color }}
                          >
                            {processType?.name}
                          </span>
                          <span className="plan-shift">{plan.shift} shift</span>
                        </div>
                        <p className="plan-desc">{plan.description}</p>
                        <div className="plan-details">
                          <span className="detail">
                            📅 {formatShortDate(new Date(plan.startDate))} -{" "}
                            {formatShortDate(new Date(plan.endDate))}
                          </span>
                          <span className="detail">
                            🏭 {plan.assignedMachine}
                          </span>
                          <span className="detail">
                            📦 {plan.quantity} units
                          </span>
                        </div>
                        <div className="progress-bar-small">
                          <div
                            className="progress-fill"
                            style={{ width: `${plan.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="main-content">
          {view === "month" && renderMonthView()}
          {view === "week" && renderWeekView()}
          {view === "day" && renderDayView()}
        </div>
      </div>

      {showPlanDetails && renderPlanDetails()}
      {showAddPlanForm && renderAddPlanForm()}
      {showEditPlanForm && renderEditPlanForm()}
    </div>
  );
};

export default ProductionPlanning;
