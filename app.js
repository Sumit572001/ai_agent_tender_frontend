/**
 * TenderAI - Intelligent Tender PDF Analysis & 100-Point Checklist Frontend
 */

const API_BASE = (window.location.hostname && window.location.hostname !== "")
  ? `http://${window.location.hostname}:8000/api`
  : "http://127.0.0.1:8000/api";

// App State
const state = {
  activeTab: "folders-tab",
  folders: [],
  currentFolder: null,
  criteria: [],
  criteriaCategoryFilter: "All",
  criteriaSearchQuery: "",
  activeAnalysis: null,
  resultsFilter: "all",
  resultsSearchQuery: "",
  history: [],
  systemStatus: null
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  initLucideIcons();
  setupNavigation();
  setupFolderEvents();
  setupCriteriaEvents();
  setupResultsEvents();
  setupHistoryEvents();
  setupSettingsEvents();
  setupModals();

  // Load initial data
  await loadSystemStatus();
  await loadFolders();
  await loadCriteria();
  await loadHistory();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ----------------- TOAST NOTIFICATIONS -----------------

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconName = "info";
  if (type === "success") iconName = "check-circle-2";
  if (type === "error") iconName = "alert-triangle";

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  initLucideIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 250ms ease";
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----------------- NAVIGATION -----------------

function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  document.getElementById("btn-goto-folders")?.addEventListener("click", () => {
    switchTab("folders-tab");
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  initLucideIcons();
}

// ----------------- SYSTEM STATUS & KEYS -----------------

async function loadSystemStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (res.ok) {
      const data = await res.json();
      state.systemStatus = data;
      renderKeyStatusPill(data.keys);
    }
  } catch (err) {
    console.warn("Backend not yet reachable:", err);
  }
}

function renderKeyStatusPill(keys = []) {
  const pill = document.getElementById("header-keys-pill");
  if (!pill) return;
  const count = keys.length || 3;
  pill.innerHTML = `
    <span class="status-dot online"></span>
    <span class="status-label">${count} AI Keys Active</span>
  `;
}

// ----------------- FOLDERS MANAGEMENT -----------------

async function loadFolders() {
  try {
    const res = await fetch(`${API_BASE}/folders`);
    if (res.ok) {
      state.folders = await res.json();
      renderFoldersList();
      updateFolderStats();
    }
  } catch (err) {
    console.error("Error loading folders:", err);
  }
}

function updateFolderStats() {
  const foldersEl = document.getElementById("stat-total-folders");
  if (foldersEl) foldersEl.textContent = state.folders.length;

  const navFolderEl = document.getElementById("nav-folder-count");
  if (navFolderEl) navFolderEl.textContent = state.folders.length;

  const totalPdfs = state.folders.reduce((acc, f) => acc + (f.file_count || 0), 0);
  const pdfsEl = document.getElementById("stat-total-pdfs");
  if (pdfsEl) pdfsEl.textContent = totalPdfs;
}

