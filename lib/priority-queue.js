const AsyncEventEmitter = require('./async-events');
const { noop } = require('lodash');
const { tracePublicAPI } = require('./helper');

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
  push(...args) {
    const priority = args.pop();
    this._cache.enqueue(KEY, args, priority)
      .then(() => void this._pull());
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
  _pull() {
    if (this._isPaused) return;
    if (this._pendingCount >= this._maxConcurrency) return;
    this._pendingCount += 1;
    this._cache.dequeue(KEY)
      .then(args => {
        if (!args) {
          this._pendingCount -= 1;
          if (this._pendingCount === 0) this._resolveIdle();
          return;
        }
        this.emitAsync('pull', ...args)
          .then(() => {
            this._pendingCount -= 1;
            this._pull();
          });
      });
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

tracePublicAPI(PriorityQueue);

module.exports = PriorityQueue;
