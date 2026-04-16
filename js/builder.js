// Use global managers
const algorithmManager = window.algorithmManager;
const toastManager = window.toastManager;

let instance = null;
let currentNodeId = null;
let allNodes = {};
let nodeCounter = 1;
let pendingDeleteId = null;
let currentAlgorithmId = null;
let algorithmData = null;

// Rule templates for each question type
const ruleTemplates = {
  text: [
    { value: "any", label: "Any value", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., contains 'hello', starts with 'A'",
    },
  ],
  number: [
    { value: "any", label: "Any value", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "eq",
      label: "Value is equal to",
      hasInput: true,
      placeholder: "Enter number",
    },
    {
      value: "lt",
      label: "Value is less than",
      hasInput: true,
      placeholder: "Enter number",
    },
    {
      value: "gt",
      label: "Value is greater than",
      hasInput: true,
      placeholder: "Enter number",
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., value between 10 and 20",
    },
  ],
  select: [
    { value: "any", label: "Any option", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "option",
      label: "Selected option",
      hasInput: false,
      isOptionBased: true,
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., option contains 'value'",
    },
  ],
  multiSelect: [
    { value: "any", label: "Any option", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "option",
      label: "Contains option",
      hasInput: false,
      isOptionBased: true,
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., contains 'option 1' and 'option 2'",
    },
  ],
  list: [
    { value: "any", label: "Any item", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "option",
      label: "Selected item",
      hasInput: false,
      isOptionBased: true,
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., selected item is 'Item 1'",
    },
  ],
  date: [
    { value: "any", label: "Any date", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "eq",
      label: "Date is equal to",
      hasInput: true,
      placeholder: "YYYY-MM-DD",
    },
    {
      value: "before",
      label: "Date is before",
      hasInput: true,
      placeholder: "YYYY-MM-DD",
    },
    {
      value: "after",
      label: "Date is after",
      hasInput: true,
      placeholder: "YYYY-MM-DD",
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., date between 2024-01-01 and 2024-12-31",
    },
  ],
  time: [
    { value: "any", label: "Any time", hasInput: false },
    { value: "else", label: "Else", hasInput: false },
    {
      value: "eq",
      label: "Time is equal to",
      hasInput: true,
      placeholder: "HH:MM",
    },
    {
      value: "before",
      label: "Time is before",
      hasInput: true,
      placeholder: "HH:MM",
    },
    {
      value: "after",
      label: "Time is after",
      hasInput: true,
      placeholder: "HH:MM",
    },
    {
      value: "custom",
      label: "Custom condition",
      hasInput: true,
      placeholder: "e.g., time between 09:00 and 17:00",
    },
  ],
};