function renderFoldersList() {
  const container = document.getElementById("folders-container");
  const emptyState = document.getElementById("folders-empty-state");

  if (!state.folders.length) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  container.innerHTML = state.folders.map(f => {
    const dateStr = f.created_at ? f.created_at.slice(0, 10) : "Recent";
    const fileCount = f.file_count || 0;
    return `
      <div class="folder-card" data-folder-id="${f.id}">
        <div>
          <div class="folder-card-top">
            <div class="folder-card-icon">
              <i data-lucide="folder"></i>
            </div>
            <div class="folder-card-actions">
              <button class="folder-btn-delete" data-delete-id="${f.id}" title="Delete Folder">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
          <h3 class="folder-card-title">${escapeHtml(f.name)}</h3>
          ${f.department ? `<div class="folder-card-dept">${escapeHtml(f.department)}</div>` : ''}
          <p class="folder-card-desc">${escapeHtml(f.description || "Tender project folder for PDF documents.")}</p>
        </div>
        <div class="folder-card-footer">
          <span class="folder-pdf-badge"><i data-lucide="file-text"></i> ${fileCount} PDF${fileCount === 1 ? '' : 's'}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join("");

  // Attach card click handlers
  container.querySelectorAll(".folder-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".folder-btn-delete")) return;
      const fId = card.getAttribute("data-folder-id");
      openFolder(fId);
    });
  });

  // Attach delete button handlers
  container.querySelectorAll(".folder-btn-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const fId = btn.getAttribute("data-delete-id");
      if (confirm("Are you sure you want to delete this folder and its uploaded files?")) {
        await deleteFolder(fId);
      }
    });
  });

  initLucideIcons();
}

async function openFolder(folderId) {
  try {
    const res = await fetch(`${API_BASE}/folders/${folderId}`);
    if (res.ok) {
      state.currentFolder = await res.json();
      renderCurrentFolderView();
    }
  } catch (err) {
    showToast("Failed to open folder", "error");
  }
}

function renderCurrentFolderView() {
  const gridView = document.getElementById("folders-grid-view");
  const insideView = document.getElementById("folder-inside-view");
  const f = state.currentFolder;
  if (!f) return;

  gridView.classList.add("hidden");
  insideView.classList.remove("hidden");

  document.getElementById("current-folder-name").textContent = f.name;
  document.getElementById("current-folder-desc").textContent = f.department ? `${f.department} • ${f.description || ''}` : (f.description || 'Tender Workspace');
  document.getElementById("current-folder-date").textContent = f.created_at ? f.created_at.slice(0, 10) : 'Recent';
  document.getElementById("current-folder-pdf-count").textContent = f.file_count || 0;
  document.getElementById("files-list-count").textContent = f.file_count || 0;

  renderUploadedFilesTable(f.file_details || []);
  initLucideIcons();
}

function renderUploadedFilesTable(files = []) {
  const tbody = document.getElementById("uploaded-files-tbody");
  const noFiles = document.getElementById("no-files-in-folder");

  if (!files.length) {
    tbody.innerHTML = "";
    noFiles.classList.remove("hidden");
    return;
  }

  noFiles.classList.add("hidden");
  tbody.innerHTML = files.map((file, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="file-text" style="color:var(--cyan); width:18px; height:18px;"></i>
          <strong>${escapeHtml(file.name)}</strong>
        </div>
      </td>
      <td>${file.size_mb || '< 1'} MB</td>
      <td><span class="meta-chip highlight" style="font-size:11px;">Ready for Audit</span></td>
      <td style="text-align: right;">
        <button class="btn btn-danger-ghost btn-sm" data-delete-file="${escapeHtml(file.name)}" title="Remove PDF">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-delete-file]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const filename = btn.getAttribute("data-delete-file");
      if (confirm(`Remove "${filename}" from this folder?`)) {
        await deleteFileFromCurrentFolder(filename);
      }
    });
  });

  initLucideIcons();
}

async function deleteFolder(folderId) {
  try {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Folder deleted successfully", "success");
      await loadFolders();
    }
  } catch (err) {
    showToast("Error deleting folder", "error");
  }
}

async function deleteFileFromCurrentFolder(filename) {
  if (!state.currentFolder) return;
  try {
    const res = await fetch(`${API_BASE}/folders/${state.currentFolder.id}/files/${encodeURIComponent(filename)}`, { method: "DELETE" });
    if (res.ok) {
      showToast(`Removed ${filename}`, "info");
      await openFolder(state.currentFolder.id);
      await loadFolders();
    }
  } catch (err) {
    showToast("Failed to remove file", "error");
  }
}

function setupFolderEvents() {
  document.getElementById("btn-back-to-folders")?.addEventListener("click", () => {
    document.getElementById("folder-inside-view").classList.add("hidden");
    document.getElementById("folders-grid-view").classList.remove("hidden");
    state.currentFolder = null;
    loadFolders();
  });

  document.getElementById("btn-delete-current-folder")?.addEventListener("click", async () => {
    if (!state.currentFolder) return;
    if (confirm(`Delete folder "${state.currentFolder.name}" and all its uploaded files?`)) {
      await deleteFolder(state.currentFolder.id);
      document.getElementById("btn-back-to-folders").click();
    }
  });

  // Dropzone setup
  const dropzone = document.getElementById("pdf-dropzone");
  const fileInput = document.getElementById("pdf-file-input");
  const browseBtn = document.getElementById("btn-browse-files");

  browseBtn?.addEventListener("click", () => fileInput.click());
  dropzone?.addEventListener("click", (e) => {
    if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput?.addEventListener("change", async (e) => {
    if (e.target.files.length) {
      await uploadFiles(e.target.files);
      fileInput.value = "";
    }
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });

  dropzone?.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) {
      await uploadFiles(e.dataTransfer.files);
    }
  });

  // Create folder modal trigger
  document.getElementById("btn-create-folder-modal")?.addEventListener("click", () => {
    openModal("modal-create-folder");
  });
  document.getElementById("btn-create-folder-empty")?.addEventListener("click", () => {
    openModal("modal-create-folder");
  });

  // Form create folder submit logic
  async function handleCreateFolderSubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nameInput = document.getElementById("folder-name-input");
    const descInput = document.getElementById("folder-desc-input");
    const submitBtn = document.getElementById("btn-submit-create-folder");
    const name = nameInput ? nameInput.value.trim() : "";
    const desc = descInput ? descInput.value.trim() : "";

    if (!name) {
      showToast("Please enter a folder name", "error");
      if (nameInput) nameInput.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Creating...</span>`;
    }

    try {
      const res = await fetch(`${API_BASE}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, department: "", description: desc })
      });
      if (res.ok) {
        const newFolder = await res.json();
        closeModal("modal-create-folder");
        if (nameInput) nameInput.value = "";
        if (descInput) descInput.value = "";
        showToast(`Created folder "${name}"`, "success");
        await loadFolders();
        if (newFolder && newFolder.id) {
          await openFolder(newFolder.id);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.detail || "Failed to create folder", "error");
      }
    } catch (err) {
      console.error("Create folder error:", err);
      showToast("Error creating folder: " + (err.message || err), "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="plus"></i> <span>Create Folder</span>`;
        initLucideIcons();
      }
    }
  }

  document.getElementById("form-create-folder")?.addEventListener("submit", handleCreateFolderSubmit);
  document.getElementById("btn-submit-create-folder")?.addEventListener("click", (e) => {
    // If form validation passes or directly clicked
    const form = document.getElementById("form-create-folder");
    if (form && form.checkValidity()) {
      handleCreateFolderSubmit(e);
    }
  });

  // Start analysis button inside folder
  document.getElementById("btn-start-folder-analysis")?.addEventListener("click", () => {
    if (!state.currentFolder) return;
    if (!state.currentFolder.file_count) {
      showToast("Please upload at least one tender PDF document first!", "error");
      return;
    }
    startAnalysisForFolder(state.currentFolder.id);
  });
}

