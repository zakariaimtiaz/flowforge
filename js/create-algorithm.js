// Use global managers
const algorithmManager = window.algorithmManager;
const toastManager = window.toastManager;
let algorithmId = null;
let isEditMode = false;

$(document).ready(function () {
  // Check if we're in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  algorithmId = urlParams.get("id");
  isEditMode = algorithmId && algorithmId !== "";

  // Update UI based on mode
  if (isEditMode) {
    // Edit mode
    $("#pageTitle").html(
      '<i class="fas fa-edit text-warning me-2"></i>Edit Algorithm',
    );
    $("#submitBtn").html('<i class="fas fa-save me-2"></i>Update');

    // Load algorithm data
    const algorithm = algorithmManager.getAlgorithm(algorithmId);

    if (!algorithm) {
      toastManager.error("Algorithm not found!");
      return;
    }

    // Populate form
    $("#algorithmId").val(algorithm.id);
    $("#algorithmName").val(algorithm.name);
    $("#algorithmType").val(algorithm.type);
    $("#algorithmDescription").val(algorithm.description || "");
  } else {
    // Create mode - ensure form is empty
    $("#algorithmId").val("");
    $("#algorithmName").val("");
    $("#algorithmType").val("");
    $("#algorithmDescription").val("");
  }

  // Handle form submission
  $("#algorithmForm").on("submit", function (e) {
    e.preventDefault();

    const name = $("#algorithmName").val().trim();
    const type = $("#algorithmType").val();
    const description = $("#algorithmDescription").val().trim();

    // Basic validation
    if (!name) {
      toastManager.warning("Algorithm name is required!");
      return;
    }

    if (!type) {
      toastManager.warning("Please select algorithm type!");
      return;
    }

    let algorithm;
    let successMessage;

    if (isEditMode) {
      // Update existing algorithm
      algorithm = algorithmManager.updateAlgorithm(algorithmId, {
        name: name,
        type: type,
        description: description,
      });
      successMessage = "Algorithm updated successfully!";

      if (algorithm) {
        toastManager.success(successMessage);
      } else {
        toastManager.error("Failed to update algorithm!");
      }
    } else {
      // Create new algorithm
      algorithm = algorithmManager.createAlgorithm(name, type, description);
      successMessage = "Algorithm created successfully!";

      if (algorithm) {
        toastManager.success(successMessage);

        // Switch to edit mode after successful creation
        // Update URL without reloading the page
        const newUrl = `${window.location.pathname}?id=${algorithm.id}`;
        window.history.pushState({}, "", newUrl);

        // Update form state to edit mode
        isEditMode = true;
        algorithmId = algorithm.id;

        // Store the algorithm ID in the hidden field
        $("#algorithmId").val(algorithm.id);

        // Update UI for edit mode
        $("#pageTitle").html(
          '<i class="fas fa-edit text-warning me-2"></i>Edit Algorithm',
        );
        $("#submitBtn").html('<i class="fas fa-save me-2"></i>Update');
      } else {
        toastManager.error("Failed to create algorithm!");
      }
    }
  });

  // Cancel button handler
  $("#cancelBtn").on("click", function (e) {
    e.preventDefault();
    if (
      confirm(
        "Are you sure you want to cancel? Any unsaved changes will be lost.",
      )
    ) {
      // Reset form
      $("#algorithmForm")[0].reset();
      $("#algorithmId").val("");

      // If in edit mode, go back to create mode
      if (isEditMode) {
        window.location.href = "algorithm-form.html";
      } else {
        // Clear form fields
        $("#algorithmName").val("");
        $("#algorithmType").val("");
        $("#algorithmDescription").val("");
      }

      toastManager.info("Form has been reset.");
    }
  });
});
