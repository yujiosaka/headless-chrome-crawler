const assert = require('assert');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');
const { delay } = require('../lib/helper');

const KEY = '35aa17374c';
const VALUE = '1';

describe('Cache', () => {
  let cache;

  function itPassesTestSuits() {
    it('passes test suites', () => (
      cache.set(KEY, VALUE)
        .then(() => cache.get(KEY))
        .then(value => void assert.equal(value, VALUE))
        .then(() => cache.remove(KEY))
        .then(() => cache.get(KEY))
        .then(value => void assert.equal(value, null))
        .then(() => cache.set(KEY, VALUE))
        .then(() => cache.clear())
        .then(value => void assert.equal(value, null))
    ));
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
    itPassesTestSuits();
  });

  describe('RedisCache', () => {
    context('constructed without expire option', () => {
      beforeEach(() => {
        cache = new RedisCache();
        return cache.init()
          .then(() => cache.clear());
      });
      itPassesTestSuits();
    });
    context('constructed with expire = 1', () => {
      beforeEach(() => {
        cache = new RedisCache({ expire: 1 });
        return cache.init()
          .then(() => cache.clear());
      });
      it('expires after wait', () => (
        cache.set(KEY, VALUE)
          .then(() => delay(1500))
          .then(() => cache.get(KEY))
          .then(value => void assert.equal(value, null))
      ));
    });
  });
});
