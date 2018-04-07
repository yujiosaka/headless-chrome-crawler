const assert = require('assert');

const KEY = '35aa17374c';

class Helper {
  static tearUp() {
    beforeEach(async function () {
      await this.cache.init();
      await this.cache.clear();
    });
  }

  static tearDown() {
    afterEach(async function () {
      await this.cache.clear();
      await this.cache.close();
    });
  }

  static testSuite() {
    describe('get and set', function () {
      it('works for null', async function () {
        await this.cache.set(KEY, null);
        const value = await this.cache.get(KEY);
        assert.equal(value, null);
      });

      it('works for number', async function () {
        await this.cache.set(KEY, 1);
        const value = await this.cache.get(KEY);
        assert.equal(value, 1);
      });

      it('works for string', async function () {
        await this.cache.set(KEY, 'http://example.com');
        const value = await this.cache.get(KEY);
        assert.equal(value, 'http://example.com');
      });

      it('works for object', async function () {
        await this.cache.set(KEY, { url: 'http://example.com' });
        const value = await this.cache.get(KEY);
        assert.deepEqual(value, { url: 'http://example.com' });
      });
    });

    describe('enqueue and dequeue', function () {
      it('works for null', async function () {
        await this.cache.enqueue(KEY, null);
        const value = await this.cache.dequeue(KEY);
        assert.equal(value, null);
      });

      it('works for number', async function () {
        await this.cache.enqueue(KEY, 1);
        const value = await this.cache.dequeue(KEY);
        assert.equal(value, 1);
      });

      it('works for string', async function () {
        await this.cache.enqueue(KEY, 'http://example.com');
        const value = await this.cache.dequeue(KEY);
        assert.equal(value, 'http://example.com');
      });

      it('works for object', async function () {
        await this.cache.enqueue(KEY, { url: 'http://example.com' });
        const value = await this.cache.dequeue(KEY);
        assert.deepEqual(value, { url: 'http://example.com' });
      });

      it('obeys priority order', async function () {
        await this.cache.enqueue(KEY, 'http://example.com/', 0);
        await this.cache.enqueue(KEY, 'http://example.net/', 1);
        const length1 = await this.cache.size(KEY);
        assert.equal(length1, 2);
        const value1 = await this.cache.dequeue(KEY);
        assert.equal(value1, 'http://example.net/');
        const value2 = await this.cache.dequeue(KEY);
        assert.equal(value2, 'http://example.com/');
        const length2 = await this.cache.size(KEY);
        assert.equal(length2, 0);
      });
    });

    describe('clear', function () {
      it('clears set value', async function () {
        await this.cache.set(KEY, 'http://example.com/');
        await this.cache.clear();
        const value = await this.cache.get(KEY);
        assert.equal(value, null);
      });

      it('clears enqueued value', async function () {
        await this.cache.enqueue(KEY, 'http://example.com/');
        await this.cache.clear();
        const value = await this.cache.dequeue(KEY);
        assert.equal(value, null);
      });
    });

    describe('remove', function () {
      it('removes set value', async function () {
        await this.cache.set(KEY, 'http://example.com/');
        await this.cache.remove(KEY);
        const value = await this.cache.get(KEY);
        assert.equal(value, null);
      });

      it('removes enqueued value', async function () {
        await this.cache.enqueue(KEY, 'http://example.com/');
        await this.cache.remove(KEY);
        const value = await this.cache.dequeue(KEY);
        assert.equal(value, null);
      });
    });
  }
}

module.exports = Helper;
