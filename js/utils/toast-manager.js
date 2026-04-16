class ToastManager {
  constructor() {
    this.toasts = [];
    this.containerId = "toast-container";
    this.defaultDuration = 3000;
    this.initContainer();
  }

  initContainer() {
    if ($(`#${this.containerId}`).length === 0) {
      $("body").append(`
        <div id="${this.containerId}" style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
        "></div>
      `);
    }
  }

  show(message, type = "success", duration = this.defaultDuration) {
    const icons = {
      success: "fa-check-circle",
      danger: "fa-exclamation-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const colors = {
      success: "#28a745",
      danger: "#dc3545",
      error: "#dc3545",
      warning: "#ffc107",
      info: "#17a2b8",
    };

    const icon = icons[type] || icons.info;
    const color = colors[type] || colors.info;
    const textColor = type === "warning" ? "#000" : "#fff";
    const id =
      "toast_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const toastHtml = `
      <div id="${id}" class="toast-message" style="
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        overflow: hidden;
        animation: slideInRight 0.3s ease;
        min-width: 300px;
        max-width: 400px;
      ">
        <div style="
          background: ${color};
          color: ${textColor};
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <i class="fas ${icon}" style="font-size: 18px;"></i>
          <span style="flex: 1; font-size: 14px; font-weight: 500;">${this.escapeHtml(message)}</span>
          <button class="toast-close-btn" data-toast-id="${id}" style="
            background: none;
            border: none;
            color: ${textColor};
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.2s;
          ">&times;</button>
        </div>
      </div>
    `;

    $(`#${this.containerId}`).append(toastHtml);

    $(`#${id} .toast-close-btn`)
      .off("click")
      .on("click", () => {
        this.remove(id);
      });

    setTimeout(() => {
      this.remove(id);
    }, duration);

    this.toasts.push({ id, element: $(`#${id}`) });
    return id;
  }

  remove(id) {
    const toast = this.toasts.find((t) => t.id === id);
    if (toast && toast.element.length) {
      toast.element.css("animation", "slideOutRight 0.3s ease");
      setTimeout(() => {
        toast.element.remove();
      }, 300);
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }
  }

  removeAll() {
    this.toasts.forEach((toast) => {
      if (toast.element.length) {
        toast.element.remove();
      }
    });
    this.toasts = [];
  }

  success(message, duration) {
    return this.show(message, "success", duration);
  }

  error(message, duration) {
    return this.show(message, "error", duration);
  }

  warning(message, duration) {
    return this.show(message, "warning", duration);
  }

  info(message, duration) {
    return this.show(message, "info", duration);
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function (m) {
      return m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;";
    });
  }
}

// Add animation styles
if (!$("#toast-animation-styles").length) {
  $("head").append(`
    <style id="toast-animation-styles">
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    </style>
  `);
}

// Create global instance
window.toastManager = new ToastManager();
