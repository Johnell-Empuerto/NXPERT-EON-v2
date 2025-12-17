import React, { useEffect, useState } from "react";
import swal from "sweetalert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserCircle,
  faPlus,
  faTimes,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import "./UserMaster.css";

const UserMaster = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    emp_id: "",
    name: "",
    age: "",
    role: "",
    department: "",
    shift: "Day",
    status: "Active",
    email: "",
    password: "",
    confirmPassword: "",
    contact_number: "",
    date_hired: "",
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/getallusermaster");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      swal("Error", "Failed to fetch users", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      swal("Error", "Passwords do not match", "error");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      swal("Error", "Password must be at least 6 characters", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      swal("Error", "You must login first", "error");
      return;
    }

    try {
      const { confirmPassword, ...payload } = formData;

      const response = await fetch(
        "http://localhost:5000/api/addtousermaster",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          throw new Error(data.error || "Failed to add user");
        }
      }

      swal("Success", "User added successfully!", "success");
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      swal("Error", err.message, "error");
    }
  };

  // EDIT FUNCTIONS
  const handleEditClick = async (user) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        swal(
          "Error",
          "No authentication token found. Please login again.",
          "error"
        );
        return;
      }

      // Fetch user details for editing
      const response = await fetch(
        `http://localhost:5000/api/editusermaster/${user.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          // Forbidden – user is not admin
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch user details");
        }
      }

      const userData = await response.json();

      setEditingUser(userData);

      // Set form data for editing
      setFormData({
        emp_id: userData.emp_id,
        name: userData.name,
        age: userData.age || "",
        role: userData.role || "",
        department: userData.department || "",
        shift: userData.shift || "Day",
        status: userData.status || "Active",
        email: userData.email,
        password: "", // Leave blank for security
        confirmPassword: "", // Leave blank for security
        contact_number: userData.contact_number || "",
        date_hired: userData.date_hired
          ? userData.date_hired.split("T")[0]
          : "",
      });

      setShowEditModal(true);
    } catch (err) {
      console.error("Edit error:", err);
      swal("Error", err.message || "Failed to load user details", "error");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // If password is provided, validate it
    if (formData.password && formData.password.length < 6) {
      swal("Error", "Password must be at least 6 characters", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      swal("Error", "Passwords do not match", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        swal(
          "Error",
          "No authentication token found. Please login again.",
          "error"
        );
        return;
      }

      // Remove confirmPassword from payload
      const { confirmPassword, ...payload } = formData;

      // If password is empty, remove it from payload (don't update password)
      if (!payload.password || payload.password.trim() === "") {
        delete payload.password;
      }

      const response = await fetch(
        `http://localhost:5000/api/editusermaster/${editingUser.user_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          // Forbidden – user is not admin
          throw new Error("You are not an admin. Contact your administrator.");
        } else {
          throw new Error(data.error || "Failed to update user");
        }
      }

      swal("Success", "User updated successfully!", "success");
      setShowEditModal(false);
      resetForm();
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      swal("Error", err.message, "error");
    }
  };

  // DELETE FUNCTION (Optional)
  const handleDeleteClick = (user) => {
    swal({
      title: "Are you sure?",
      text: `Do you want to delete ${user.name}?`,
      icon: "warning",
      buttons: ["Cancel", "Delete"],
      dangerMode: true,
    }).then(async (willDelete) => {
      if (willDelete) {
        try {
          const token = localStorage.getItem("token");

          if (!token) {
            swal(
              "Error",
              "No authentication token found. Please login again.",
              "error"
            );
            return;
          }

          const response = await fetch(
            `http://localhost:5000/api/editusermaster/${user.user_id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            swal("Success", "User deleted successfully!", "success");
            fetchUsers();
          } else if (response.status === 403) {
            // Forbidden – user is not admin
            throw new Error(
              "You are not an admin. Contact your administrator."
            );
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete user");
          }
        } catch (err) {
          console.error(err);
          swal("Error", err.message, "error");
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      emp_id: "",
      name: "",
      age: "",
      role: "",
      department: "",
      shift: "Day",
      status: "Active",
      email: "",
      password: "",
      confirmPassword: "",
      contact_number: "",
      date_hired: "",
    });
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-master-wrapper">
      {/* Header with title and add button */}
      <div className="user-master-header">
        <h2 className="table-title">User Master</h2>
        <button className="add-user-btn" onClick={() => setShowAddModal(true)}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <table className="user-master-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Age</th>
            <th>Role</th>
            <th>Department</th>
            <th>Shift</th>
            <th>Status</th>
            <th>Email</th>
            <th>Contact Number</th>
            <th>Date Hired</th>
            <th>Actions</th> {/* New column for actions */}
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user.user_id}>
                <td>
                  <div className="user-profile-cell">
                    {user.profile_image ? (
                      <img
                        src={`http://localhost:5000${user.profile_image}`}
                        alt={user.name}
                        className="user-profile-img"
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faUserCircle}
                        className="user-profile-icon"
                      />
                    )}
                  </div>
                </td>
                <td>{user.emp_id}</td>
                <td>{user.name}</td>
                <td>{user.age}</td>
                <td>{user.role}</td>
                <td>{user.department}</td>
                <td>{user.shift}</td>
                <td>
                  <span
                    className={`status-badge status-${user.status.toLowerCase()}`}
                  >
                    {user.status}
                  </span>
                </td>
                <td>{user.email}</td>
                <td>{user.contact_number}</td>
                <td>
                  {user.date_hired
                    ? new Date(user.date_hired).toLocaleDateString()
                    : ""}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(user)}
                      title="Edit User"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(user)}
                      title="Delete User"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="12" className="no-data">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button
                className="close-modal"
                onClick={() => setShowAddModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="add-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emp_id">Employee ID *</label>
                  <input
                    type="text"
                    id="emp_id"
                    name="emp_id"
                    value={formData.emp_id}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter employee ID"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="age">Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter age"
                    min="18"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter password"
                    minLength="6"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    placeholder="Confirm password"
                    minLength="6"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact_number">Contact Number</label>
                  <input
                    type="tel"
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    placeholder="Enter contact number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date_hired">Date Hired</label>
                  <input
                    type="date"
                    id="date_hired"
                    name="date_hired"
                    value={formData.date_hired}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="Enter role"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shift">Shift</label>
                  <select
                    id="shift"
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                  >
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Edit User: {editingUser.name}</h3>
              <button
                className="close-modal"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="add-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_emp_id">Employee ID *</label>
                  <input
                    type="text"
                    id="edit_emp_id"
                    name="emp_id"
                    value={formData.emp_id}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter employee ID"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit_name">Full Name *</label>
                  <input
                    type="text"
                    id="edit_name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_age">Age</label>
                  <input
                    type="number"
                    id="edit_age"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter age"
                    min="18"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit_email">Email *</label>
                  <input
                    type="email"
                    id="edit_email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_password">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    id="edit_password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit_confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="edit_confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                    minLength="6"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_contact_number">Contact Number</label>
                  <input
                    type="tel"
                    id="edit_contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit_date_hired">Date Hired</label>
                  <input
                    type="date"
                    id="edit_date_hired"
                    name="date_hired"
                    value={formData.date_hired}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_role">Role</label>
                  <input
                    type="text"
                    id="edit_role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="Enter role"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit_department">Department</label>
                  <input
                    type="text"
                    id="edit_department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit_shift">Shift</label>
                  <select
                    id="edit_shift"
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                  >
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="edit_status">Status</label>
                  <select
                    id="edit_status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMaster;
