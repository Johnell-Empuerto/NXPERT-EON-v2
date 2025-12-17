// src/pages/production-planning/ProductionPlanning.js
import React, { useState, useEffect } from "react";
import "./ProductionPlanning.css";

const ProductionPlanning = () => {
  const [view, setView] = useState("month"); // 'month', 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [plans, setPlans] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'completed', 'delayed'
  const [showAddPlanForm, setShowAddPlanForm] = useState(false);

  // Form state for new plan
  // Update your newPlan state initialization
  const [newPlan, setNewPlan] = useState({
    productName: "",
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

  // Process types with colors (REMOVED Maintenance and Material Preparation)
  const processTypes = [
    { id: "machining", name: "Machining", color: "#4f46e5" },
    { id: "cleaning", name: "Cleaning/Deburring", color: "#10b981" },
    { id: "assembly", name: "Assembly/Subassembly", color: "#f59e0b" },
    { id: "quality", name: "Quality/Final Inspection", color: "#ef4444" },
  ];

  // Mock data for plans
  useEffect(() => {
    const mockPlans = [
      {
        id: 1,
        productName: "Steel Bracket A-100",
        processType: "machining",
        description: "CNC machining of steel brackets",
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 3)),
        status: "active",
        priority: "high",
        assignedMachine: "CNC Machine #3",
        assignedOperator: "John Doe",
        progress: 75,
        quantity: 500,
        shift: "day",
        processSteps: [
          {
            process: "Machining",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-10",
            actualEnd: "2024-01-11",
          },
          {
            process: "Cleaning/Deburring",
            status: "in-progress",
            progress: 50,
            actualStart: "2024-01-12",
            actualEnd: "",
          },
          {
            process: "Assembly/Subassembly",
            status: "pending",
            progress: 0,
            actualStart: "",
            actualEnd: "",
          },
          {
            process: "Quality/Final Inspection",
            status: "pending",
            progress: 0,
            actualStart: "",
            actualEnd: "",
          },
        ],
        color: "#4f46e5",
      },
      {
        id: 2,
        productName: "Aluminum Housing B-200",
        processType: "assembly",
        description: "Assembly of aluminum housing units",
        startDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        status: "scheduled",
        priority: "medium",
        assignedMachine: "Assembly Line #1",
        assignedOperator: "Jane Smith",
        progress: 0,
        quantity: 300,
        shift: "night",
        processSteps: [
          {
            process: "Machining",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-08",
            actualEnd: "2024-01-09",
          },
          {
            process: "Cleaning/Deburring",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-10",
            actualEnd: "2024-01-10",
          },
          {
            process: "Assembly/Subassembly",
            status: "pending",
            progress: 0,
            actualStart: "",
            actualEnd: "",
          },
          {
            process: "Quality/Final Inspection",
            status: "pending",
            progress: 0,
            actualStart: "",
            actualEnd: "",
          },
        ],
        color: "#f59e0b",
      },
      {
        id: 3,
        productName: "Precision Shaft C-300",
        processType: "quality",
        description: "Final inspection of precision shafts",
        startDate: new Date(new Date().setDate(new Date().getDate() - 2)),
        endDate: new Date(),
        status: "completed",
        priority: "low",
        assignedMachine: "QA Station #2",
        assignedOperator: "Mike Johnson",
        progress: 100,
        quantity: 250,
        shift: "day",
        processSteps: [
          {
            process: "Machining",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-05",
            actualEnd: "2024-01-06",
          },
          {
            process: "Cleaning/Deburring",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-07",
            actualEnd: "2024-01-07",
          },
          {
            process: "Assembly/Subassembly",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-08",
            actualEnd: "2024-01-09",
          },
          {
            process: "Quality/Final Inspection",
            status: "completed",
            progress: 100,
            actualStart: "2024-01-10",
            actualEnd: "2024-01-10",
          },
        ],
        color: "#ef4444",
      },
      // REMOVED the Maintenance plan
    ];
    setPlans(mockPlans);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
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
    // In real implementation, update plan date in database
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
    if (filter === "delayed") return plan.status === "delayed";
    return true;
  });

  const handleAddPlan = () => {
    const newPlanObj = {
      id: plans.length + 1,
      productName: newPlan.productName,
      processType: newPlan.processType,
      description: `${newPlan.productName} - ${newPlan.processType}`,
      startDate: new Date(newPlan.startDate),
      endDate: new Date(newPlan.endDate),
      status: "scheduled",
      priority: newPlan.priority,
      assignedMachine: newPlan.assignedMachine,
      assignedOperator: newPlan.assignedOperator,
      progress: 0,
      quantity: newPlan.quantity,
      shift: newPlan.shift,
      processSteps: newPlan.processSteps.map((step) => ({
        ...step,
        status: "pending",
        progress: 0,
      })),
      color:
        processTypes.find((p) => p.id === newPlan.processType)?.color ||
        "#4f46e5",
    };

    setPlans([...plans, newPlanObj]);
    setShowAddPlanForm(false);
    resetNewPlanForm();
  };

  const getMachineByProcess = (processType) => {
    const machines = {
      machining: "CNC Machine #1",
      cleaning: "Cleaning Station #2",
      assembly: "Assembly Line #1",
      quality: "QA Station #1",
    };
    return machines[processType] || "General";
  };

  const resetNewPlanForm = () => {
    setNewPlan({
      productName: "",
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

          {["Day Shift (8 AM - 4 PM)", "Night Shift (4 PM - 12 AM)"].map(
            (shift, shiftIndex) => (
              <div key={shift} className="shift-section">
                <div className="shift-header">{shift}</div>
                {Array.from({ length: 8 }).map((_, hour) => {
                  const actualHour = shiftIndex === 0 ? hour + 8 : hour + 16;
                  return (
                    <div key={hour} className="time-slot">
                      <div className="time-label">{actualHour}:00</div>
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

            <div className="process-steps-section">
              <h4>Process Flow</h4>
              <div className="process-steps">
                {selectedPlan.processSteps.map((step, index) => (
                  <div key={index} className={`process-step ${step.status}`}>
                    <div className="step-header">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-name">{step.process}</div>
                      <span className={`step-status ${step.status}`}>
                        {step.status}
                      </span>
                    </div>
                    <div className="step-progress">
                      <div className="progress-bar-small">
                        <div
                          className="progress-fill"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{step.progress}%</span>
                    </div>
                    {step.actualStart && (
                      <div className="step-dates">
                        <small>Started: {step.actualStart}</small>
                        {step.actualEnd && (
                          <small>Completed: {step.actualEnd}</small>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="plan-progress-section">
              <label>Overall Progress</label>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${selectedPlan.progress}%` }}
                />
              </div>
              <span className="progress-text">
                {selectedPlan.progress}% Complete
              </span>
            </div>

            <div className="plan-actions">
              <button className="btn btn-primary">Edit Plan</button>
              <button className="btn btn-secondary">Update Progress</button>
              <button className="btn btn-danger">Cancel Plan</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddPlanForm = () => {
    // Available operators
    const availableOperators = [
      { id: 1, name: "John Doe", department: "Machining" },
      { id: 2, name: "Jane Smith", department: "Assembly" },
      { id: 3, name: "Mike Johnson", department: "Quality" },
      { id: 4, name: "Sarah Williams", department: "Cleaning" },
      { id: 5, name: "Robert Brown", department: "Machining" },
      { id: 6, name: "Lisa Davis", department: "Assembly" },
    ];

    // Available machines by process type
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

    // Get machines for selected process type
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

              <div className="form-group">
                <label>Process Type *</label>
                <select
                  value={newPlan.processType}
                  onChange={(e) => {
                    setNewPlan({
                      ...newPlan,
                      processType: e.target.value,
                      assignedMachine: "", // Reset machine when process changes
                    });
                  }}
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

              {/* Assigned Operator */}
              <div className="form-group">
                <label>Assigned Operator *</label>
                <select
                  value={newPlan.assignedOperator || ""}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, assignedOperator: e.target.value })
                  }
                >
                  <option value="">Select Operator</option>
                  {availableOperators
                    .filter((op) => {
                      // Filter operators based on selected process
                      const processName = processTypes.find(
                        (p) => p.id === newPlan.processType
                      )?.name;
                      return op.department
                        .toLowerCase()
                        .includes(
                          processName?.toLowerCase().split("/")[0] || ""
                        );
                    })
                    .map((operator) => (
                      <option key={operator.id} value={operator.name}>
                        {operator.name} - {operator.department}
                      </option>
                    ))}
                </select>
              </div>

              {/* Assigned Machine */}
              <div className="form-group">
                <label>Assigned Machine *</label>
                <select
                  value={newPlan.assignedMachine || ""}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, assignedMachine: e.target.value })
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
                      {machine.status === "occupied" && " (Currently Occupied)"}
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

            {/* Machine Status Legend */}
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
                className="btn btn-secondary"
                onClick={() => setShowAddPlanForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddPlan}
                disabled={
                  !newPlan.productName ||
                  !newPlan.assignedOperator ||
                  !newPlan.assignedMachine
                }
              >
                Create Production Plan
              </button>
            </div>
          </div>
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
                All Plans
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
                className={`filter-btn ${filter === "delayed" ? "active" : ""}`}
                onClick={() => setFilter("delayed")}
              >
                Delayed
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
              {filteredPlans.map((plan) => {
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
                        <span className="detail">📦 {plan.quantity} units</span>
                      </div>
                      <div className="progress-bar-small">
                        <div
                          className="progress-fill"
                          style={{ width: `${plan.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
};

export default ProductionPlanning;
