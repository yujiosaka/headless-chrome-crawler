const RedisCache = require('../../cache/redis');
const { delay } = require('../../lib/helper');
const { tearUp, tearDown, testSuite } = require('./helper');

const KEY = '35aa17374c';

describe('Cache', () => {
  describe('RedisCache', () => {
    describe('constructed without expire option', () => {
      beforeEach(async () => {
        this.cache = new RedisCache();
      });

      tearUp(this);
      tearDown(this);
      testSuite(this);
    });

    describe('constructed with expire = 1', () => {
      beforeEach(async () => {
        this.cache = new RedisCache({ expire: 1 });
      });

      tearUp(this);
      tearDown(this);

      test('expires set value after wait', async () => {
        await this.cache.set(KEY, 'http://example.com/');
        await delay(1500);
        const value = await this.cache.get(KEY);
        expect(value).toBeNull();
      });

      test('expires enqueued value after wait', async () => {
        await this.cache.enqueue(KEY, 'http://example.com/');
        await delay(1500);
        const value = await this.cache.get(KEY);
        expect(value).toBeNull();
      });
    });
  });
});
