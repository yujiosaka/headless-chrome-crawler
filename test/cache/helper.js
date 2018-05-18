const KEY = '35aa17374c';

class Helper {
  static tearUp(testContext) {
    beforeEach(async () => {
      await testContext.cache.init();
      await testContext.cache.clear();
    });
  }

  static tearDown(testContext) {
    afterEach(async () => {
      await testContext.cache.clear();
      await testContext.cache.close();
    });
  }

  static testSuite(testContext) {
    describe('get and set', () => {
      test('works for null', async () => {
        await testContext.cache.set(KEY, null);
        const value = await testContext.cache.get(KEY);
        expect(value).toBeNull();
      });

      test('works for number', async () => {
        await testContext.cache.set(KEY, 1);
        const value = await testContext.cache.get(KEY);
        expect(value).toBe(1);
      });

      test('works for string', async () => {
        await testContext.cache.set(KEY, 'http://example.com');
        const value = await testContext.cache.get(KEY);
        expect(value).toBe('http://example.com');
      });

      test('works for object', async () => {
        await testContext.cache.set(KEY, { url: 'http://example.com' });
        const value = await testContext.cache.get(KEY);
        expect(value).toEqual({ url: 'http://example.com' });
      });
    });

    describe('enqueue and dequeue', () => {
      test('works for null', async () => {
        await testContext.cache.enqueue(KEY, null);
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toBeNull();
      });

      test('works for number', async () => {
        await testContext.cache.enqueue(KEY, 1);
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toBe(1);
      });

      test('works for string', async () => {
        await testContext.cache.enqueue(KEY, 'http://example.com');
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toBe('http://example.com');
      });

      test('works for object', async () => {
        await testContext.cache.enqueue(KEY, { url: 'http://example.com' });
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toEqual({ url: 'http://example.com' });
      });

      test('obeys priority order', async () => {
        await testContext.cache.enqueue(KEY, 'http://example.com/', 0);
        await testContext.cache.enqueue(KEY, 'http://example.net/', 1);
        const length1 = await testContext.cache.size(KEY);
        expect(length1).toBe(2);
        const value1 = await testContext.cache.dequeue(KEY);
        expect(value1).toBe('http://example.net/');
        const value2 = await testContext.cache.dequeue(KEY);
        expect(value2).toBe('http://example.com/');
        const length2 = await testContext.cache.size(KEY);
        expect(length2).toBe(0);
      });
    });

    describe('clear', () => {
      test('clears set value', async () => {
        await testContext.cache.set(KEY, 'http://example.com/');
        await testContext.cache.clear();
        const value = await testContext.cache.get(KEY);
        expect(value).toBeNull();
      });

      test('clears enqueued value', async () => {
        await testContext.cache.enqueue(KEY, 'http://example.com/');
        await testContext.cache.clear();
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toBeNull();
      });
    });

    describe('remove', () => {
      test('removes set value', async () => {
        await testContext.cache.set(KEY, 'http://example.com/');
        await testContext.cache.remove(KEY);
        const value = await testContext.cache.get(KEY);
        expect(value).toBeNull();
      });

      test('removes enqueued value', async () => {
        await testContext.cache.enqueue(KEY, 'http://example.com/');
        await testContext.cache.remove(KEY);
        const value = await testContext.cache.dequeue(KEY);
        expect(value).toBeNull();
      });
    });
  }
}

module.exports = Helper;