function jsonBody(obj) {
  return JSON.stringify(obj);
}

const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB Limit

async function uploadFiles(fileList) {
  if (!state.currentFolder) return;
  const formData = new FormData();
  let validCount = 0;
  const oversizedFiles = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (file.name.toLowerCase().endsWith(".pdf")) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push({
          name: file.name,
          sizeMb: (file.size / (1024 * 1024)).toFixed(1)
        });
      } else {
        formData.append("files", file);
        validCount++;
      }
    }
  }

  // Trigger 60 MB Limit Popup if any file exceeds 60 MB
  if (oversizedFiles.length > 0) {
    const listContainer = document.getElementById("oversized-files-list");
    if (listContainer) {
      listContainer.innerHTML = oversizedFiles.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
          <div style="display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;">
            <i data-lucide="file-x" style="color:#EF4444; width:16px; height:16px; flex-shrink:0;"></i>
            <span style="color:#FFFFFF; font-weight:600;">${escapeHtml(f.name)}</span>
          </div>
          <span style="color:#EF4444; font-weight:bold; font-family:monospace;">${f.sizeMb} MB <span style="font-size:11px; color:#94A3B8;">(Max: 60MB)</span></span>
        </div>
      `).join("");
      initLucideIcons();
    }
    openModal("modal-filesize-error");
  }

  if (!validCount) {
    if (oversizedFiles.length === 0) {
      showToast("Please select valid PDF files (.pdf)", "error");
    }
    return;
  }

  showToast(`Uploading ${validCount} valid PDF file(s)...`, "info");

  try {
    const res = await fetch(`${API_BASE}/folders/${state.currentFolder.id}/upload`, {
      method: "POST",
      body: formData
    });
    if (res.ok) {
      showToast(`Uploaded ${validCount} PDF(s) successfully!`, "success");
      await openFolder(state.currentFolder.id);
      await loadFolders();
    } else {
      const err = await res.json();
      showToast(err.detail || "Upload failed", "error");
    }
  } catch (err) {
    showToast("Network error during upload", "error");
  }
}

// ----------------- CRITERIA (100+ POINTS) MANAGEMENT -----------------

async function loadCriteria() {
  try {
    const res = await fetch(`${API_BASE}/criteria`);
    if (res.ok) {
      state.criteria = await res.json();
      renderCriteriaCategories();
      renderCriteriaTable();
      updateCriteriaCounters();
    }
  } catch (err) {
    console.error("Error loading criteria:", err);
  }
}

function updateCriteriaCounters() {
  const count = state.criteria.length;
  const activeCount = state.criteria.filter(c => c.active).length;
  const navCriteriaEl = document.getElementById("nav-criteria-count");
  if (navCriteriaEl) navCriteriaEl.textContent = count;
  const statActivePointsEl = document.getElementById("stat-active-points");
  if (statActivePointsEl) statActivePointsEl.textContent = activeCount;
  const folderBadgeEl = document.getElementById("folder-action-points-badge");
  if (folderBadgeEl) folderBadgeEl.textContent = `${activeCount} Points`;
}

function renderCriteriaCategories() {
  const categories = ["All", ...new Set(state.criteria.map(c => c.category || "General"))];
  const container = document.getElementById("category-pills");
  if (!container) return;

  container.innerHTML = categories.map(cat => {
    const count = cat === "All" ? state.criteria.length : state.criteria.filter(c => c.category === cat).length;
    const isActive = (state.criteriaCategoryFilter === cat);
    return `
      <button class="cat-pill ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat)}">
        ${escapeHtml(cat)} (${count})
      </button>
    `;
  }).join("");

  container.querySelectorAll(".cat-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      state.criteriaCategoryFilter = pill.getAttribute("data-category");
      renderCriteriaCategories();
      renderCriteriaTable();
    });
  });
}

function renderCriteriaTable() {
  const tbody = document.getElementById("criteria-tbody");
  if (!tbody) return;

  const query = state.criteriaSearchQuery.toLowerCase().trim();
  const catFilter = state.criteriaCategoryFilter;

  const filtered = state.criteria.filter(c => {
    const matchesCat = (catFilter === "All" || c.category === catFilter);
    const matchesQuery = !query || 
      (c.question && c.question.toLowerCase().includes(query)) ||
      (c.description && c.description.toLowerCase().includes(query)) ||
      (c.category && c.category.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  document.getElementById("criteria-showing-count").textContent = filtered.length;

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
          No criteria questions matching your search or category filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((c, idx) => `
    <tr>
      <td style="color:var(--text-muted); font-weight:600;">${idx + 1}</td>
      <td><span class="badge-cat">${escapeHtml(c.category || 'General')}</span></td>
      <td><strong>${escapeHtml(c.question)}</strong></td>
      <td style="color:var(--text-secondary); font-size:12px;">${escapeHtml(c.description || '-')}</td>
      <td style="text-align: center;">
        <label class="switch">
          <input type="checkbox" data-toggle-crit="${c.id}" ${c.active ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-ghost btn-sm" data-edit-crit="${c.id}" title="Edit Question">
          <i data-lucide="edit-2"></i>
        </button>
        <button class="btn btn-danger-ghost btn-sm" data-delete-crit="${c.id}" title="Delete Question">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    </tr>
  `).join("");

  // Toggle active switch handler
  tbody.querySelectorAll("[data-toggle-crit]").forEach(input => {
    input.addEventListener("change", async () => {
      const critId = input.getAttribute("data-toggle-crit");
      const active = input.checked;
      await updateCriterion(critId, { active });
    });
  });

  // Edit handler
  tbody.querySelectorAll("[data-edit-crit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const critId = btn.getAttribute("data-edit-crit");
      const item = state.criteria.find(c => c.id === critId);
      if (item) {
        document.getElementById("modal-criterion-title").textContent = "Edit Checklist Point";
        document.getElementById("edit-criterion-id").value = item.id;
        document.getElementById("crit-category-input").value = item.category || "General & Authority";
        document.getElementById("crit-question-input").value = item.question;
        document.getElementById("crit-desc-input").value = item.description || "";
        openModal("modal-add-criterion");
      }
    });
  });

  // Delete handler
  tbody.querySelectorAll("[data-delete-crit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const critId = btn.getAttribute("data-delete-crit");
      if (confirm("Delete this criteria question?")) {
        await deleteCriterion(critId);
      }
    });
  });

  initLucideIcons();
}

async function updateCriterion(critId, patch) {
  try {
    const res = await fetch(`${API_BASE}/criteria/${critId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: jsonBody(patch)
    });
    if (res.ok) {
      await loadCriteria();
    }
  } catch (err) {
    showToast("Failed to update criterion", "error");
  }
}

