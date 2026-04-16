const algorithmManager = window.algorithmManager;
const toastManager = window.toastManager;
let deleteId = null;

// Format date helper
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get badge color based on algorithm type
function getTypeBadge(type) {
  const badges = {
    diagnostic: '<span class="badge bg-info">Diagnostic</span>',
    treatment: '<span class="badge bg-success">Treatment</span>',
    scheduling: '<span class="badge bg-warning">Scheduling</span>',
    assessment: '<span class="badge bg-secondary">Assessment</span>',
    custom: '<span class="badge bg-primary">Custom</span>',
  };
  return badges[type] || '<span class="badge bg-primary">Custom</span>';
}

// Render algorithm list
function renderAlgorithmList() {
  const algorithms = algorithmManager.getAllAlgorithms();
  const algorithmsArray = Object.values(algorithms);
  const tbody = $("#algorithmList");
  const emptyState = $("#emptyState");

  if (algorithmsArray.length === 0) {
    tbody.empty();
    emptyState.removeClass("d-none");
    return;
  }

  emptyState.addClass("d-none");
  tbody.empty();

  algorithmsArray.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  algorithmsArray.forEach((algo, index) => {
    const row = `
      <tr class="algorithm-row" data-id="${algo.id}">
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHtml(algo.name)}</strong>
          <br>
          <small class="text-muted">${escapeHtml(algo.description || "No description")}</small>
        </td>
        <td>${getTypeBadge(algo.type)}</td>
        <td><small>${formatDate(algo.updatedAt)}</small></td>
        <td><small>${formatDate(algo.createdAt)}</small></td>
        <td>
          <div class="dropdown" style="position: static;">
            <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="z-index: 1000;">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end" style="z-index: 9999; position: absolute;">
              <li>
                <a class="dropdown-item edit-algorithm" href="#" data-id="${algo.id}">
                  <i class="fas fa-edit text-primary me-2"></i> Edit
                </a>
              </li>
              <li>
                <a class="dropdown-item edit-algorithm-builder" href="#" data-id="${algo.id}">
                  <i class="fas fa-project-diagram text-success me-2"></i> Open Builder
                </a>
              </li>
              <li>
                <a class="dropdown-item test-algorithm" href="#" data-id="${algo.id}">
                  <i class="fas fa-play text-info me-2"></i> Test
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a class="dropdown-item delete-algorithm" href="#" data-id="${algo.id}">
                  <i class="fas fa-trash text-danger me-2"></i> Delete
                </a>
              </li>
            </ul>
          </div>
         </td>
       </tr>
    `;
    tbody.append(row);
  });
}

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    return m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;";
  });
}

// Event handlers
$(document).ready(function () {
  renderAlgorithmList();

  // Create new - open form in create mode
  $("#createNewBtn, #emptyCreateBtn").on("click", function () {
    window.location.href = "create-algorithm.html";
  });

  // Edit - open form in edit mode with ID parameter
  $(document).on("click", ".edit-algorithm", function () {
    const id = $(this).data("id");
    window.location.href = `create-algorithm.html?id=${id}`;
  });

  // Open builder
  $(document).on("click", ".edit-algorithm-builder", function () {
    const id = $(this).data("id");
    window.open(`builder.html?id=${id}`, "_blank");
  });

  // Test algorithm
  $(document).on("click", ".test-algorithm", function () {
    const id = $(this).data("id");
    window.open(`form-viewer.html?id=${id}`, "_blank");
  });

  // Delete algorithm
  $(document).on("click", ".delete-algorithm", function () {
    const id = $(this).data("id");
    const algorithm = algorithmManager.getAlgorithm(id);
    if (algorithm) {
      $("#deleteAlgorithmName").text(algorithm.name);
      deleteId = id;
      $("#deleteModal").modal("show");
    }
  });

  // Confirm delete
  $("#confirmDeleteBtn").on("click", function () {
    if (deleteId) {
      algorithmManager.deleteAlgorithm(deleteId);
      renderAlgorithmList();

      toastManager.success("Algorithm deleted successfully!");

      $("#deleteModal").modal("hide");
      deleteId = null;
    }
  });
});
