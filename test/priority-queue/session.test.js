const PriorityQueue = require('../../lib/priority-queue');
const SessionCache = require('../../cache/session');
const { tearUp, tearDown, testSuite } = require('./helper');

describe('PriorityQueue', () => {
  describe('when constructed with SessionCache', () => {
    tearUp(this);
    tearDown(this);

    beforeEach(async () => {
      this.cache = new SessionCache();
      await this.cache.init();
      this.queue = new PriorityQueue({
        maxConcurrency: 1,
        cache: this.cache,
      });
      this.queue.on('pull', this.onPull);
    });

    testSuite(this);
  });
});
