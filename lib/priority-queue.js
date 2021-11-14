const noop = require('lodash/noop');
const AsyncEventEmitter = require('./async-events');
const Helper = require('./helper');

const KEY = 'queue';
const INTERVAL = 200;

class PriorityQueue extends AsyncEventEmitter {
  /**
   * @param {!Object} options
   */
  constructor(options) {
    super();
    this._cache = options.cache;
    this._maxConcurrency = options.maxConcurrency || Infinity;
    this._isPaused = false;
    this._pendingCount = 0;
    this._resolveIdle = noop;
  }

  init() {
    this._watch();
  }

  end() {
    this._unwatch();
  }

  /**
   * @param {...*} args
   */
  async push(...args) {
    const priority = args.pop();
    await this._cache.enqueue(KEY, args, priority);
    this._pull();
  }

  pause() {
    this._isPaused = true;
    this._unwatch();
    this._resolveIdle();
  }

  resume() {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._watch();
    this._pull();
  }

  /**
   * @return {!boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * @return {!number}
   */
  pending() {
    return this._pendingCount;
  }

  /**
   * @return {!Promise<!number>}
   */
  size() {
    return this._cache.size(KEY);
  }

  /**
   * @return {!Promise}
   */
  onIdle() {
    return new Promise(resolve => {
      this._resolveIdle = resolve;
    });
  }

  /**
   * @private
   */
  async _pull() {
    if (this._isPaused) return;
    if (this._pendingCount >= this._maxConcurrency) return;
    this._pendingCount += 1;
    const args = await this._cache.dequeue(KEY);
    if (!args) {
      this._pendingCount -= 1;
      if (this._pendingCount === 0) this._resolveIdle();
      return;
    }
    await this.emitAsync('pull', ...args);
    this._pendingCount -= 1;
    this._pull();
  }

  /**
   * @private
   */
  _watch() {
    this._unwatch();
    this._interval = setInterval(() => { this._pull(); }, INTERVAL);
  }

  /**
   * @private
   */
  _unwatch() {
    clearInterval(this._interval);
  }
}

Helper.tracePublicAPI(PriorityQueue);

module.exports = PriorityQueue;
