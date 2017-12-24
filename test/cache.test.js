const assert = require('assert');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');

const KEY = '35aa17374c';

describe('Cache', () => {
  let cache;

  function itPassesTestSuits() {
    it('passes test suites', () => (
      cache.set(KEY)
        .then(() => cache.exists(KEY))
        .then(exists => void assert.ok(exists))
        .then(() => cache.remove(KEY))
        .then(() => cache.exists(KEY))
        .then(exists => void assert.ok(!exists))
        .then(() => cache.set(KEY))
        .then(() => cache.clear())
        .then(exists => void assert.ok(!exists))
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
    beforeEach(() => {
      cache = new RedisCache();
      return cache.init()
        .then(() => cache.clear());
    });
    itPassesTestSuits();
  });
});
