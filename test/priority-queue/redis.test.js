const assert = require('assert');
const { delay } = require('../../lib/helper');
const PriorityQueue = require('../../lib/priority-queue');
const RedisCache = require('../../cache/redis');
const { tearUp, tearDown, testSuite } = require('./helper');

describe('PriorityQueue', function () {
  context('when constructed with RedisCache', function () {
    context('when queue is not registered', function () {
      tearUp();
      tearDown();

      beforeEach(async function () {
        this.cache = new RedisCache();
        await this.cache.init();
        this.queue = new PriorityQueue({
          maxConcurrency: 1,
          cache: this.cache,
        });
        this.queue.on('pull', this.onPull);
      });

      testSuite();
    });

    context('when queue is already registered', function () {
      tearUp();
      tearDown();

      beforeEach(async function () {
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

      context('when the queue is initialized', function () {
        beforeEach(function () {
          this.queue.init();
        });
        it('pulls from the registered queue', async function () {
          await this.queue.onIdle();
          assert.equal(this.onPull.callCount, 1);
          assert.ok(this.onPull.calledWith({ url: 'http://example.com/' }, 1));
        });
      });

      context('when the queue is not initialized', function () {
        it('does not pull from the registered', async function () {
          await delay(500);
          assert.equal(this.onPull.callCount, 0);
        });
      });
    });
  });
});