async function deleteCriterion(critId) {
  try {
    const res = await fetch(`${API_BASE}/criteria/${critId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Question deleted", "info");
      await loadCriteria();
    }
  } catch (err) {
    showToast("Failed to delete question", "error");
  }
}

function setupCriteriaEvents() {
  const searchInput = document.getElementById("criteria-search-input");
  const clearBtn = document.getElementById("criteria-search-clear");

  searchInput?.addEventListener("input", (e) => {
    state.criteriaSearchQuery = e.target.value;
    clearBtn.classList.toggle("hidden", !e.target.value);
    renderCriteriaTable();
  });

  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    state.criteriaSearchQuery = "";
    clearBtn.classList.add("hidden");
    renderCriteriaTable();
  });

  // Add Point Modal trigger
  document.getElementById("btn-open-add-criterion")?.addEventListener("click", () => {
    document.getElementById("modal-criterion-title").textContent = "Add Custom Checklist Point";
    document.getElementById("edit-criterion-id").value = "";
    document.getElementById("form-criterion").reset();
    openModal("modal-add-criterion");
  });

  // Form Criterion Save
  document.getElementById("form-criterion")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-criterion-id").value;
    const category = document.getElementById("crit-category-input").value;
    const question = document.getElementById("crit-question-input").value.trim();
    const description = document.getElementById("crit-desc-input").value.trim();

    if (!question) return;

    try {
      if (editId) {
        await updateCriterion(editId, { category, question, description });
        showToast("Checklist point updated!", "success");
      } else {
        const res = await fetch(`${API_BASE}/criteria`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonBody({ category, question, description, active: true })
        });
        if (res.ok) {
          showToast("Added custom checklist point!", "success");
          await loadCriteria();
        }
      }
      closeModal("modal-add-criterion");
    } catch (err) {
      showToast("Failed to save checklist point", "error");
    }
  });

  // Bulk Import Trigger
  document.getElementById("btn-open-bulk-import")?.addEventListener("click", () => {
    openModal("modal-bulk-import");
  });

  document.getElementById("form-bulk-import")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cat = document.getElementById("bulk-category-input").value.trim() || "Custom Checklist";
    const rawText = document.getElementById("bulk-text-input").value;
    const questions = rawText.split("\n").map(q => q.trim()).filter(q => q.length > 0);

    if (!questions.length) {
      showToast("Please enter at least one question", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/criteria/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({ category: cat, questions })
      });
      if (res.ok) {
        showToast(`Imported ${questions.length} questions successfully!`, "success");
        closeModal("modal-bulk-import");
        document.getElementById("form-bulk-import").reset();
        await loadCriteria();
      }
    } catch (err) {
      showToast("Error importing bulk questions", "error");
    }
  });

  // Reset Default 63 Points
  document.getElementById("btn-reset-default-criteria")?.addEventListener("click", async () => {
    if (confirm("Reset checklist to original default 63 tender points?")) {
      try {
        const res = await fetch(`${API_BASE}/criteria/reset`, { method: "POST" });
        if (res.ok) {
          showToast("Reset to default 63 tender points", "success");
          await loadCriteria();
        }
      } catch (err) {
        showToast("Error resetting criteria", "error");
      }
    }
  });

  // Enable/Disable All
  document.getElementById("btn-enable-all-criteria")?.addEventListener("click", async () => {
    for (const c of state.criteria) {
      c.active = true;
    }
    renderCriteriaTable();
    updateCriteriaCounters();
  });

  document.getElementById("btn-disable-all-criteria")?.addEventListener("click", async () => {
    for (const c of state.criteria) {
      c.active = false;
    }
    renderCriteriaTable();
    updateCriteriaCounters();
  });
}

// ----------------- ANALYSIS & LIVE SSE HUD -----------------

async function startAnalysisForFolder(folderId) {
  switchTab("analysis-tab");

  const runningView = document.getElementById("analysis-running-view");
  const idleView = document.getElementById("analysis-idle-view");
  const resultsView = document.getElementById("analysis-results-view");

  idleView.classList.add("hidden");
  resultsView.classList.add("hidden");
  runningView.classList.remove("hidden");

  const fill = document.getElementById("hud-progress-fill");
  const pct = document.getElementById("hud-progress-pct");
  const statusMsg = document.getElementById("hud-status-message");
  const batchStatus = document.getElementById("hud-batch-status");
  const currentCat = document.getElementById("hud-current-cat");
  const currentText = document.getElementById("hud-current-text");

  fill.style.width = "5%";
  pct.textContent = "5%";
  statusMsg.textContent = "Connecting to Gemini Multi-Key Analysis Engine...";

  // Connect to SSE Stream
  try {
    const eventSource = new EventSource(`${API_BASE}/analyze/${folderId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.stage === "extracting") {
          statusMsg.textContent = data.message;
          fill.style.width = "15%";
          pct.textContent = "15%";
          batchStatus.textContent = "Extracting text from folder PDFs...";
        } else if (data.stage === "extraction_complete") {
          statusMsg.textContent = `Extracted ${data.doc_count} PDF documents. Evaluating ${data.total_points} checklist points...`;
          fill.style.width = "25%";
          pct.textContent = "25%";
        } else if (data.stage === "analyzing") {
          const progress = Math.max(25, data.progress || 30);
          fill.style.width = `${progress}%`;
          pct.textContent = `${progress}%`;
          statusMsg.textContent = `Auditing batch ${data.current_batch} of ${data.total_batches}...`;
          batchStatus.textContent = `Checked ${data.processed_points} of ${data.total_points} points`;
          currentCat.textContent = data.current_category;
          currentText.textContent = `Evaluating clauses for category: ${data.current_category}`;
        } else if (data.stage === "complete") {
          fill.style.width = "100%";
          pct.textContent = "100%";
          statusMsg.textContent = "Audit Completed!";
          eventSource.close();

          setTimeout(() => {
            runningView.classList.add("hidden");
            state.activeAnalysis = data.data;
            renderAnalysisResults(data.data);
            loadHistory();
            showToast("Tender analysis completed successfully!", "success");
          }, 600);
        } else if (data.stage === "error") {
          showToast(data.message, "error");
          eventSource.close();
          runningView.classList.add("hidden");
          idleView.classList.remove("hidden");
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE error, falling back to direct POST:", err);
      eventSource.close();
      // Fallback direct POST
      runAnalysisPostFallback(folderId);
    };
  } catch (err) {
    runAnalysisPostFallback(folderId);
  }
}

async function runAnalysisPostFallback(folderId) {
  try {
    const statusMsg = document.getElementById("hud-status-message");
    if (statusMsg) statusMsg.textContent = "Running AI Analysis with Multi-Key Pool...";
    const res = await fetch(`${API_BASE}/analyze/${folderId}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      document.getElementById("analysis-running-view").classList.add("hidden");
      state.activeAnalysis = data;
      renderAnalysisResults(data);
      loadHistory();
      showToast("Tender analysis completed!", "success");
    } else {
      const err = await res.json();
      showToast(err.detail || "Analysis failed", "error");
      document.getElementById("analysis-running-view").classList.add("hidden");
      document.getElementById("analysis-idle-view").classList.remove("hidden");
    }
  } catch (e) {
    showToast("Error connecting to analysis engine", "error");
    document.getElementById("analysis-running-view").classList.add("hidden");
    document.getElementById("analysis-idle-view").classList.remove("hidden");
  }
}

// ----------------- TARGETED RE-ANALYSIS (PRESERVES FOUND ANSWERS) -----------------

async function startReanalysis(analysisId) {
  if (!state.activeAnalysis) return;
  const missingCount = state.activeAnalysis.missing_points || 0;
  const foundCount = state.activeAnalysis.found_points || 0;

  if (missingCount === 0) {
    showToast("All 63 criteria points are already identified and verified!", "success");
    return;
  }

  switchTab("analysis-tab");

  const runningView = document.getElementById("analysis-running-view");
  const idleView = document.getElementById("analysis-idle-view");
  const resultsView = document.getElementById("analysis-results-view");

  idleView.classList.add("hidden");
  resultsView.classList.add("hidden");
  runningView.classList.remove("hidden");

  const fill = document.getElementById("hud-progress-fill");
  const pct = document.getElementById("hud-progress-pct");
  const statusMsg = document.getElementById("hud-status-message");
  const batchStatus = document.getElementById("hud-batch-status");
  const currentCat = document.getElementById("hud-current-cat");
  const currentText = document.getElementById("hud-current-text");

  fill.style.width = "10%";
  pct.textContent = "10%";
  statusMsg.textContent = `Targeted Re-Audit: Focused exclusively on ${missingCount} missing checklist criteria...`;
  batchStatus.textContent = `Preserving ${foundCount} verified answers 100% untouched...`;
  currentCat.textContent = "Contract Conditions & GCC/SCC";
  currentText.textContent = "Deep scanning EPC Agreement, RFP, Specifications & Schedules for missing terms...";

  try {
    const eventSource = new EventSource(`${API_BASE}/reanalyze/${analysisId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.stage === "extracting") {
          statusMsg.textContent = data.message;
          fill.style.width = "15%";
          pct.textContent = "15%";
          batchStatus.textContent = "Loading full tender PDF text into extended context...";
        } else if (data.stage === "extraction_complete") {
          statusMsg.textContent = `Deep auditing ${data.missing_count} missing points (${data.preserved_count} verified points protected)...`;
          fill.style.width = "25%";
          pct.textContent = "25%";
        } else if (data.stage === "analyzing") {
          const progress = Math.max(25, data.progress || 30);
          fill.style.width = `${progress}%`;
          pct.textContent = `${progress}%`;
          statusMsg.textContent = `Re-evaluating missing batch ${data.current_batch} of ${data.total_batches}...`;
          batchStatus.textContent = `Checked ${data.processed_points} of ${data.total_missing} missing points (${data.preserved_count} answers preserved)`;
          currentCat.textContent = data.current_category;
          currentText.textContent = `Searching GCC/SCC contract clauses for: ${data.current_category}`;
        } else if (data.stage === "complete") {
          fill.style.width = "100%";
          pct.textContent = "100%";
          statusMsg.textContent = "Targeted Re-Audit Completed!";
          eventSource.close();

          const prevFound = foundCount;
          const newFound = data.data ? data.data.found_points : prevFound;
          const discovered = Math.max(0, newFound - prevFound);

          setTimeout(() => {
            runningView.classList.add("hidden");
            state.activeAnalysis = data.data;
            renderAnalysisResults(data.data);
            loadHistory();
            if (discovered > 0) {
              showToast(`Re-Analysis successful! Found ${discovered} additional criteria (${newFound}/${data.data.total_points} total found)!`, "success");
            } else {
              showToast(`Re-Analysis complete! Total verified: ${newFound}/${data.data.total_points}`, "info");
            }
          }, 600);
        } else if (data.stage === "error") {
          showToast(data.message, "error");
          eventSource.close();
          runningView.classList.add("hidden");
          resultsView.classList.remove("hidden");
        }
      } catch (err) {
        console.error("SSE parse error during re-analyze:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE error on re-analyze, falling back to direct POST:", err);
      eventSource.close();
      runReanalysisPostFallback(analysisId);
    };
  } catch (err) {
    runReanalysisPostFallback(analysisId);
  }
}

async function runReanalysisPostFallback(analysisId) {
  try {
    const statusMsg = document.getElementById("hud-status-message");
    if (statusMsg) statusMsg.textContent = "Performing deep targeted re-audit via API fallback...";
    const res = await fetch(`${API_BASE}/reanalyze/${analysisId}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      document.getElementById("analysis-running-view").classList.add("hidden");
      state.activeAnalysis = data;
      renderAnalysisResults(data);
      loadHistory();
      showToast("Targeted Re-Analysis complete!", "success");
    } else {
      const err = await res.json();
      showToast(err.detail || "Re-Analysis failed", "error");
      document.getElementById("analysis-running-view").classList.add("hidden");
      document.getElementById("analysis-results-view").classList.remove("hidden");
    }
  } catch (e) {
    showToast("Error connecting to re-analysis engine", "error");
    document.getElementById("analysis-running-view").classList.add("hidden");
    document.getElementById("analysis-results-view").classList.remove("hidden");
  }
}

// ----------------- RESULTS VIEWER -----------------

function renderAnalysisResults(analysisData) {
  if (!analysisData) return;

  const idleView = document.getElementById("analysis-idle-view");
  const runningView = document.getElementById("analysis-running-view");
  const resultsView = document.getElementById("analysis-results-view");

  idleView.classList.add("hidden");
  runningView.classList.add("hidden");
  resultsView.classList.remove("hidden");

  // Fill Header
  document.getElementById("res-folder-name").textContent = analysisData.folder_name || "Tender Project";
  document.getElementById("res-date").textContent = analysisData.created_at ? analysisData.created_at.replace("T", " ").slice(0, 19) : "Just now";
  document.getElementById("res-files-count").textContent = (analysisData.files || []).length;

  // Fill KPIs
  const score = analysisData.accuracy_score || 0;
  const total = analysisData.total_points || 0;
  const found = analysisData.found_points || 0;
  const missing = analysisData.missing_points || 0;

  document.getElementById("res-accuracy-num").textContent = `${score}%`;
  document.getElementById("res-total-points").textContent = total;
  document.getElementById("res-found-points").textContent = found;
  document.getElementById("res-missing-points").textContent = missing;

  // Animate Radial Gauge
  const maxDash = 264;
  const offset = maxDash - (maxDash * (score / 100));
  const radialFill = document.getElementById("res-radial-fill");
  if (radialFill) {
    radialFill.style.strokeDashoffset = offset;
  }

  // Filter Buttons Counts
  document.getElementById("filter-cnt-all").textContent = total;
  document.getElementById("filter-cnt-found").textContent = found;
  document.getElementById("filter-cnt-missing").textContent = missing;

  renderCategoryBreakdown(analysisData.results || []);
  renderResultsTable();
  initLucideIcons();
}

function renderCategoryBreakdown(results = []) {
  const container = document.getElementById("category-bars-container");
  if (!container) return;

  // Group by category
  const categoriesMap = {};
  results.forEach(r => {
    const cat = r.category || "General";
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { total: 0, found: 0 };
    }
    categoriesMap[cat].total++;
    if (r.status === "Found" && String(r.answer || "").trim() !== "-") {
      categoriesMap[cat].found++;
    }
  });

  const catNames = Object.keys(categoriesMap);
  if (!catNames.length) {
    container.innerHTML = "<p class='text-muted text-sm'>No category data available.</p>";
    return;
  }

  container.innerHTML = catNames.map(cat => {
    const stats = categoriesMap[cat];
    const pct = Math.round((stats.found / Math.max(1, stats.total)) * 100);
    const isLow = pct < 50;

    return `
      <div class="category-bar-item">
        <div class="cat-bar-header">
          <span class="cat-bar-name">${escapeHtml(cat)}</span>
          <span class="cat-bar-count">${stats.found}/${stats.total} found (${pct}%)</span>
        </div>
        <div class="cat-progress-bg">
          <div class="cat-progress-fill ${isLow ? 'low' : ''}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

function formatAnswerHtml(ans) {
  if (!ans || ans === "-") return '<span style="font-size:20px; font-weight:900; color:#94A3B8;">-</span>';
  
  // Check for bullet points or newlines
  const lines = ans.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 1 || ans.includes("•")) {
    const items = lines.map(line => {
      const cleanLine = line.replace(/^[•\-\*\d\.\)\s]+/, "").trim();
      return `<li>${escapeHtml(cleanLine || line)}</li>`;
    }).join("");
    return `<ul class="res-ans-bullets">${items}</ul>`;
  }
  return `<span>${escapeHtml(ans)}</span>`;
}

function renderResultsTable() {
  const tbody = document.getElementById("results-tbody");
  if (!tbody || !state.activeAnalysis) return;

  const results = state.activeAnalysis.results || [];
  const query = state.resultsSearchQuery.toLowerCase().trim();
  const filter = state.resultsFilter;

  const filtered = results.filter(item => {
    const isFound = (item.status === "Found" && String(item.answer || "").trim() !== "-");
    let matchesStatus = true;
    if (filter === "found") matchesStatus = isFound;
    if (filter === "missing") matchesStatus = !isFound;

    const matchesQuery = !query ||
      (item.question && item.question.toLowerCase().includes(query)) ||
      (item.answer && item.answer.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.source && item.source.toLowerCase().includes(query));

    return matchesStatus && matchesQuery;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
          No checklist items matching filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const ans = String(item.answer || "-").trim();
    const isFound = (item.status === "Found" && ans !== "-");

    return `
      <tr class="${isFound ? 'row-found' : 'row-missing'}">
        <td style="color:var(--text-muted); font-weight:600; text-align:center; width:48px;">${idx + 1}</td>
        <td style="width:160px;"><span class="badge-cat">${escapeHtml(item.category || 'General')}</span></td>
        <td class="res-q-text">${escapeHtml(item.question)}</td>
        <td class="res-ans-cell">
          ${isFound ? `
            <div class="res-ans-wrapper">
              <div class="res-ans-content">${formatAnswerHtml(ans)}</div>
              <button class="btn-copy-ans" data-copy-text="${escapeHtml(ans)}" title="Copy Answer">
                <i data-lucide="copy"></i>
              </button>
            </div>
          ` : '<div class="res-missing-dash">-</div>'}
        </td>
        <td style="text-align: center; width:110px;">
          ${isFound ? '<span class="badge-found"><i data-lucide="check"></i> Found</span>' : '<span class="badge-missing"><i data-lucide="minus"></i> Missing (-)</span>'}
        </td>
        <td class="res-citation" style="width:240px;">
          ${isFound ? `<i data-lucide="map-pin" style="width:13px; height:13px; display:inline-block; vertical-align:middle; color:var(--primary); margin-right:4px;"></i> ${escapeHtml(item.source || '-')}` : '<span style="color:var(--text-muted); text-align:center; display:block;">-</span>'}
        </td>
      </tr>
    `;
  }).join("");

  // Attach copy button handlers
  tbody.querySelectorAll("[data-copy-text]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const text = btn.getAttribute("data-copy-text");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast("Copied answer to clipboard!", "info");
      }
    });
  });

  initLucideIcons();
}

