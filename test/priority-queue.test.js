const assert = require('assert');
const sinon = require('sinon');
const { delay } = require('../lib/helper');
const PriorityQueue = require('../lib/priority-queue');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');

describe('PriorityQueue', function () {
  let queue;
  let onPull;
  let cache;

  beforeEach(function () {
    onPull = sinon.spy();
  });

  afterEach(async function () {
    await queue.end();
    await cache.clear();
    await cache.close();
  });

  function testSuite() {
    it('pulls without argument', async function () {
      queue.push(0);
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
    });

    it('pulls with a number', async function () {
      queue.push(1, 0);
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
      assert.ok(onPull.calledWith(1));
    });

    it('pulls with a string', async function () {
      queue.push('http://example.com/', 0);
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
      assert.ok(onPull.calledWith('http://example.com/'));
    });

    it('pulls with an object', async function () {
      queue.push({ url: 'http://example.com' }, 0);
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
      assert.ok(onPull.calledWith({ url: 'http://example.com' }));
    });

    it('pulls with multiple arguments', async function () {
      queue.push({ url: 'http://example.com/' }, 1, 0);
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
      assert.ok(onPull.calledWith({ url: 'http://example.com/' }, 1));
    });

    it('obeys priority order', async function () {
      queue.push({ url: 'http://example.com/' }, 1);
      queue.push({ url: 'http://example.net/' }, 2);
      await queue.onIdle();
      assert.equal(onPull.callCount, 2);
      assert.ok(onPull.firstCall.calledWith({ url: 'http://example.net/' }));
      assert.ok(onPull.secondCall.calledWith({ url: 'http://example.com/' }));
    });

    it('pauses and resumes', async function () {
      queue.push({ url: 'http://example.com/' }, 1, 0);
      await Promise.all([
        queue.onIdle(),
        queue.pause(),
      ]);
      assert.equal(onPull.callCount, 0);
      assert.equal(queue.isPaused(), true);
      assert.equal(queue.pending(), 0);
      const size = await queue.size();
      assert.equal(size, 1);
      queue.resume();
      await queue.onIdle();
      assert.equal(onPull.callCount, 1);
    });
  }

  context('when constructed with SessionCache', function () {
    beforeEach(async function () {
      cache = new SessionCache();
      await cache.init();
      queue = new PriorityQueue({
        maxConcurrency: 1,
        cache,
      });
      queue.on('pull', onPull);
    });

    testSuite();
  });

  context('when constructed with RedisCache', function () {
    context('when queue is not registered', function () {
      beforeEach(async function () {
        cache = new RedisCache();
        await cache.init();
        queue = new PriorityQueue({
          maxConcurrency: 1,
          cache,
        });
        queue.on('pull', onPull);
      });

      testSuite();
    });

    context('when queue is already registered', function () {
      beforeEach(async function () {
        cache = new RedisCache();
        await cache.init();
        queue = new PriorityQueue({ cache });
        queue.push({ url: 'http://example.com/' }, 1, 0);
        await Promise.all([
          queue.onIdle(),
          queue.pause(),
        ]);
        queue = new PriorityQueue({ cache });
        queue.on('pull', onPull);
      });

      context('when the queue is initialized', function () {
        beforeEach(function () {
          queue.init();
        });
        it('pulls from the registered queue', async function () {
          await queue.onIdle();
          assert.equal(onPull.callCount, 1);
          assert.ok(onPull.calledWith({ url: 'http://example.com/' }, 1));
        });
      });

      context('when the queue is not initialized', function () {
        it('does not pull from the registered', async function () {
          await delay(500);
          assert.equal(onPull.callCount, 0);
        });
      });
    });
  });
});
