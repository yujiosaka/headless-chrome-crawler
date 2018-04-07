const assert = require('assert');
const sinon = require('sinon');

class Helper {
  static tearUp() {
    beforeEach(function () {
      this.onPull = sinon.spy();
    });
  }

  static tearDown() {
    afterEach(async function () {
      await this.queue.end();
      await this.cache.clear();
      await this.cache.close();
    });
  }

  static testSuite() {
    it('pulls without argument', async function () {
      this.queue.push(0);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
    });

    it('pulls with a number', async function () {
      this.queue.push(1, 0);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
      assert.ok(this.onPull.calledWith(1));
    });

    it('pulls with a string', async function () {
      this.queue.push('http://example.com/', 0);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
      assert.ok(this.onPull.calledWith('http://example.com/'));
    });

    it('pulls with an object', async function () {
      this.queue.push({ url: 'http://example.com' }, 0);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
      assert.ok(this.onPull.calledWith({ url: 'http://example.com' }));
    });

    it('pulls with multiple arguments', async function () {
      this.queue.push({ url: 'http://example.com/' }, 1, 0);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
      assert.ok(this.onPull.calledWith({ url: 'http://example.com/' }, 1));
    });

    it('obeys priority order', async function () {
      this.queue.push({ url: 'http://example.com/' }, 1);
      this.queue.push({ url: 'http://example.net/' }, 2);
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 2);
      assert.ok(this.onPull.firstCall.calledWith({ url: 'http://example.net/' }));
      assert.ok(this.onPull.secondCall.calledWith({ url: 'http://example.com/' }));
    });

    it('pauses and resumes', async function () {
      this.queue.push({ url: 'http://example.com/' }, 1, 0);
      await Promise.all([
        this.queue.onIdle(),
        this.queue.pause(),
      ]);
      assert.equal(this.onPull.callCount, 0);
      assert.equal(this.queue.isPaused(), true);
      assert.equal(this.queue.pending(), 0);
      const size = await this.queue.size();
      assert.equal(size, 1);
      this.queue.resume();
      await this.queue.onIdle();
      assert.equal(this.onPull.callCount, 1);
    });
  }
}

module.exports = Helper;