function setupResultsEvents() {
  // Print / PDF Report
  document.getElementById("btn-print-report")?.addEventListener("click", () => {
    window.print();
  });

  // Export Excel
  document.getElementById("btn-export-excel")?.addEventListener("click", () => {
    if (!state.activeAnalysis || !state.activeAnalysis.id) {
      showToast("No active analysis result to export", "error");
      return;
    }
    const analysisId = state.activeAnalysis.id;
    window.location.href = `${API_BASE}/export/${analysisId}`;
    showToast("Generating and downloading Excel report (.xlsx)...", "success");
  });

  // Re-run / Targeted Re-Analysis
  document.getElementById("btn-rerun-analysis")?.addEventListener("click", () => {
    if (state.activeAnalysis && state.activeAnalysis.id) {
      startReanalysis(state.activeAnalysis.id);
    } else if (state.activeAnalysis && state.activeAnalysis.folder_id) {
      startAnalysisForFolder(state.activeAnalysis.folder_id);
    }
  });

  // Filter Chips
  document.querySelectorAll(".results-toolbar .filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".results-toolbar .filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.resultsFilter = chip.getAttribute("data-filter");
      renderResultsTable();
    });
  });

  // Search in Results
  document.getElementById("res-search-input")?.addEventListener("input", (e) => {
    state.resultsSearchQuery = e.target.value;
    renderResultsTable();
  });
}

