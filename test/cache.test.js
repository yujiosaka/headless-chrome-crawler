const assert = require('assert');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');
const { delay } = require('../lib/helper');

const KEY = '35aa17374c';

describe('Cache', () => {
  let cache;

  function testSuite() {
    describe('get and set', () => {
      it('works for null', () => (
        cache.set(KEY, null)
          .then(() => cache.get(KEY).then(value => void assert.equal(value, null)))
      ));

      it('works for number', () => (
        cache.set(KEY, 1)
          .then(() => cache.get(KEY).then(value => void assert.equal(value, 1)))
      ));

      it('works for string', () => (
        cache.set(KEY, 'http://example.com')
          .then(() => cache.get(KEY).then(value => void assert.equal(value, 'http://example.com')))
      ));

      it('works for object', () => (
        cache.set(KEY, { url: 'http://example.com' })
          .then(() => cache.get(KEY).then(value => void assert.deepEqual(value, { url: 'http://example.com' })))
      ));
    });

    describe('enqueue and dequeue', () => {
      it('works for null', () => (
        cache.enqueue(KEY, null)
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, null)))
      ));

      it('works for number', () => (
        cache.enqueue(KEY, 1)
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, 1)))
      ));

      it('works for string', () => (
        cache.enqueue(KEY, 'http://example.com')
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, 'http://example.com')))
      ));

      it('works for object', () => (
        cache.enqueue(KEY, { url: 'http://example.com' })
          .then(() => cache.dequeue(KEY).then(value => void assert.deepEqual(value, { url: 'http://example.com' })))
      ));

      it('obeys priority order', () => (
        cache.enqueue(KEY, 'http://example.com/', 0)
          .then(() => cache.enqueue(KEY, 'http://example.net/', 1))
          .then(() => cache.size(KEY).then(length => void assert.equal(length, 2)))
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, 'http://example.net/')))
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, 'http://example.com/')))
          .then(() => cache.size(KEY).then(length => void assert.equal(length, 0)))
      ));
    });

    describe('clear', () => {
      it('clears set value', () => (
        cache.set(KEY, 'http://example.com/')
          .then(() => cache.clear())
          .then(() => cache.get(KEY).then(value => void assert.equal(value, null)))
      ));

      it('clears enqueued value', () => (
        cache.enqueue(KEY, 'http://example.com/')
          .then(() => cache.clear())
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, null)))
      ));
    });

    describe('remove', () => {
      it('removes set value', () => (
        cache.set(KEY, 'http://example.com/')
          .then(() => cache.remove(KEY))
          .then(() => cache.get(KEY).then(value => void assert.equal(value, null)))
      ));

      it('removes enqueued value', () => (
        cache.enqueue(KEY, 'http://example.com/')
          .then(() => cache.remove(KEY))
          .then(() => cache.dequeue(KEY).then(value => void assert.equal(value, null)))
      ));
    });
  }

  afterEach(() => (
    cache.clear()
      .then(() => cache.close())
  ));

  describe('SessionCache', () => {
    beforeEach(() => {
      cache = new SessionCache();
      return cache.init()
        .then(() => cache.clear());
    });
    testSuite();
  });

  describe('RedisCache', () => {
    context('constructed without expire option', () => {
      beforeEach(() => {
        cache = new RedisCache();
        return cache.init()
          .then(() => cache.clear());
      });
      testSuite();
    });
    context('constructed with expire = 1', () => {
      beforeEach(() => {
        cache = new RedisCache({ expire: 1 });
        return cache.init()
          .then(() => cache.clear());
      });
      it('expires set value after wait', () => (
        cache.set(KEY, 'http://example.com/')
          .then(() => delay(1500))
          .then(() => cache.get(KEY).then(value => void assert.equal(value, null)))
      ));
      it('expires enqueued value after wait', () => (
        cache.enqueue(KEY, 'http://example.com/')
          .then(() => delay(1500))
          .then(() => cache.get(KEY).then(value => void assert.equal(value, null)))
      ));
    });
  });
});
