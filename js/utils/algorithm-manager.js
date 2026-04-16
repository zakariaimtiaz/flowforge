class AlgorithmManager {
  constructor() {
    this.storageKey = "flowforge_algorithms";
  }

  loadAlgorithms() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  }

  saveAlgorithms(algorithms) {
    localStorage.setItem(this.storageKey, JSON.stringify(algorithms));
  }

  getAlgorithm(id) {
    const algorithms = this.loadAlgorithms();
    return algorithms[id];
  }

  createAlgorithm(name, type, description) {
    const algorithms = this.loadAlgorithms();
    const id =
      "algo_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const algorithm = {
      id: id,
      name: name,
      type: type,
      description: description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: {},
      version: "1.0",
    };
    algorithms[id] = algorithm;
    this.saveAlgorithms(algorithms);
    return algorithm;
  }

  updateAlgorithm(id, updates) {
    const algorithms = this.loadAlgorithms();
    if (algorithms[id]) {
      algorithms[id] = {
        ...algorithms[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveAlgorithms(algorithms);
      return algorithms[id];
    }
    return null;
  }

  deleteAlgorithm(id) {
    const algorithms = this.loadAlgorithms();
    if (algorithms[id]) {
      delete algorithms[id];
      this.saveAlgorithms(algorithms);
      return true;
    }
    return false;
  }

  getAllAlgorithms() {
    return this.loadAlgorithms();
  }

  getAlgorithmList() {
    const algorithms = this.loadAlgorithms();
    return Object.keys(algorithms).map((id) => ({
      id: id,
      name: algorithms[id].name,
      type: algorithms[id].type,
      description: algorithms[id].description,
      updatedAt: algorithms[id].updatedAt,
    }));
  }
}

// Create global instance
window.algorithmManager = new AlgorithmManager();
