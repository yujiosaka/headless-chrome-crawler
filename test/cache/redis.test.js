const assert = require('assert');
const RedisCache = require('../../cache/redis');
const { delay } = require('../../lib/helper');
const { tearUp, tearDown, testSuite } = require('./helper');

const KEY = '35aa17374c';

describe('Cache', function () {
  describe('RedisCache', function () {
    context('constructed without expire option', function () {
      beforeEach(async function () {
        this.cache = new RedisCache();
      });

      tearUp();
      tearDown();
      testSuite();
    });

    context('constructed with expire = 1', function () {
      beforeEach(async function () {
        this.cache = new RedisCache({ expire: 1 });
      });

      tearUp();
      tearDown();

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
});
