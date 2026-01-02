// forms/Forms.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Forms.css"; // We'll create this CSS file
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/api";
const Forms = () => {
  const [activeTab, setActiveTab] = useState("available");
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateSubmissions, setTemplateSubmissions] = useState([]);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const navigate = useNavigate();

  // Fetch all available templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates`
      );

      if (response.data.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      alert("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all submissions for all templates (you might want to paginate this)
  const fetchAllSubmissions = async () => {
    setLoading(true);
    try {
      const allSubmissions = [];

      // First get all templates
      const templatesRes = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates`
      );
      if (templatesRes.data.success) {
        const templatesList = templatesRes.data.templates || [];

        // For each template, fetch its submissions
        for (const template of templatesList) {
          try {
            const subsRes = await axios.get(
              `${API_BASE_URL}/api/checksheet/templates/${template.id}/submissions`,
              { headers: getAuthHeaders() }
            );
            if (subsRes.data.success && subsRes.data.submissions) {
              subsRes.data.submissions.forEach((sub) => {
                allSubmissions.push({
                  ...sub,
                  template_name: template.name,
                  template_id: template.id,
                });
              });
            }
          } catch (err) {
            console.error(
              `Error fetching submissions for template ${template.id}:`,
              err
            );
          }
        }
      }

      setSubmissions(allSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions for a specific template
  const fetchTemplateSubmissions = async (templateId, templateName) => {
    setLoading(true);
    setSelectedTemplate({ id: templateId, name: templateName });

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates/${templateId}/submissions`
      );
      if (response.data.success) {
        setTemplateSubmissions(response.data.submissions || []);
        setShowSubmissionsModal(true);
      }
    } catch (error) {
      console.error("Error fetching template submissions:", error);
      alert("Failed to load submissions for this form");
    } finally {
      setLoading(false);
    }
  };

  // Handle form deletion
  const handleDeleteForm = async (templateId, templateName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${templateName}"? This will also delete all submissions!`
      )
    ) {
      return;
    }

    try {
      // Note: You'll need to create a DELETE endpoint in your API
      const response = await axios.delete(
        `${API_BASE_URL}/api/checksheet/templates/${templateId}`
      );

      if (response.data.success) {
        alert("Form deleted successfully");
        fetchTemplates(); // Refresh the list
        if (activeTab === "submitted") {
          fetchAllSubmissions();
        }
      }
    } catch (error) {
      console.error("Error deleting form:", error);
      alert("Failed to delete form");
    }
  };

  // Handle opening a form for filling

  const handleOpenForm = (templateId) => {
    navigate(`/dashboard/fill-form/${templateId}`);
  };

  // Handle downloading submissions as CSV
  const handleDownloadCSV = (submissionsList, templateName) => {
    if (!submissionsList || submissionsList.length === 0) {
      alert("No submissions to download");
      return;
    }

    try {
      const headers = Object.keys(submissionsList[0]).filter(
        (key) => !["id", "user_id", "submitted_at"].includes(key)
      );

      const csvContent = [
        ["Template", templateName].join(","),
        ["Downloaded", new Date().toLocaleString()].join(","),
        "", // Empty line
        ["ID", "User ID", "Submitted At", ...headers].join(","),
        ...submissionsList.map((sub) =>
          [
            sub.id,
            sub.user_id,
            new Date(sub.submitted_at).toLocaleString(),
            ...headers.map((header) => {
              const value = sub[header];
              if (value === null || value === undefined) return "";
              return typeof value === "string"
                ? `"${value.replace(/"/g, '""')}"`
                : value;
            }),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${templateName.replace(/\s+/g, "_")}_submissions_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("Failed to download submissions");
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (activeTab === "available") {
      fetchTemplates();
    } else if (activeTab === "submitted") {
      fetchAllSubmissions();
    }
  }, [activeTab]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="forms-container">
      <div className="forms-header">
        <h1>Form Management</h1>
        <p>Manage and view all forms and submissions</p>
      </div>

      {/* Tabs */}
      <div className="forms-tabs">
        <button
          className={`tab-btn ${activeTab === "available" ? "active" : ""}`}
          onClick={() => setActiveTab("available")}
        >
          📋 Available Forms ({templates.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "submitted" ? "active" : ""}`}
          onClick={() => setActiveTab("submitted")}
        >
          📄 Submitted Forms ({submissions.length})
        </button>
      </div>

      {/* Content based on active tab */}
      <div className="forms-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : activeTab === "available" ? (
          /* AVAILABLE FORMS TAB */
          <div className="available-forms">
            {templates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No Forms Available</h3>
                <p>Create forms using the Form Checksheet Builder first.</p>
                <button
                  className="primary-btn"
                  onClick={() => (window.location.href = "/excel-checksheet")}
                >
                  Go to Form Builder
                </button>
              </div>
            ) : (
              <div className="forms-grid">
                {templates.map((template) => (
                  <div key={template.id} className="form-card">
                    <div className="form-card-header">
                      <div className="form-icon">📋</div>
                      <div className="form-info">
                        <h3 className="form-name">{template.name}</h3>
                        <div className="form-meta">
                          <span className="meta-item">
                            <span className="meta-label">Created:</span>
                            <span className="meta-value">
                              {formatDate(template.created_at)}
                            </span>
                          </span>
                          <span className="meta-item">
                            <span className="meta-label">ID:</span>
                            <span className="meta-value">{template.id}</span>
                          </span>
                          {template.table_name && (
                            <span className="meta-item">
                              <span className="meta-label">Table:</span>
                              <span className="meta-value">
                                {template.table_name}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="form-card-actions">
                      <button
                        className="action-btn fill-btn"
                        onClick={() => handleOpenForm(template.id)}
                        title="Fill this form"
                      >
                        📝 Fill Form
                      </button>
                      <button
                        className="action-btn view-btn"
                        onClick={() =>
                          fetchTemplateSubmissions(template.id, template.name)
                        }
                        title="View submissions"
                      >
                        👁️ View Submissions
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() =>
                          handleDeleteForm(template.id, template.name)
                        }
                        title="Delete form"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SUBMITTED FORMS TAB */
          <div className="submitted-forms">
            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No Submissions Yet</h3>
                <p>No forms have been submitted yet.</p>
                <button
                  className="primary-btn"
                  onClick={() => setActiveTab("available")}
                >
                  View Available Forms
                </button>
              </div>
            ) : (
              <div className="submissions-table-container">
                <div className="table-actions">
                  <div className="table-info">
                    <span className="info-text">
                      Showing {submissions.length} submission
                      {submissions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    className="action-btn export-btn"
                    onClick={() => {
                      // Group submissions by template for batch download
                      const templatesMap = new Map();
                      submissions.forEach((sub) => {
                        if (!templatesMap.has(sub.template_id)) {
                          templatesMap.set(sub.template_id, {
                            name: sub.template_name,
                            submissions: [],
                          });
                        }
                        templatesMap.get(sub.template_id).submissions.push(sub);
                      });

                      // For now, just download all
                      const allSubmissionsCSV = submissions.map((sub) => ({
                        "Form Name": sub.template_name,
                        "Submission ID": sub.id,
                        "User ID": sub.user_id,
                        "Submitted At": formatDate(sub.submitted_at),
                        ...Object.fromEntries(
                          Object.entries(sub).filter(
                            ([key]) =>
                              ![
                                "id",
                                "user_id",
                                "submitted_at",
                                "template_name",
                                "template_id",
                              ].includes(key)
                          )
                        ),
                      }));

                      handleDownloadCSV(allSubmissionsCSV, "All_Forms");
                    }}
                  >
                    📥 Export All as CSV
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Form Name</th>
                        <th>User ID</th>
                        <th>Submitted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission, index) => (
                        <tr key={`${submission.id}-${index}`}>
                          <td className="cell-id">{submission.id}</td>
                          <td className="cell-form-name">
                            <span className="form-name-text">
                              {submission.template_name}
                            </span>
                            <span className="form-id">
                              ID: {submission.template_id}
                            </span>
                          </td>
                          <td className="cell-user-id">
                            User #{submission.user_id}
                          </td>
                          <td className="cell-date">
                            {formatDate(submission.submitted_at)}
                          </td>
                          <td className="cell-actions">
                            <button
                              className="table-action-btn view-btn"
                              onClick={() =>
                                fetchTemplateSubmissions(
                                  submission.template_id,
                                  submission.template_name
                                )
                              }
                              title="View all submissions for this form"
                            >
                              👁️ View All
                            </button>
                            <button
                              className="table-action-btn details-btn"
                              onClick={() => {
                                // Show submission details
                                const details = Object.entries(submission)
                                  .filter(
                                    ([key]) =>
                                      ![
                                        "id",
                                        "user_id",
                                        "submitted_at",
                                        "template_name",
                                        "template_id",
                                      ].includes(key)
                                  )
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join("\n");

                                alert(`Submission Details:\n\n${details}`);
                              }}
                              title="View submission details"
                            >
                              ℹ️ Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination can be added here if needed */}
                {submissions.length > 50 && (
                  <div className="table-pagination">
                    <button className="pagination-btn">← Previous</button>
                    <span className="pagination-info">Page 1 of 1</span>
                    <button className="pagination-btn">Next →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for viewing template submissions */}
      {showSubmissionsModal && selectedTemplate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Submissions for: {selectedTemplate.name}</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowSubmissionsModal(false);
                  setSelectedTemplate(null);
                  setTemplateSubmissions([]);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {templateSubmissions.length === 0 ? (
                <div className="empty-state modal-empty">
                  <div className="empty-icon">📭</div>
                  <h3>No Submissions Yet</h3>
                  <p>This form hasn't been submitted yet.</p>
                </div>
              ) : (
                <>
                  <div className="modal-actions">
                    <div className="modal-info">
                      <span className="info-text">
                        {templateSubmissions.length} submission
                        {templateSubmissions.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <button
                      className="action-btn export-btn"
                      onClick={() =>
                        handleDownloadCSV(
                          templateSubmissions,
                          selectedTemplate.name
                        )
                      }
                    >
                      📥 Export as CSV
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="template-submissions-table">
                      <thead>
                        <tr>
                          <th>Submission ID</th>
                          <th>User ID</th>
                          <th>Submitted At</th>
                          <th>Fields</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateSubmissions.map((submission) => (
                          <tr key={submission.id}>
                            <td className="cell-id">{submission.id}</td>
                            <td className="cell-user-id">
                              User #{submission.user_id}
                            </td>
                            <td className="cell-date">
                              {formatDate(submission.submitted_at)}
                            </td>
                            <td className="cell-fields">
                              <button
                                className="fields-btn"
                                onClick={() => {
                                  const fields = Object.entries(submission)
                                    .filter(
                                      ([key]) =>
                                        ![
                                          "id",
                                          "user_id",
                                          "submitted_at",
                                        ].includes(key)
                                    )
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join("\n");

                                  alert(`Fields Submitted:\n\n${fields}`);
                                }}
                              >
                                View{" "}
                                {
                                  Object.keys(submission).filter(
                                    (key) =>
                                      ![
                                        "id",
                                        "user_id",
                                        "submitted_at",
                                      ].includes(key)
                                  ).length
                                }{" "}
                                Fields
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowSubmissionsModal(false);
                  setSelectedTemplate(null);
                  setTemplateSubmissions([]);
                }}
              >
                Close
              </button>
              {templateSubmissions.length > 0 && (
                <button
                  className="primary-btn"
                  onClick={() =>
                    handleDownloadCSV(
                      templateSubmissions,
                      selectedTemplate.name
                    )
                  }
                >
                  Download All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forms;
