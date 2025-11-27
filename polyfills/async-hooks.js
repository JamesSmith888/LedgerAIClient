
class AsyncLocalStorage {
  constructor() {
    this.store = null;
  }

  run(store, callback, ...args) {
    const oldStore = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = oldStore;
    }
  }

  getStore() {
    return this.store;
  }
  
  enterWith(store) {
      this.store = store;
  }
  
  disable() {
      this.store = null;
  }
  
  exit(callback, ...args) {
      // Simple implementation, might not be perfect
      return callback(...args);
  }
}

module.exports = { AsyncLocalStorage };