// ----------------- HISTORY ARCHIVE -----------------

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/history`);
    if (res.ok) {
      state.history = await res.json();
      renderHistoryList();
      document.getElementById("nav-history-count").textContent = state.history.length;
    }
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

function renderHistoryList() {
  const container = document.getElementById("history-container");
  const emptyState = document.getElementById("history-empty-state");
  if (!container) return;

  if (!state.history.length) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  container.innerHTML = state.history.map(item => {
    const score = item.accuracy_score || 0;
    let badgeClass = "high";
    if (score < 60) badgeClass = "low";
    else if (score < 80) badgeClass = "med";

    const dateStr = item.created_at ? item.created_at.replace("T", " ").slice(0, 16) : "-";

    return `
      <div class="history-card" data-history-id="${item.id}">
        <div>
          <div class="history-card-top">
            <h3 class="history-card-title">${escapeHtml(item.folder_name || 'Tender Project')}</h3>
            <span class="history-score-badge ${badgeClass}">${score}% Score</span>
          </div>
          <div class="history-meta-list">
            <div><i data-lucide="calendar"></i> ${dateStr}</div>
            <div><i data-lucide="list-checks"></i> ${item.found_points}/${item.total_points} Points Answered</div>
            <div><i data-lucide="files"></i> ${item.file_count || 1} Documents Processed</div>
          </div>
        </div>
        <div class="history-card-actions">
          <button class="btn btn-primary btn-sm flex-1" data-view-history="${item.id}">
            <i data-lucide="eye"></i> View Report
          </button>
          <button class="btn btn-emerald btn-sm" data-export-history="${item.id}" title="Download Excel">
            <i data-lucide="sheet"></i>
          </button>
          <button class="btn btn-danger-ghost btn-sm" data-delete-history="${item.id}" title="Delete Record">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach history actions
  container.querySelectorAll("[data-view-history]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const hId = btn.getAttribute("data-view-history");
      await viewPastAnalysis(hId);
    });
  });

  container.querySelectorAll("[data-export-history]").forEach(btn => {
    btn.addEventListener("click", () => {
      const hId = btn.getAttribute("data-export-history");
      window.location.href = `${API_BASE}/export/${hId}`;
      showToast("Downloading Excel spreadsheet...", "success");
    });
  });

  container.querySelectorAll("[data-delete-history]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const hId = btn.getAttribute("data-delete-history");
      if (confirm("Delete this analysis record?")) {
        await deleteHistory(hId);
      }
    });
  });

  initLucideIcons();
}

