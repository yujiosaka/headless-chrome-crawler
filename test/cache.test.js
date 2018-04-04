const assert = require('assert');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');
const { delay } = require('../lib/helper');

const KEY = '35aa17374c';

describe('Cache', () => {
  let cache;

  function testSuite() {
    describe('get and set', () => {
      it('works for null', async () => {
        await cache.set(KEY, null);
        const value = await cache.get(KEY);
        assert.equal(value, null);
      });

      it('works for number', async () => {
        await cache.set(KEY, 1);
        const value = await cache.get(KEY);
        assert.equal(value, 1);
      });

      it('works for string', async () => {
        await cache.set(KEY, 'http://example.com');
        const value = await cache.get(KEY);
        assert.equal(value, 'http://example.com');
      });

      it('works for object', async () => {
        await cache.set(KEY, { url: 'http://example.com' });
        const value = await cache.get(KEY);
        assert.deepEqual(value, { url: 'http://example.com' });
      });
    });

    describe('enqueue and dequeue', () => {
      it('works for null', async () => {
        await cache.enqueue(KEY, null);
        const value = await cache.dequeue(KEY);
        assert.equal(value, null);
      });

      it('works for number', async () => {
        await cache.enqueue(KEY, 1);
        const value = await cache.dequeue(KEY);
        assert.equal(value, 1);
      });

      it('works for string', async () => {
        await cache.enqueue(KEY, 'http://example.com');
        const value = await cache.dequeue(KEY);
        assert.equal(value, 'http://example.com');
      });

      it('works for object', async () => {
        await cache.enqueue(KEY, { url: 'http://example.com' });
        const value = await cache.dequeue(KEY);
        assert.deepEqual(value, { url: 'http://example.com' });
      });

      it('obeys priority order', async () => {
        await cache.enqueue(KEY, 'http://example.com/', 0);
        await cache.enqueue(KEY, 'http://example.net/', 1);
        const length1 = await cache.size(KEY);
        assert.equal(length1, 2);
        const value1 = await cache.dequeue(KEY);
        assert.equal(value1, 'http://example.net/');
        const value2 = await cache.dequeue(KEY);
        assert.equal(value2, 'http://example.com/');
        const length2 = await cache.size(KEY);
        assert.equal(length2, 0);
      });
    });

    describe('clear', () => {
      it('clears set value', async () => {
        await cache.set(KEY, 'http://example.com/');
        await cache.clear();
        const value = await cache.get(KEY);
        assert.equal(value, null);
      });

      it('clears enqueued value', async () => {
        await cache.enqueue(KEY, 'http://example.com/');
        await cache.clear();
        const value = await cache.dequeue(KEY);
        assert.equal(value, null);
      });
    });

    describe('remove', () => {
      it('removes set value', async () => {
        await cache.set(KEY, 'http://example.com/');
        await cache.remove(KEY);
        const value = await cache.get(KEY);
        assert.equal(value, null);
      });

      it('removes enqueued value', async () => {
        await cache.enqueue(KEY, 'http://example.com/');
        await cache.remove(KEY);
        const value = await cache.dequeue(KEY);
        assert.equal(value, null);
      });
    });
  }

  afterEach(async () => {
    await cache.clear();
    await cache.close();
  });

  describe('SessionCache', () => {
    beforeEach(async () => {
      cache = new SessionCache();
      await cache.init();
      await cache.clear();
    });
    testSuite();
  });

  describe('RedisCache', () => {
    context('constructed without expire option', () => {
      beforeEach(async () => {
        cache = new RedisCache();
        await cache.init();
        await cache.clear();
      });
      testSuite();
    });
    context('constructed with expire = 1', () => {
      beforeEach(async () => {
        cache = new RedisCache({ expire: 1 });
        await cache.init();
        await cache.clear();
      });
      it('expires set value after wait', async () => {
        await cache.set(KEY, 'http://example.com/');
        await delay(1500);
        const value = await cache.get(KEY);
        assert.equal(value, null);
      });
      it('expires enqueued value after wait', async () => {
        await cache.enqueue(KEY, 'http://example.com/');
        await delay(1500);
        const value = await cache.get(KEY);
        assert.equal(value, null);
      });
    });
  });
});