function loadAlgorithmData() {
  const urlParams = new URLSearchParams(window.location.search);
  const algorithmId = urlParams.get("id");

  if (algorithmId) {
    algorithmData = algorithmManager.getAlgorithm(algorithmId);
    if (!algorithmData) {
      toastManager.error("Algorithm not found!");
      return false;
    }

    currentAlgorithmId = algorithmId;
    $("#algorithmName").text(`- ${algorithmData.name}`);

    if (algorithmData.nodes && Object.keys(algorithmData.nodes).length > 0) {
      allNodes = algorithmData.nodes;
      const maxCounter = Math.max(
        ...Object.keys(allNodes).map((id) => {
          const match = id.match(/node_(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
        0,
      );
      nodeCounter = maxCounter + 1;

      for (let [id, node] of Object.entries(allNodes)) {
        addNodeToCanvas(id, node);
      }
      refreshAllConnections();

      // Fit all nodes to view after loading
      setTimeout(() => {
        fitAllNodesToView();
      }, 100);

      return true;
    }
  }
  return false;
}

function saveAlgorithmData(isClose = false) {
  updateAllPositions();

  if (currentAlgorithmId && algorithmData) {
    algorithmData.nodes = allNodes;
    algorithmData.updatedAt = new Date().toISOString();
    algorithmData.version = (parseFloat(algorithmData.version) + 0.1).toFixed(
      1,
    );

    algorithmManager.updateAlgorithm(currentAlgorithmId, {
      nodes: allNodes,
      updatedAt: algorithmData.updatedAt,
      version: algorithmData.version,
    });

    toastManager.success("Algorithm saved successfully!");
    if (isClose) setTimeout(() => (window.location.href = "index.html"), 500);
  } else {
    toastManager.warning("No algorithm loaded");
  }
}

function updateAllPositions() {
  for (let [id, node] of Object.entries(allNodes)) {
    const $el = $(`#${id}`);
    if ($el.length) {
      node.position = { left: $el.css("left"), top: $el.css("top") };
    }
  }
}

function getTypeIcon(type) {
  const icons = {
    text: "fa-font",
    number: "fa-hashtag",
    select: "fa-check-circle",
    multiSelect: "fa-check-double",
    list: "fa-list",
    date: "fa-calendar",
    time: "fa-clock",
  };
  return icons[type] || "fa-question";
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    return m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;";
  });
}

function createNodeElement(id, nodeData) {
  let icon = getTypeIcon(nodeData.type);
  const isRequired = nodeData.tags?.some(
    (tag) =>
      tag.name?.toLowerCase() === "required" &&
      (tag.value === "true" || tag.value === "1" || tag.value === "yes"),
  );
  let requiredHtml = isRequired
    ? '<span class="required-badge">Required</span>'
    : "";

  return $(`<div class="question-card" id="${id}" style="left: ${nodeData.position.left}; top: ${nodeData.position.top}; border-left-color: #3b82f6;">
    <div class="card-header-custom">
      <div class="header-title"><i class="fas ${icon} header-icon"></i><span>${id.toUpperCase()}</span></div>
      ${requiredHtml}
    </div>
    <div class="header-separator"></div>
    <div class="card-body-custom">
      <div class="caption-text">${escapeHtml(nodeData.caption)}</div>
      <div class="caption-separator"></div>
      <div class="comment-text">${escapeHtml(nodeData.comment)}</div>
    </div>
  </div>`);
}

function addContextMenuToNode(nodeId) {
  $.contextMenu({
    selector: `#${nodeId}`,
    trigger: "right",
    build: function ($trigger, e) {
      return {
        callback: function (key, options) {
          if (key === "delete") {
            pendingDeleteId = nodeId;
            $("#deleteConfirmModal").modal("show");
          } else if (key === "duplicate") {
            duplicateNode(nodeId);
          }
        },
        items: {
          duplicate: { name: "Duplicate Node", icon: "copy" },
          sep1: "---------",
          delete: { name: "Delete Node", icon: "delete" },
        },
      };
    },
  });
}

function duplicateNode(sourceId) {
  let sourceNode = allNodes[sourceId];
  if (!sourceNode) return;

  let newId = `node_${nodeCounter++}`;
  let newPosition = {
    left: parseInt(sourceNode.position.left) + 30 + "px",
    top: parseInt(sourceNode.position.top) + 40 + "px",
  };
  let newNodeData = JSON.parse(JSON.stringify(sourceNode));
  newNodeData.id = newId;
  newNodeData.caption = `${sourceNode.caption} (Copy)`;
  newNodeData.position = newPosition;
  newNodeData.branches = (sourceNode.branches || []).map((br) => ({
    ruleType: br.ruleType,
    ruleValue: br.ruleValue,
    targetId: null,
  }));
  if (sourceNode.options)
    newNodeData.options = sourceNode.options.map((opt) => ({ ...opt }));

  allNodes[newId] = newNodeData;
  addNodeToCanvas(newId, newNodeData);
  refreshAllConnections();
  toastManager.success(`Duplicated "${sourceNode.caption}"`);
}

function addNodeToCanvas(nodeId, nodeData) {
  let $el = createNodeElement(nodeId, nodeData);
  $("#canvas-questions").append($el);

  instance.draggable(nodeId, {
    containment: "parent",
    stop: function (params) {
      let left = $(params.el).css("left"),
        top = $(params.el).css("top");
      if (allNodes[nodeId]) allNodes[nodeId].position = { left, top };
      instance.repaint(nodeId);
    },
  });

  instance.addEndpoint(nodeId, {
    anchor: "BottomCenter",
    isSource: false,
    isTarget: false,
    endpoint: "Dot",
    paintStyle: { fill: "#3b82f6", radius: 5 },
  });
  instance.addEndpoint(nodeId, {
    anchor: "TopCenter",
    isSource: false,
    isTarget: false,
    endpoint: "Dot",
    paintStyle: { fill: "#a5b4fc", radius: 4 },
  });

  $el.on("click", (e) => {
    e.stopPropagation();
    selectNode(nodeId);
  });
  addContextMenuToNode(nodeId);
  instance.repaint(nodeId);
}

function refreshAllConnections() {
  instance.deleteEveryConnection();
  for (let [id, node] of Object.entries(allNodes)) {
    let branches = node.branches || [];
    for (let br of branches) {
      if (br.targetId && allNodes[br.targetId]) {
        instance.connect({
          source: id,
          target: br.targetId,
          anchors: ["BottomCenter", "TopCenter"],
          paintStyle: { stroke: "#6366f1", lineWidth: 2.5 },
          connector: ["Bezier", { curviness: 70 }],
          overlays: [
            ["Arrow", { width: 14, length: 14, location: 0.85, foldback: 0.7 }],
          ],
          detachable: false,
        });
      }
    }
  }
  instance.repaintEverything();
}

function selectNode(nodeId) {
  if (currentNodeId) $(`#${currentNodeId}`).removeClass("activeq");
  currentNodeId = nodeId;
  $(`#${nodeId}`).addClass("activeq");
  renderPropertyEditor(nodeId);
}

function saveCurrentFormData(nodeId) {
  const node = allNodes[nodeId];
  if (!node) return;

  // Basic fields
  if ($("#nodeName").length) node.name = $("#nodeName").val();
  if ($("#nodeCaption").length) node.caption = $("#nodeCaption").val();
  if ($("#nodeComment").length) node.comment = $("#nodeComment").val();

  // ✅ TAGS (scoped)
  let newTags = [];
  $("#tagsContainer .tag-item").each(function () {
    let name = $(this).find(".tag-name").val();
    let value = $(this).find(".tag-value").val();

    if (name && value) {
      newTags.push({
        name: name.trim(),
        value: value.trim(),
      });
    }
  });

  node.tags = newTags;

  // ✅ OPTIONS (scoped)
  if (["select", "multiSelect", "list"].includes(node.type)) {
    let newOptions = [];
    $("#optionsContainer .option-item").each(function (idx) {
      let caption = $(this).find(".opt-caption").val();
      let value = $(this).find(".opt-value").val();

      if (caption && value) {
        newOptions.push({
          id: idx + 1,
          caption,
          value,
        });
      }
    });

    if (newOptions.length >= 2) {
      node.options = newOptions;
    }
  }

  // ✅ BRANCHES (FIXED - scoped properly)
  let newBranches = [];

  $("#branchesContainer .branch-item").each(function () {
    let ruleType = $(this).find(".branch-rule-type").val();
    let targetId = $(this).find(".branch-target").val();
    let optionValue = $(this).find(".branch-option-value").val();
    let inputValue = $(this).find(".branch-rule-value").val();

    let ruleValue = optionValue || inputValue || "";

    // ✅ Only save if target exists
    if (targetId) {
      newBranches.push({
        ruleType: ruleType || "any",
        ruleValue,
        targetId,
      });
    }
  });

  // If nothing valid, keep at least one default rule (optional)
  node.branches =
    newBranches.length > 0
      ? newBranches
      : [{ ruleType: "any", ruleValue: "", targetId: null }];
}

function addTag() {
  if (!currentNodeId) return;

  // Save current clean state first
  saveCurrentFormData(currentNodeId);

  if (!allNodes[currentNodeId].tags) {
    allNodes[currentNodeId].tags = [];
  }

  allNodes[currentNodeId].tags.push({ name: "", value: "" });

  renderPropertyEditor(currentNodeId);
}

function addRule() {
  if (!currentNodeId) return;

  saveCurrentFormData(currentNodeId);

  if (!allNodes[currentNodeId].branches) {
    allNodes[currentNodeId].branches = [];
  }

  allNodes[currentNodeId].branches.push({
    ruleType: "any",
    ruleValue: "",
    targetId: null,
  });

  renderPropertyEditor(currentNodeId);
}

function renderPropertyEditor(nodeId) {
  let node = allNodes[nodeId];
  if (!node) return;

  if (node.tags === undefined) node.tags = [];
  let branches = node.branches || [];
  if (branches.length === 0)
    branches = [{ ruleType: "any", ruleValue: "", targetId: null }];
  node.branches = branches;

  if (
    (node.type === "select" ||
      node.type === "multiSelect" ||
      node.type === "list") &&
    !node.options
  ) {
    node.options = [
      { id: 1, value: "option_1", caption: "Option 1" },
      { id: 2, value: "option_2", caption: "Option 2" },
    ];
  }

  // Build HTML
  let html = `<div class="mb-3"><label>Node ID</label><input type="text" class="form-control form-control-sm" readonly value="${nodeId}"></div>
    <div class="mb-3"><label>Name</label><input type="text" class="form-control form-control-sm" id="nodeName" value="${escapeHtml(node.name)}"></div>
    <div class="mb-3"><label>Caption / Label</label><input type="text" class="form-control form-control-sm" id="nodeCaption" value="${escapeHtml(node.caption || "")}"></div>
    <div class="mb-3"><label>Comment / Hint</label><textarea class="form-control form-control-sm" id="nodeComment" rows="2">${escapeHtml(node.comment || "")}</textarea></div>
    
    <div class="mb-3">
      <label class="fw-bold"><i class="fas fa-tags"></i> Tags</label>
      <div id="tagsContainer">${(node.tags || [])
        .map(
          (tag, idx) => `
        <div class="branch-item tag-item" data-tagidx="${idx}">
          <div class="row g-2">
            <div class="col-5"><input type="text" class="form-control form-control-sm tag-name" value="${escapeHtml(tag.name)}" placeholder="Key"></div>
            <div class="col-5"><input type="text" class="form-control form-control-sm tag-value" value="${escapeHtml(tag.value)}" placeholder="Value"></div>
            <div class="col-2"><button type="button" class="btn btn-sm btn-outline-danger remove-tag w-100"><i class="fas fa-trash"></i></button></div>
          </div>
        </div>
      `,
        )
        .join("")}</div>
      <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="addTagBtn"><i class="fas fa-plus"></i> Add Tag</button>
    </div>`;

  // Options for select types
  if (
    node.type === "select" ||
    node.type === "multiSelect" ||
    node.type === "list"
  ) {
    html += `<div class="mb-3">
      <label class="fw-bold"><i class="fas fa-list-ul"></i> Options</label>
      <div id="optionsContainer">${(node.options || [])
        .map(
          (opt, idx) => `
        <div class="branch-item option-item" data-optidx="${idx}">
          <div class="row g-2">
            <div class="col-5"><input type="text" class="form-control form-control-sm opt-caption" value="${escapeHtml(opt.caption)}" placeholder="Caption"></div>
            <div class="col-5"><input type="text" class="form-control form-control-sm opt-value" value="${escapeHtml(opt.value)}" placeholder="Value"></div>
            <div class="col-2"><button type="button" class="btn btn-sm btn-outline-danger remove-option w-100"><i class="fas fa-trash"></i></button></div>
          </div>
        </div>
      `,
        )
        .join("")}</div>
      <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="addOptionBtn"><i class="fas fa-plus"></i> Add Option</button>
    </div>`;
  }

  const rules = ruleTemplates[node.type] || ruleTemplates.text;

  // Build branches HTML
  let branchHtml = `<div class="mb-3"><label class="fw-bold"><i class="fas fa-code-branch"></i> Branching Rules</label><div id="branchesContainer">`;
  for (let idx = 0; idx < branches.length; idx++) {
    const br = branches[idx];
    const ruleType = br.ruleType || "any";
    const ruleValue = br.ruleValue || "";

    let ruleOptionsHtml = rules
      .map(
        (rule) =>
          `<option value="${rule.value}" ${ruleType === rule.value ? "selected" : ""}>${rule.label}</option>`,
      )
      .join("");
    let conditionHtml = "";

    if (
      (node.type === "select" ||
        node.type === "multiSelect" ||
        node.type === "list") &&
      ruleType === "option"
    ) {
      conditionHtml = `<div class="mb-2"><select class="form-select form-select-sm branch-option-value"><option value="">-- Select option --</option>${(node.options || []).map((opt) => `<option value="${escapeHtml(opt.value)}" ${ruleValue === opt.value ? "selected" : ""}>${escapeHtml(opt.caption)}</option>`).join("")}</select></div>`;
    } else {
      const selectedRule = rules.find((r) => r.value === ruleType);
      if (selectedRule && selectedRule.hasInput) {
        let inputType =
          ruleType === "eq" || ruleType === "lt" || ruleType === "gt"
            ? "number"
            : "text";
        conditionHtml = `<div class="mb-2"><input type="${inputType}" class="form-control form-control-sm branch-rule-value" value="${escapeHtml(ruleValue)}" placeholder="${selectedRule.placeholder || ""}"></div>`;
      }
    }

    let allNodeIds = Object.keys(allNodes).filter((id) => id !== nodeId);
    let targetOptions = `<option value="">-- Select target node --</option>${allNodeIds.map((id) => `<option value="${id}" ${br.targetId === id ? "selected" : ""}>${id} - ${allNodes[id].caption}</option>`).join("")}`;

    branchHtml += `<div class="branch-item" data-bidx="${idx}">
      <div class="mb-2"><label class="small">Condition</label><select class="form-select form-select-sm branch-rule-type">${ruleOptionsHtml}</select></div>
      ${conditionHtml}
      <div class="mb-2"><label class="small">Go to Node</label><select class="form-select form-select-sm branch-target">${targetOptions}</select></div>
      <button type="button" class="btn btn-sm btn-outline-danger remove-branch w-100 mt-1">Remove Rule</button>
    </div>`;
  }
  branchHtml += `</div><button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="addBranchBtn"><i class="fas fa-plus"></i> Add Rule</button></div>`;

  html +=
    branchHtml +
    `<button type="button" class="btn btn-success w-100 mt-2" id="applyNodeChangesBtn"><i class="fas fa-check-circle"></i> Apply Changes</button>`;

  $("#dynamicProperties").html(html);

  // Bind events - CLEAN approach with direct function calls
  $("#addTagBtn").off("click").on("click", addTag);
  $("#addBranchBtn").off("click").on("click", addRule);
  $("#addOptionBtn")
    .off("click")
    .on("click", function () {
      saveCurrentFormData(nodeId);
      let newId = (node.options?.length || 0) + 1;
      if (!node.options) node.options = [];
      node.options.push({
        id: newId,
        value: `option_${newId}`,
        caption: `Option ${newId}`,
      });
      renderPropertyEditor(nodeId);
      toastManager.success("Option added");
    });

  $(".remove-tag")
    .off("click")
    .on("click", function () {
      let idx = $(this).closest(".tag-item").data("tagidx");
      node.tags.splice(idx, 1);
      renderPropertyEditor(nodeId);
      toastManager.info("Tag removed");
    });

  $(".remove-option")
    .off("click")
    .on("click", function () {
      let optIdx = $(this).closest(".option-item").data("optidx");
      if (node.options && node.options.length > 2) {
        node.options.splice(optIdx, 1);
        renderPropertyEditor(nodeId);
        toastManager.info("Option removed");
      } else {
        toastManager.warning("Minimum 2 options required");
      }
    });

  $(".remove-branch")
    .off("click")
    .on("click", function () {
      let idx = $(this).closest(".branch-item").data("bidx");
      node.branches.splice(idx, 1);
      if (node.branches.length === 0)
        node.branches = [{ ruleType: "any", ruleValue: "", targetId: null }];
      renderPropertyEditor(nodeId);
      toastManager.info("Rule removed");
    });

  $(".branch-rule-type")
    .off("change")
    .on("change", function () {
      let idx = $(this).closest(".branch-item").data("bidx");
      node.branches[idx].ruleType = $(this).val();
      node.branches[idx].ruleValue = "";
      renderPropertyEditor(nodeId);
    });

  $(".branch-target, .branch-rule-value, .branch-option-value")
    .off("change")
    .on("change", function () {
      saveCurrentFormData(nodeId);
    });

  $("#applyNodeChangesBtn")
    .off("click")
    .on("click", function () {
      saveCurrentFormData(nodeId);
      const isRequired = node.tags?.some(
        (tag) => tag.name === "required" && tag.value === "true",
      );
      $(`#${nodeId} .caption-text`).text(node.caption);
      $(`#${nodeId} .comment-text`).text(node.comment);
      $(`#${nodeId} .required-badge`).remove();
      if (isRequired)
        $(`#${nodeId} .card-header-custom`).append(
          '<span class="required-badge">Required</span>',
        );
      refreshAllConnections();
      toastManager.success(`Applied changes to ${nodeId}`);
    });

  $("#nodeName, #nodeCaption, #nodeComment")
    .off("change")
    .on("change", function () {
      saveCurrentFormData(nodeId);
    });
}

function createNewNode(type, posLeft, posTop) {
  let newId = `node_${nodeCounter++}`;
  let nodeData = {
    id: newId,
    type: type,
    name: "",
    caption: `${type.charAt(0).toUpperCase() + type.slice(1)} Question`,
    comment: "",
    tags: [],
    branches: [{ ruleType: "any", ruleValue: "", targetId: null }],
    position: { left: posLeft, top: posTop },
  };
  if (type === "select" || type === "multiSelect" || type === "list") {
    nodeData.options = [
      { id: 1, value: "option_1", caption: "Option 1" },
      { id: 2, value: "option_2", caption: "Option 2" },
    ];
  }
  allNodes[newId] = nodeData;
  addNodeToCanvas(newId, nodeData);
  refreshAllConnections();
  return newId;
}

function deleteCurrentNode(id) {
  if (!allNodes[id]) return;
  $.contextMenu("destroy");
  for (let nid in allNodes) {
    if (allNodes[nid].branches)
      allNodes[nid].branches = allNodes[nid].branches.filter(
        (br) => br.targetId !== id,
      );
  }
  instance.removeAllEndpoints(id);
  $(`#${id}`).remove();
  delete allNodes[id];
  if (currentNodeId === id) {
    currentNodeId = null;
    $("#dynamicProperties").html(
      `<div class="text-muted text-center mt-5"><i class="fas fa-mouse-pointer fa-2x mb-2"></i><br>Click any node to edit or right-click for options</div>`,
    );
  }
  for (let nid in allNodes) addContextMenuToNode(nid);
  refreshAllConnections();
  toastManager.info("Node deleted");
}

function resetBuilder() {
  if (Object.keys(allNodes).length === 0) {
    toastManager.info("No nodes to clear");
    return;
  }
  $("#resetModal").modal("show");
}

function performReset() {
  $.contextMenu("destroy");
  instance?.reset();
  $("#canvas-questions").empty();
  allNodes = {};
  currentNodeId = null;
  nodeCounter = 1;
  $("#dynamicProperties").html(
    `<div class="text-muted text-center mt-5"><i class="fas fa-mouse-pointer fa-2x mb-2"></i><br>Click toolbar buttons to add nodes</div>`,
  );
  refreshAllConnections();
  toastManager.info("All nodes cleared");
  $("#resetModal").modal("hide");
}

// Add this function to fit all nodes to view
function fitAllNodesToView() {
  if (Object.keys(allNodes).length === 0) return;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let [id, node] of Object.entries(allNodes)) {
    const $el = $(`#${id}`);
    if ($el.length) {
      const left = parseFloat($el.css("left")) || 0;
      const top = parseFloat($el.css("top")) || 0;
      const width = $el.outerWidth() || 220;
      const height = $el.outerHeight() || 150;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    }
  }

  const $canvas = $(".canvas-wrap");
  const canvasWidth = $canvas.width();
  const canvasHeight = $canvas.height();

  const nodesWidth = maxX - minX;
  const nodesHeight = maxY - minY;

  const scrollLeft = Math.max(0, minX + nodesWidth / 2 - canvasWidth / 2);
  const scrollTop = Math.max(0, minY + nodesHeight / 2 - canvasHeight / 2);

  $canvas.scrollLeft(scrollLeft);
  $canvas.scrollTop(scrollTop);
}
// Add Fit to View button to toolbar
function addFitToViewButton() {
  if ($("#fitToViewBtn").length === 0) {
    $(".toolbar-buttons").append(`
      <button class="btn btn-outline-info btn-sm" id="fitToViewBtn" title="Fit all nodes to view">
        <i class="fas fa-expand"></i> Fit to View
      </button>
    `);

    $("#fitToViewBtn").on("click", fitAllNodesToView);
  }
}

$(document).ready(function () {
  instance = jsPlumb.getInstance({
    DragOptions: { cursor: "pointer" },
    Container: "canvas-questions",
    Connector: ["Bezier", { curviness: 70 }],
    Endpoint: ["Dot", { radius: 4 }],
    PaintStyle: { stroke: "#475569", lineWidth: 2 },
  });

  loadAlgorithmData();

  // Add fit to view button
  addFitToViewButton();

  $(".add-item-btn").on("click", function () {
    let type = $(this).data("type");
    createNewNode(
      type,
      50 + Math.random() * 350 + "px",
      50 + Math.random() * 250 + "px",
    );
  });

  $("#saveBtn").on("click", () => saveAlgorithmData(false));
  $("#saveAndCloseBtn").on("click", () => saveAlgorithmData(true));
  $("#confirmDeleteBtn").on("click", function () {
    if (pendingDeleteId) deleteCurrentNode(pendingDeleteId);
    $("#deleteConfirmModal").modal("hide");
    pendingDeleteId = null;
  });

  $("#resetBtn").on("click", resetBuilder);
  $("#confirmResetBtn").on("click", performReset);
});