async function viewPastAnalysis(analysisId) {
  try {
    const res = await fetch(`${API_BASE}/results/${analysisId}`);
    if (res.ok) {
      const data = await res.json();
      state.activeAnalysis = data;
      switchTab("analysis-tab");
      renderAnalysisResults(data);
    }
  } catch (err) {
    showToast("Failed to load historical record", "error");
  }
}

async function deleteHistory(analysisId) {
  try {
    const res = await fetch(`${API_BASE}/history/${analysisId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Analysis history record deleted", "info");
      await loadHistory();
    }
  } catch (err) {
    showToast("Failed to delete history record", "error");
  }
}

function setupHistoryEvents() {
  document.getElementById("history-search-input")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    document.querySelectorAll(".history-card").forEach(card => {
      const title = card.querySelector(".history-card-title")?.textContent.toLowerCase() || "";
      card.style.display = (!query || title.includes(query)) ? "flex" : "none";
    });
  });
}

// ----------------- SETTINGS & KEYS MODAL -----------------

function setupSettingsEvents() {
  document.getElementById("btn-open-settings")?.addEventListener("click", async () => {
    await loadSystemStatus();
    renderSettingsModal();
    openModal("modal-settings");
  });

  document.getElementById("btn-save-keys")?.addEventListener("click", async () => {
    const rawKeys = document.getElementById("settings-keys-input").value;
    const keys = rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);

    if (!keys.length) {
      showToast("Please enter at least one valid key", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/settings/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody({ keys })
      });
      if (res.ok) {
        showToast("Gemini API keys updated successfully!", "success");
        closeModal("modal-settings");
        await loadSystemStatus();
      }
    } catch (err) {
      showToast("Failed to update API keys", "error");
    }
  });
}

function renderSettingsModal() {
  const container = document.getElementById("keys-list-container");
  if (!container || !state.systemStatus) return;

  const keys = state.systemStatus.keys || [];
  container.innerHTML = keys.map(k => `
    <div class="key-status-item">
      <div>
        <span class="status-dot ${k.failure_count > 2 ? 'error' : 'online'}" style="display:inline-block; margin-right:6px;"></span>
        <strong>Key #${k.index}:</strong> <span class="key-code">${k.masked_key}</span>
      </div>
      <div style="font-size:12px; color:var(--text-muted);">
        <span>Success: ${k.success_count}</span> | <span>Fails: ${k.failure_count}</span>
      </div>
    </div>
  `).join("");
}

// ----------------- MODAL CONTROLLERS -----------------

function setupModals() {
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      closeModal(modalId);
    });
  });

  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add("hidden");
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
    initLucideIcons();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
