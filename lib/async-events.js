const EventEmitter = require('events');

class AsyncEventEmitter extends EventEmitter {
  /**
   * @param {!string} event
   * @param {...*} args
   * @return {!Promise}
   */
  emitAsync(event, ...args) {
    const promises = [];
    this.listeners(event).forEach(listener => {
      promises.push(listener(...args));
    });
    return Promise.all(promises);
  }
}

module.exports = AsyncEventEmitter;
