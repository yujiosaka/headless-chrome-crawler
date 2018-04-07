const assert = require('assert');
const RedisCache = require('../../cache/redis');
const { delay } = require('../../lib/helper');
const { testSuite, closeCacheAfterEach } = require('./helper');

const KEY = '35aa17374c';

describe('RedisCache', function () {
  context('constructed without expire option', function () {
    beforeEach(async function () {
      this.cache = new RedisCache();
      await this.cache.init();
      await this.cache.clear();
    });
    closeCacheAfterEach();
    testSuite();
  });

  context('constructed with expire = 1', function () {
    beforeEach(async function () {
      this.cache = new RedisCache({ expire: 1 });
      await this.cache.init();
      await this.cache.clear();
    });

    closeCacheAfterEach();

    it('expires set value after wait', async function () {
      await this.cache.set(KEY, 'http://example.com/');
      await delay(1500);
      const value = await this.cache.get(KEY);
      assert.equal(value, null);
    });

    it('expires enqueued value after wait', async function () {
      await this.cache.enqueue(KEY, 'http://example.com/');
      await delay(1500);
      const value = await this.cache.get(KEY);
      assert.equal(value, null);
    });
  });
});
