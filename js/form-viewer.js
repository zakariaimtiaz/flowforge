class FormViewer {
  constructor() {
    this.algorithmManager = new AlgorithmManager();
    this.toastManager = new ToastManager();
    this.algorithms = {};
    this.currentAlgorithm = null;
    this.currentNodeId = null;
    this.responses = {};
    this.questionHistory = [];
    this.visitedNodes = new Set();
  }

  loadAlgorithm(algorithmId) {
    this.currentAlgorithm = this.algorithmManager.getAlgorithm(algorithmId);

    if (!this.currentAlgorithm) {
      this.toastManager.error(`Algorithm with ID "${algorithmId}" not found!`);
      return false;
    }

    this.responses = {};
    this.questionHistory = [];
    this.visitedNodes.clear();
    this.currentNodeId = null;

    const startNode = this.findStartNode();

    if (startNode) {
      this.currentNodeId = startNode;
      this.visitedNodes.add(startNode);
      this.renderForm();
      return true;
    } else {
      toastManager.warning("No start node found in algorithm!");
      return false;
    }
  }

  findStartNode() {
    const nodes = this.currentAlgorithm.nodes || {};
    const nodeIds = Object.keys(nodes);

    if (nodeIds.length === 0) return null;

    const targetedNodes = new Set();
    for (let node of Object.values(nodes)) {
      const branches = node.branches || [];
      for (let br of branches) {
        if (br.targetId) {
          targetedNodes.add(br.targetId);
        }
      }
    }

    const startNodes = nodeIds.filter((id) => !targetedNodes.has(id));
    return startNodes.length > 0 ? startNodes[0] : nodeIds[0];
  }

  evaluateCondition(rule, value, ruleValue) {
    if (!rule || rule === "any") return true;
    if (rule === "else") return false;

    switch (rule) {
      case "eq":
        return String(value) == String(ruleValue);
      case "lt":
        return parseFloat(value) < parseFloat(ruleValue);
      case "gt":
        return parseFloat(value) > parseFloat(ruleValue);
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(ruleValue).toLowerCase());
      case "startsWith":
        return String(value)
          .toLowerCase()
          .startsWith(String(ruleValue).toLowerCase());
      case "option":
        return String(value) === String(ruleValue);
      case "custom":
        return String(value)
          .toLowerCase()
          .includes(String(ruleValue).toLowerCase());
      default:
        return true;
    }
  }

  getNextNode(currentNode, responseValue) {
    const branches = currentNode.branches || [];

    for (let branch of branches) {
      if (branch.ruleType === "any") {
        continue;
      }

      if (branch.ruleType === "option" && branch.ruleValue === responseValue) {
        return branch.targetId;
      }

      if (branch.ruleType === "eq" && responseValue == branch.ruleValue) {
        return branch.targetId;
      }

      if (
        branch.ruleType === "lt" &&
        parseFloat(responseValue) < parseFloat(branch.ruleValue)
      ) {
        return branch.targetId;
      }

      if (
        branch.ruleType === "gt" &&
        parseFloat(responseValue) > parseFloat(branch.ruleValue)
      ) {
        return branch.targetId;
      }

      if (
        branch.ruleType === "contains" &&
        String(responseValue)
          .toLowerCase()
          .includes(String(branch.ruleValue).toLowerCase())
      ) {
        return branch.targetId;
      }
    }

    const elseBranch = branches.find((b) => b.ruleType === "else");
    if (elseBranch) {
      return elseBranch.targetId;
    }

    const anyBranch = branches.find((b) => b.ruleType === "any");
    if (anyBranch) {
      return anyBranch.targetId;
    }

    return null;
  }

  renderForm() {
    if (!this.currentNodeId) return;

    const nodes = this.currentAlgorithm.nodes;
    const node = nodes[this.currentNodeId];

    if (!node) {
      this.toastManager.error("Node not found!");
      return;
    }

    this.visitedNodes.add(this.currentNodeId);
    this.updateButtonStates();

    const html = this.renderQuestion(node);
    $("#formContainer").html(html);
    $("#formFooter").show();
    $("#responseCard").hide();

    $("#formTitle").text(this.currentAlgorithm.name);
    $("#formDescription").text(
      this.currentAlgorithm.description ||
        "Fill out the form to see branching logic",
    );

    this.attachEventHandlers(node);

    setTimeout(() => {
      $("input:not([readonly]):first").focus();
    }, 100);
  }

  renderQuestion(node) {
    const isRequired = node.tags?.some(
      (tag) =>
        tag.name === "required" &&
        (tag.value === "true" || tag.value === "1" || tag.value === "yes"),
    );

    const isReadonly = node.tags?.some(
      (tag) =>
        tag.name === "readonly" &&
        (tag.value === "true" || tag.value === "1" || tag.value === "yes"),
    );

    const requiredMark = isRequired
      ? '<span class="required-star text-danger ms-1">*</span>'
      : "";
    const savedValue = this.responses[node.id] || "";

    let inputHtml = "";

    switch (node.type) {
      case "text":
        inputHtml = `
                    <input type="text" class="form-control" id="response_${node.id}" 
                           value="${this.escapeHtml(savedValue)}" 
                           placeholder="Enter your answer..."
                           ${isRequired ? "required" : ""}
                           ${isReadonly ? "readonly" : ""}>
                `;
        break;

      case "number":
        inputHtml = `
                    <input type="number" class="form-control" id="response_${node.id}" 
                           value="${savedValue}" 
                           placeholder="Enter a number..."
                           ${isRequired ? "required" : ""}
                           ${isReadonly ? "readonly" : ""}>
                `;
        break;

      case "date":
        inputHtml = `
                    <input type="date" class="form-control" id="response_${node.id}" 
                           value="${savedValue}"
                           ${isRequired ? "required" : ""}
                           ${isReadonly ? "readonly" : ""}>
                `;
        break;

      case "time":
        inputHtml = `
                    <input type="time" class="form-control" id="response_${node.id}" 
                           value="${savedValue}"
                           ${isRequired ? "required" : ""}
                           ${isReadonly ? "readonly" : ""}>
                `;
        break;

      case "select":
        const options = node.options || [];
        inputHtml = `
                    <select class="form-select" id="response_${node.id}" 
                            ${isRequired ? "required" : ""}
                            ${isReadonly ? "disabled" : ""}>
                        <option value="">-- Select an option --</option>
                        ${options
                          .map(
                            (opt) => `
                            <option value="${this.escapeHtml(opt.value)}" ${savedValue === opt.value ? "selected" : ""}>
                                ${this.escapeHtml(opt.caption)}
                            </option>
                        `,
                          )
                          .join("")}
                    </select>
                `;
        break;

      case "multiSelect":
        const multiOptions = node.options || [];
        const selectedValues = savedValue ? savedValue.split(",") : [];
        inputHtml = `
                    <div class="multi-select-group">
                        ${multiOptions
                          .map(
                            (opt) => `
                            <div class="option-item-view">
                                <input type="checkbox" class="form-check-input multi-option" 
                                       value="${this.escapeHtml(opt.value)}"
                                       id="opt_${node.id}_${opt.id}"
                                       ${selectedValues.includes(opt.value) ? "checked" : ""}
                                       ${isReadonly ? "disabled" : ""}>
                                <label for="opt_${node.id}_${opt.id}">${this.escapeHtml(opt.caption)}</label>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <input type="hidden" id="response_${node.id}" value="${savedValue}">
                `;
        break;

      case "list":
        const listOptions = node.options || [];
        inputHtml = `
                    <select class="form-select" id="response_${node.id}" size="5" 
                            ${isRequired ? "required" : ""}
                            ${isReadonly ? "disabled" : ""}>
                        <option value="">-- Select an item --</option>
                        ${listOptions
                          .map(
                            (opt) => `
                            <option value="${this.escapeHtml(opt.value)}" ${savedValue === opt.value ? "selected" : ""}>
                                ${this.escapeHtml(opt.caption)}
                            </option>
                        `,
                          )
                          .join("")}
                    </select>
                `;
        break;

      default:
        inputHtml = `
                    <textarea class="form-control" id="response_${node.id}" rows="3" 
                              placeholder="Enter your answer..."
                              ${isRequired ? "required" : ""}
                              ${isReadonly ? "readonly" : ""}>${this.escapeHtml(savedValue)}</textarea>
                `;
    }

    return `
            <div class="question-card-view" data-node-id="${node.id}">
                <div class="question-title">
                    ${this.escapeHtml(node.caption || "Untitled Question")}
                    ${requiredMark}
                </div>
                ${node.comment ? `<div class="question-comment">${this.escapeHtml(node.comment)}</div>` : ""}
                <div class="mt-3">
                    ${inputHtml}
                </div>
            </div>
        `;
  }

  attachEventHandlers(node) {
    $(".multi-option")
      .off("change")
      .on("change", function () {
        const selected = $(".multi-option:checked")
          .map(function () {
            return $(this).val();
          })
          .get();
        $(`#response_${node.id}`).val(selected.join(","));
      });

    $("#nextBtn")
      .off("click")
      .on("click", () => this.handleNext(node));

    $("#prevBtn")
      .off("click")
      .on("click", () => this.handlePrevious());

    $("input, select, textarea")
      .off("keypress")
      .on("keypress", (e) => {
        if (e.which === 13 && !(e.target.tagName === "TEXTAREA")) {
          e.preventDefault();
          this.handleNext(node);
        }
      });
  }

  handleNext(node) {
    const isRequired = node.tags?.some(
      (tag) =>
        tag.name === "required" &&
        (tag.value === "true" || tag.value === "1" || tag.value === "yes"),
    );

    let responseValue = "";

    if (node.type === "multiSelect") {
      responseValue = $(`#response_${node.id}`).val();
    } else {
      responseValue = $(`#response_${node.id}`).val();
    }

    if (isRequired && (!responseValue || responseValue === "")) {
      this.toastManager.error("This field is required!");
      $(`#response_${node.id}`).addClass("is-invalid");
      return;
    }

    $(`#response_${node.id}`).removeClass("is-invalid");
    this.responses[node.id] = responseValue;

    const nextNodeId = this.getNextNode(node, responseValue);

    if (nextNodeId && this.currentAlgorithm.nodes[nextNodeId]) {
      this.questionHistory.push(this.currentNodeId);
      this.currentNodeId = nextNodeId;
      this.visitedNodes.add(nextNodeId);
      this.renderForm();
    } else {
      this.showCompletion();
    }
  }

  handlePrevious() {
    if (this.questionHistory.length > 0) {
      const previousNodeId = this.questionHistory.pop();

      const currentNode = this.currentAlgorithm.nodes[this.currentNodeId];
      if (currentNode) {
        let responseValue = "";
        if (currentNode.type === "multiSelect") {
          responseValue = $(`#response_${this.currentNodeId}`).val();
        } else {
          responseValue = $(`#response_${this.currentNodeId}`).val();
        }
        if (responseValue !== undefined) {
          this.responses[this.currentNodeId] = responseValue;
        }
      }

      this.currentNodeId = previousNodeId;
      this.renderForm();
      $("html, body").animate({ scrollTop: 0 }, 300);
      this.toastManager.info("Going back to previous question");
    } else {
      this.toastManager.warning("This is the first question");
    }
  }

  updateButtonStates() {
    if (this.questionHistory.length === 0) {
      $("#prevBtn").prop("disabled", true);
    } else {
      $("#prevBtn").prop("disabled", false);
    }
  }

  showCompletion() {
    $("#formContainer").html(`
            <div class="text-center py-5">
                <i class="fas fa-check-circle text-success fa-4x mb-3"></i>
                <h4>Form Completed!</h4>
                <p class="text-muted">Thank you for completing the form.</p>
                <div class="mt-4">
                    <button class="btn btn-primary" id="viewResponsesBtn">
                        <i class="fas fa-chart-bar me-1"></i> View Responses
                    </button>
                    <button class="btn btn-secondary ms-2" id="startOverBtn">
                        <i class="fas fa-redo me-1"></i> Start Over
                    </button>
                </div>
            </div>
        `);

    $("#formFooter").hide();

    $("#viewResponsesBtn")
      .off("click")
      .on("click", () => this.showResponses());
    $("#startOverBtn")
      .off("click")
      .on("click", () => this.startOver());
  }

  showResponses() {
    $("#responseCard").show();
    const responseJson = JSON.stringify(this.responses, null, 2);
    $("#responseJson").text(responseJson);

    const readableHtml = this.generateReadableResponses();
    $("#responseContainer").html(readableHtml);
    $("#responseContainer").append(
      `<pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 12px; margin-top: 15px;">${responseJson}</pre>`,
    );
  }

  generateReadableResponses() {
    const nodes = this.currentAlgorithm.nodes;
    let html = '<div class="mb-3"><strong>📋 Your Answers:</strong></div>';

    for (let [nodeId, value] of Object.entries(this.responses)) {
      const node = nodes[nodeId];
      if (node) {
        html += `
                    <div class="mb-2 p-2 bg-light rounded">
                        <strong>${this.escapeHtml(node.caption || nodeId)}:</strong>
                        <span class="text-primary">${this.escapeHtml(value || "")}</span>
                    </div>
                `;
      }
    }

    return html;
  }

  startOver() {
    this.responses = {};
    this.questionHistory = [];
    this.visitedNodes.clear();
    this.currentNodeId = this.findStartNode();
    if (this.currentNodeId) {
      this.visitedNodes.add(this.currentNodeId);
      this.renderForm();
    }
    $("#responseCard").hide();
    this.toastManager.info("Form reset. Starting over.");
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function (m) {
      return m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;";
    });
  }
}

// Initialize form viewer
$(document).ready(function () {
  const viewer = new FormViewer();
  const urlParams = new URLSearchParams(window.location.search);
  const algorithmId = urlParams.get("id");

  if (algorithmId) {
    viewer.loadAlgorithm(algorithmId);
  } else {
    toastManager.warning(
      "No algorithm ID provided in URL! Please use ?id=your_algorithm_id",
    );
  }
});
