const EventEmitter = {

  events : new Map(),

  // 订阅事件
  on(eventName, callback) {
    let callbacks = this.events.get(eventName);
    if (!callbacks) {
      callbacks = new Set();
      this.events.set(eventName, callbacks);
    }
    callbacks.add(callback);
    
    // 返回取消订阅的函数
    return () => {
      this.off(eventName, callback);
    };
  },

  // 取消订阅
  off(eventName, callback) {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(eventName);
      }
    }
  },

  // 发布事件
  emit(eventName, ...args) {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        callback(...args);
      });
    }
  },

  // 只订阅一次
  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(eventName, wrapper);
    };
    this.on(eventName, wrapper);
  }
}

module.exports = EventEmitter;