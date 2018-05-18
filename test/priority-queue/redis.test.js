const { delay } = require('../../lib/helper');
const PriorityQueue = require('../../lib/priority-queue');
const RedisCache = require('../../cache/redis');
const { tearUp, tearDown, testSuite } = require('./helper');

describe('PriorityQueue', () => {
  describe('when constructed with RedisCache', () => {
    describe('when queue is not registered', () => {
      tearUp(this);
      tearDown(this);

      beforeEach(async () => {
        this.cache = new RedisCache();
        await this.cache.init();
        this.queue = new PriorityQueue({
          maxConcurrency: 1,
          cache: this.cache,
        });
        this.queue.on('pull', this.onPull);
      });

      testSuite(this);
    });

    describe('when queue is already registered', () => {
      tearUp(this);
      tearDown(this);

      beforeEach(async () => {
        this.cache = new RedisCache();
        await this.cache.init();
        this.queue = new PriorityQueue({ cache: this.cache });
        this.queue.push({ url: 'http://example.com/' }, 1, 0);
        await Promise.all([
          this.queue.onIdle(),
          this.queue.pause(),
        ]);
        this.queue = new PriorityQueue({ cache: this.cache });
        this.queue.on('pull', this.onPull);
      });

      describe('when the queue is initialized', () => {
        beforeEach(() => {
          this.queue.init();
        });
        test('pulls from the registered queue', async () => {
          await this.queue.onIdle();
          expect(this.onPull).toHaveBeenCalledTimes(1);
          expect(this.onPull).toHaveBeenCalledWith({ url: 'http://example.com/' }, 1);
        });
      });

      describe('when the queue is not initialized', () => {
        test('does not pull from the registered', async () => {
          await delay(500);
          expect(this.onPull).toHaveBeenCalledTimes(0);
        });
      });
    });
  });
});
