// forms/Forms.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/api";
import "./Forms.css";

const Forms = () => {
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [selectedForms, setSelectedForms] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showMoveToModal, setShowMoveToModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const navigate = useNavigate();

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Clear previous data first
      setTemplates([]);
      setFolders([]);

      // Fetch templates with folder info
      const templatesResponse = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates`
      );

      // Fetch folders with proper tree structure
      const foldersResponse = await axios.get(
        `${API_BASE_URL}/api/checksheet/folders`
      );

      console.log("=== FRONTEND DEBUG: TEMPLATES DATA ===");
      if (templatesResponse.data.success && templatesResponse.data.templates) {
        templatesResponse.data.templates.forEach((template, index) => {
          console.log(`Template ${index}:`, {
            id: template.id,
            name: template.name,
            folder_id: template.folder_id,
            folder_name: template.folder_name,
            has_folder_id:
              template.folder_id !== null && template.folder_id !== undefined,
          });
        });
      }

      console.log("=== FRONTEND DEBUG: FOLDERS DATA ===");
      if (foldersResponse.data.success && foldersResponse.data.folders) {
        console.log("Folders:", foldersResponse.data.folders);
      }

      // Use a small delay to ensure state updates
      setTimeout(() => {
        if (templatesResponse.data.success) {
          const templatesData = templatesResponse.data.templates || [];
          console.log(`Setting templates: ${templatesData.length} items`);
          setTemplates(templatesData);
        }

        if (foldersResponse.data.success) {
          const foldersData = foldersResponse.data.folders || [];
          console.log(`Setting folders: ${foldersData.length} items`);
          setFolders(foldersData);
        }

        setLoading(false);
      }, 100);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  }, []);
  // Get forms based on current folder view
  // In Forms.jsx
  // In Forms.jsx, update the getFormsInCurrentFolder function:
  const getFormsInCurrentFolder = () => {
    console.log("=== DEBUG getFormsInCurrentFolder ===");
    console.log("Current folder ID:", currentFolder);
    console.log("Total templates:", templates.length);

    const formsInFolder = templates.filter((template) => {
      // If currentFolder is null, show forms with null folder_id
      if (currentFolder === null) {
        const isRoot =
          template.folder_id === null || template.folder_id === undefined;
        console.log(
          `Template ${template.id} (${template.name}): folder_id=${template.folder_id}, isRoot=${isRoot}`
        );
        return isRoot;
      } else {
        const isInFolder = template.folder_id === currentFolder;
        console.log(
          `Template ${template.id} (${template.name}): folder_id=${template.folder_id}, target=${currentFolder}, match=${isInFolder}`
        );
        return isInFolder;
      }
    });

    console.log("Forms in current folder:", formsInFolder.length);
    console.log(
      "Forms:",
      formsInFolder.map((f) => ({ id: f.id, name: f.name }))
    );

    return formsInFolder;
  };

  // Navigate to folder
  const navigateToFolder = (folderId) => {
    if (folderId === null) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      // Find folder in tree
      const findFolderPath = (folderList, targetId, path = []) => {
        for (const folder of folderList) {
          if (folder.id === targetId) {
            return [...path, folder];
          }
          if (folder.children && folder.children.length > 0) {
            const found = findFolderPath(folder.children, targetId, [
              ...path,
              folder,
            ]);
            if (found) return found;
          }
        }
        return null;
      };

      const newPath = findFolderPath(folders, folderId);
      if (newPath) {
        setCurrentFolder(folderId);
        setFolderPath(newPath);
      }
    }
    setSelectedForms([]);
  };

  // Get subfolders of current folder
  const getSubfolders = () => {
    if (!currentFolder) {
      // Root folders
      return folders.filter((folder) => !folder.parent_id);
    }

    // Find current folder and get its children
    const findFolder = (folderList, targetId) => {
      for (const folder of folderList) {
        if (folder.id === targetId) {
          return folder;
        }
        if (folder.children && folder.children.length > 0) {
          const found = findFolder(folder.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const current = findFolder(folders, currentFolder);
    return current ? current.children || [] : [];
  };

  // Filter and sort templates
  const filteredTemplates = getFormsInCurrentFolder()
    .filter((template) => {
      if (!searchTerm) return true;
      return (
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.table_name &&
          template.table_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        template.id.toString().includes(searchTerm) ||
        (template.folder_name &&
          template.folder_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .sort((a, b) => {
      if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortConfig.key === "created_at") {
        return sortConfig.direction === "asc"
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

  // Calculate stats - UPDATED VERSION
  const totalForms = templates.length;
  const totalFolders = folders.length;
  const formsInRoot = templates.filter(
    (form) => form.folder_id === null || form.folder_id === undefined
  ).length;
  const formsInCurrentFolder =
    currentFolder === null
      ? formsInRoot // Show only root forms when in root
      : templates.filter((form) => form.folder_id === currentFolder).length;

  const subfolders = getSubfolders();

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle form deletion
  const handleDeleteForm = async (templateId, templateName) => {
    setFormToDelete({ id: templateId, name: templateName });
    setShowDeleteModal(true);
  };

  const confirmDeleteForm = async () => {
    if (!formToDelete) return;

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/checksheet/templates/${formToDelete.id}`
      );

      if (response.data.success) {
        alert("Form deleted successfully");
        fetchData(); // Refresh all data
        setShowDeleteModal(false);
        setFormToDelete(null);
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

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Handle selection
  const handleSelectForm = (templateId) => {
    setSelectedForms((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedForms.length === filteredTemplates.length) {
      setSelectedForms([]);
    } else {
      setSelectedForms(filteredTemplates.map((t) => t.id));
    }
  };

  // Bulk delete forms
  const handleBulkDelete = async () => {
    if (selectedForms.length === 0) {
      alert("Please select forms to delete");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedForms.length} form(s)?`
      )
    ) {
      try {
        const deletePromises = selectedForms.map((id) =>
          axios.delete(`${API_BASE_URL}/api/checksheet/templates/${id}`)
        );

        await Promise.all(deletePromises);
        alert(`${selectedForms.length} form(s) deleted successfully`);
        setSelectedForms([]);
        fetchData();
      } catch (error) {
        console.error("Error deleting forms:", error);
        alert("Failed to delete some forms");
      }
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/checksheet/folders`,
        {
          name: newFolderName,
          parent_id: currentFolder,
          user_id: 1, // Replace with actual user ID from auth
        }
      );

      if (response.data.success) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        fetchData();
        alert("Folder created successfully");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      alert(error.response?.data?.message || "Failed to create folder");
    }
  };

  // Move forms to folder// After moving forms, ensure a complete refresh
  const handleMoveToFolder = async (folderId) => {
    if (selectedForms.length === 0) {
      alert("Please select forms to move");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/checksheet/forms/move`,
        {
          formIds: selectedForms,
          folderId: folderId,
        }
      );

      if (response.data.success) {
        alert(`${response.data.movedCount} form(s) moved successfully`);

        // Clear selection and refresh
        setSelectedForms([]);
        setShowMoveToModal(false);

        // Force a complete refresh
        await fetchData();

        // If moving to a specific folder, navigate to it
        if (folderId !== null && folderId !== undefined) {
          navigateToFolder(folderId);
        } else {
          navigateToFolder(null); // Navigate to root
        }
      }
    } catch (error) {
      console.error("Error moving forms:", error);
      alert(error.response?.data?.message || "Failed to move forms");
    }
  };

  // Rename folder
  const handleRenameFolder = async () => {
    if (!renameFolderName.trim() || !folderToRename) {
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/checksheet/folders/${folderToRename.id}`,
        {
          name: renameFolderName,
        }
      );

      if (response.data.success) {
        setShowRenameModal(false);
        setFolderToRename(null);
        setRenameFolderName("");
        fetchData();
        alert("Folder renamed successfully");
      }
    } catch (error) {
      console.error("Error renaming folder:", error);
      alert(error.response?.data?.message || "Failed to rename folder");
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId, folderName) => {
    if (
      window.confirm(`Are you sure you want to delete folder "${folderName}"?`)
    ) {
      try {
        const response = await axios.delete(
          `${API_BASE_URL}/api/checksheet/folders/${folderId}`
        );

        if (response.data.success) {
          // If we're in this folder, navigate to parent
          if (currentFolder === folderId) {
            navigateToFolder(
              folderPath.length > 1
                ? folderPath[folderPath.length - 2].id
                : null
            );
          }
          fetchData();
          alert("Folder deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting folder:", error);
        alert(error.response?.data?.message || "Failed to delete folder");
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get icon
  const getFileIcon = (template) => {
    const name = template.name.toLowerCase();
    if (name.includes("check") || name.includes("inspection")) return "📋";
    if (name.includes("report")) return "📊";
    if (name.includes("survey") || name.includes("form")) return "📝";
    if (name.includes("application")) return "📄";
    if (name.includes("sheet") || name.includes("template")) return "📋";
    // Default to form/document icon instead of folder
    return "📄";
  };

  return (
    <div className="forms-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Forms Manager</h1>
          <div className="breadcrumb">
            <button
              className="breadcrumb-item"
              onClick={() => navigateToFolder(null)}
              style={{
                fontWeight: currentFolder === null ? "bold" : "normal",
                color: currentFolder === null ? "#007aff" : "#666",
              }}
            >
              Root
            </button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span className="breadcrumb-separator">›</span>
                <button
                  className="breadcrumb-item"
                  onClick={() => navigateToFolder(folder.id)}
                  style={{
                    fontWeight: currentFolder === folder.id ? "bold" : "normal",
                    color: currentFolder === folder.id ? "#007aff" : "#666",
                  }}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={() => (window.location.href = "/excel-checksheet")}
          >
            <span className="icon">+</span> Create New Form
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{totalForms}</h3>
            <p>Total Forms</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <h3>{totalFolders}</h3>
            <p>Total Folders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <h3>{formsInCurrentFolder}</h3>
            <p>
              {currentFolder === null
                ? "Forms in Root"
                : "Forms in Current Folder"}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search forms by name, ID, or folder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="selection-info">
            {selectedForms.length > 0 && (
              <span>{selectedForms.length} form(s) selected</span>
            )}
          </div>
          <div className="action-buttons">
            {selectedForms.length > 0 && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowMoveToModal(true)}
                >
                  📂 Move To...
                </button>
                <button className="btn btn-danger" onClick={handleBulkDelete}>
                  🗑️ Delete Selected
                </button>
              </>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowNewFolderModal(true)}
            >
              + New Folder
            </button>
            <button className="btn btn-secondary" onClick={() => fetchData()}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-area">
        {/* File Manager View */}
        <div className="file-manager">
          {/* Folders Section */}
          {subfolders.length > 0 && (
            <div className="folders-section">
              <h3 className="section-title">Folders</h3>
              <div className="folders-grid">
                {subfolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="folder-item"
                    onClick={() => navigateToFolder(folder.id)}
                    onDoubleClick={() => navigateToFolder(folder.id)}
                  >
                    <div className="folder-icon">📁</div>
                    <div className="folder-info">
                      <h4 className="folder-name">{folder.name}</h4>
                      <p className="folder-details">
                        {folder.itemCount} item
                        {folder.itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="folder-actions">
                      <button
                        className="folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToRename(folder);
                          setRenameFolderName(folder.name);
                          setShowRenameModal(true);
                        }}
                        title="Rename folder"
                      >
                        ✏️
                      </button>
                      <button
                        className="folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id, folder.name);
                        }}
                        title="Delete folder"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="table-header">
            <div className="header-cell checkbox-cell">
              <input
                type="checkbox"
                checked={
                  selectedForms.length === filteredTemplates.length &&
                  filteredTemplates.length > 0
                }
                onChange={handleSelectAll}
                className="checkbox"
              />
            </div>
            <div
              className={`header-cell name-cell ${
                sortConfig.key === "name" ? "sorting" : ""
              }`}
              onClick={() => handleSort("name")}
            >
              Name
              {sortConfig.key === "name" && (
                <span className="sort-icon">
                  {sortConfig.direction === "asc" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <div className="header-cell id-cell">ID</div>
            <div className="header-cell folder-cell">Folder</div>
            <div
              className={`header-cell date-cell ${
                sortConfig.key === "created_at" ? "sorting" : ""
              }`}
              onClick={() => handleSort("created_at")}
            >
              Created
              {sortConfig.key === "created_at" && (
                <span className="sort-icon">
                  {sortConfig.direction === "asc" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <div className="header-cell actions-cell">Actions</div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading forms and folders...</p>
            </div>
          ) : filteredTemplates.length === 0 && subfolders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {currentFolder ? "📁" : searchTerm ? "🔍" : "📋"}
              </div>
              <h3>
                {currentFolder
                  ? "This folder is empty"
                  : searchTerm
                  ? "No forms match your search"
                  : "No Forms in Root"}
              </h3>
              <p>
                {searchTerm
                  ? "Try a different search term or clear the search."
                  : currentFolder
                  ? "Add forms to this folder or create subfolders."
                  : "All forms are organized into folders. Check the folders section above or create a new form here."}
              </p>
              <div className="empty-state-actions">
                {!searchTerm && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        (window.location.href = "/excel-checksheet")
                      }
                    >
                      Create New Form in Root
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowNewFolderModal(true)}
                    >
                      Create New Folder
                    </button>
                  </>
                )}
                {searchTerm && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </button>
                )}
                {folders.length > 0 && !searchTerm && !currentFolder && (
                  <p
                    className="folder-hint"
                    style={{
                      marginTop: "10px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    Or browse forms in your folders ↑
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Files List */}
              <div className="files-list">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`file-row ${
                      selectedForms.includes(template.id) ? "selected" : ""
                    }`}
                    onDoubleClick={() => handleOpenForm(template.id)}
                  >
                    <div className="file-cell checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedForms.includes(template.id)}
                        onChange={() => handleSelectForm(template.id)}
                        className="checkbox"
                      />
                    </div>
                    <div className="file-cell name-cell">
                      <div className="file-info">
                        <span className="file-icon">
                          {getFileIcon(template)}
                        </span>
                        <div className="file-details">
                          <h4 className="file-name">{template.name}</h4>
                          <p className="file-description">
                            {template.description || "No description available"}
                            {template.folder_name && (
                              <span className="folder-info">
                                {" "}
                                • In folder: {template.folder_name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="file-cell id-cell">
                      <span className="file-id">#{template.id}</span>
                    </div>
                    <div className="file-cell folder-cell">
                      <span className="file-folder">
                        {template.folder_name || "Root"}
                      </span>
                    </div>
                    <div className="file-cell date-cell">
                      <span className="file-date">
                        {formatDate(template.created_at)}
                      </span>
                    </div>
                    <div className="file-cell actions-cell">
                      <div className="file-actions">
                        <button
                          className="action-btn fill-btn"
                          onClick={() => handleOpenForm(template.id)}
                          title="Fill this form"
                        >
                          📝 Fill
                        </button>
                        <button
                          className="action-btn preview-btn"
                          onClick={() => {
                            setFormToDelete(template);
                            setShowPreviewModal(true);
                          }}
                          title="Preview form"
                        >
                          👁️ Preview
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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && formToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Form</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowDeleteModal(false);
                  setFormToDelete(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>
                Are you sure you want to delete{" "}
                <strong>"{formToDelete.name}"</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone. All submissions for this form will
                also be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setFormToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteForm}>
                Delete Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Folder</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folderName">Folder Name</label>
                <input
                  type="text"
                  id="folderName"
                  className="form-input"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                  }}
                />
                <p className="form-help">
                  {currentFolder
                    ? `Folder will be created inside "${
                        folderPath[folderPath.length - 1]?.name || "Root"
                      }"`
                    : "Folder will be created in the root directory"}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateFolder}>
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move To Modal */}
      {showMoveToModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Move {selectedForms.length} Form(s) To...</h3>
              <button
                className="modal-close"
                onClick={() => setShowMoveToModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="move-to-options">
                <button
                  className="folder-option"
                  onClick={() => handleMoveToFolder(null)}
                >
                  <div className="folder-option-icon">📁</div>
                  <div className="folder-option-info">
                    <h4>Root Directory</h4>
                    <p>Move forms out of any folder</p>
                  </div>
                </button>

                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className="folder-option"
                    onClick={() => handleMoveToFolder(folder.id)}
                  >
                    <div className="folder-option-icon">📁</div>
                    <div className="folder-option-info">
                      <h4>{folder.name}</h4>
                      <p>{folder.itemCount} items</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowMoveToModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameModal && folderToRename && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Rename Folder</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRenameModal(false);
                  setFolderToRename(null);
                  setRenameFolderName("");
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="renameFolderName">Folder Name</label>
                <input
                  type="text"
                  id="renameFolderName"
                  className="form-input"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  placeholder="Enter new folder name"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleRenameFolder();
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowRenameModal(false);
                  setFolderToRename(null);
                  setRenameFolderName("");
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRenameFolder}>
                Rename Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && formToDelete && (
        <div className="modal-overlay">
          <div className="modal preview-modal">
            <div className="modal-header">
              <h3>Form Preview: {formToDelete.name}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowPreviewModal(false);
                  setFormToDelete(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-content">
                <div className="preview-info">
                  <div className="info-row">
                    <span className="info-label">Form ID:</span>
                    <span className="info-value">#{formToDelete.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Created:</span>
                    <span className="info-value">
                      {formatDate(formToDelete.created_at)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Database Table:</span>
                    <span className="info-value">
                      {formToDelete.table_name || "N/A"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Folder:</span>
                    <span className="info-value">
                      {formToDelete.folder_name || "Root"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Fields:</span>
                    <span className="info-value">
                      {formToDelete.fields_count ||
                        formToDelete.fields?.length ||
                        0}{" "}
                      fields
                    </span>
                  </div>
                  {formToDelete.description && (
                    <div className="info-row">
                      <span className="info-label">Description:</span>
                      <span className="info-value">
                        {formToDelete.description}
                      </span>
                    </div>
                  )}
                </div>
                <div className="preview-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleOpenForm(formToDelete.id);
                      setShowPreviewModal(false);
                    }}
                  >
                    📝 Fill This Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forms;
