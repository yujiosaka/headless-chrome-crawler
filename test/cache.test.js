const assert = require('assert');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');

const KEY = '35aa17374c';
const VALUE = '1';

describe('Cache', () => {
  let cache;

  function itPassesTestSuits() {
    it('passes test suites', () => (
      cache.set(KEY, VALUE)
        .then(() => cache.get(KEY))
        .then(get => void assert.equal(get, VALUE))
        .then(() => cache.remove(KEY))
        .then(() => cache.get(KEY))
        .then(get => void assert.equal(get, null))
        .then(() => cache.set(KEY, VALUE))
        .then(() => cache.clear())
        .then(get => void assert.equal(get, null))
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
