const AsyncEventEmitter = require('./async-events');
const { tracePublicAPI } = require('./helper');

const KEY = 'queue';
const INTERVAL = 500;

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
  }

  /**
   * @return {!Promise}
   */
  init() {
    return this._watch();
  }

  /**
   * @param {...*} args
   * @return {!Promise}
   */
  push(...args) {
    const priority = args.pop() || 0;
    return this._cache.enqueue(KEY, args, priority)
      .then(() => this._pull());
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
  pause() {
    this._isPaused = true;
    return this._idle();
  }

  /**
   * @return {!Promise}
   */
  resume() {
    if (!this._isPaused) return Promise.resolve();
    this._isPaused = false;
    return this._watch();
  }

  /**
   * @return {!boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * @return {!Promise}
   * @private
   */
  _pull() {
    if (this._isPaused || this._pendingCount > this._maxConcurrency) return Promise.resolve();
    this._pendingCount += 1;
    return this._cache.dequeue(KEY)
      .then(args => {
        if (!args) {
          this._pendingCount -= 1;
          if (this._pendingCount === 0) this._idle();
          return;
        }
        this.emit('pull', ...args)
          .then(() => {
            this._pendingCount -= 1;
            this._pull();
          });
      });
  }

  /**
   * @return {!Promise}
   * @private
   */
  _watch() {
    clearInterval(this._interval);
    this._interval = setInterval(() => { this._pull(); }, INTERVAL);
    return this._pull();
  }

  /**
   * @return {!Promise}
   * @private
   */
  _idle() {
    clearInterval(this._interval);
    return this.emit('idle');
  }
}

tracePublicAPI(PriorityQueue);

module.exports = PriorityQueue;
