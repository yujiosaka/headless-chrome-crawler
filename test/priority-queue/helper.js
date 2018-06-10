class Helper {
  static tearUp(testContext) {
    beforeEach(() => {
      testContext.onPull = jest.fn();
    });
  }

  static tearDown(testContext) {
    afterEach(async () => {
      await testContext.queue.end();
      await testContext.cache.clear();
      await testContext.cache.close();
    });
  }

  static testSuite(testContext) {
    test('pulls without argument', async () => {
      testContext.queue.push(0);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
    });

    test('pulls with a number', async () => {
      testContext.queue.push(1, 0);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
      expect(testContext.onPull).toHaveBeenCalledWith(1);
    });

    test('pulls with a string', async () => {
      testContext.queue.push('http://example.com/', 0);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
      expect(testContext.onPull).toHaveBeenCalledWith('http://example.com/');
    });

    test('pulls with an object', async () => {
      testContext.queue.push({ url: 'http://example.com' }, 0);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
      expect(testContext.onPull).toHaveBeenCalledWith({ url: 'http://example.com' });
    });

    test('pulls with multiple arguments', async () => {
      testContext.queue.push({ url: 'http://example.com/' }, 1, 0);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
      expect(testContext.onPull).toHaveBeenCalledWith({ url: 'http://example.com/' }, 1);
    });

    test('obeys priority order', async () => {
      testContext.queue.push({ url: 'http://example.com/' }, 1);
      testContext.queue.push({ url: 'http://example.net/' }, 2);
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(2);
      expect(testContext.onPull.mock.calls[0][0]).toEqual({ url: 'http://example.net/' });
      expect(testContext.onPull.mock.calls[1][0]).toEqual({ url: 'http://example.com/' });
    });

    test('pauses and resumes', async () => {
      testContext.queue.push({ url: 'http://example.com/' }, 1, 0);
      await Promise.all([
        testContext.queue.onIdle(),
        testContext.queue.pause(),
      ]);
      expect(testContext.onPull).toHaveBeenCalledTimes(0);
      expect(testContext.queue.isPaused()).toBe(true);
      expect(testContext.queue.pending()).toBe(0);
      const size = await testContext.queue.size();
      expect(size).toBe(1);
      testContext.queue.resume();
      await testContext.queue.onIdle();
      expect(testContext.onPull).toHaveBeenCalledTimes(1);
    });
  }
}

module.exports = Helper;
