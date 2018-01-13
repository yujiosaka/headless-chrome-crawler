const assert = require('assert');
const sinon = require('sinon');
const { delay } = require('../lib/helper');
const PriorityQueue = require('../lib/priority-queue');
const SessionCache = require('../cache/session');
const RedisCache = require('../cache/redis');

describe('PriorityQueue', () => {
  let queue;
  let onPull;
  let cache;

  beforeEach(() => {
    onPull = sinon.spy();
  });

  afterEach(() => {
    queue.end();
    return cache.clear()
      .then(() => cache.close());
  });

  function testSuite() {
    it('pulls without argument', () => {
      queue.push(0);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 1);
        });
    });

    it('pulls with a number', () => {
      queue.push(1, 0);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 1);
          assert.ok(onPull.calledWith(1));
        });
    });

    it('pulls with a string', () => {
      queue.push('http://example.com/', 0);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 1);
          assert.ok(onPull.calledWith('http://example.com/'));
        });
    });

    it('pulls with an object', () => {
      queue.push({ url: 'http://example.com' }, 0);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 1);
          assert.ok(onPull.calledWith({ url: 'http://example.com' }));
        });
    });

    it('pulls with multiple arguments', () => {
      queue.push({ url: 'http://example.com/' }, 1, 0);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 1);
          assert.ok(onPull.calledWith({ url: 'http://example.com/' }, 1));
        });
    });

    it('obeys priority order', () => {
      queue.push({ url: 'http://example.com/' }, 1);
      queue.push({ url: 'http://example.net/' }, 2);
      return queue.onIdle()
        .then(() => {
          assert.equal(onPull.callCount, 2);
          assert.ok(onPull.firstCall.calledWith({ url: 'http://example.net/' }));
          assert.ok(onPull.secondCall.calledWith({ url: 'http://example.com/' }));
        });
    });

    it('pauses and resumes', () => {
      queue.push({ url: 'http://example.com/' }, 1, 0);
      return Promise.all([
        queue.onIdle(),
        queue.pause(),
      ])
        .then(() => {
          assert.equal(onPull.callCount, 0);
          assert.equal(queue.isPaused(), true);
          assert.equal(queue.pending(), 0);
          return queue.size();
        })
        .then(size => {
          assert.equal(size, 1);
          queue.resume();
          return queue.onIdle();
        })
        .then(() => {
          assert.equal(onPull.callCount, 1);
        });
    });
  }

  context('when constructed with SessionCache', () => {
    beforeEach(() => {
      cache = new SessionCache();
      return cache.init()
        .then(() => {
          queue = new PriorityQueue({
            maxConcurrency: 1,
            cache,
          });
          queue.on('pull', onPull);
        });
    });

    testSuite();
  });

  context('when constructed with RedisCache', () => {
    context('when queue is not registered', () => {
      beforeEach(() => {
        cache = new RedisCache();
        return cache.init()
          .then(() => {
            queue = new PriorityQueue({
              maxConcurrency: 1,
              cache,
            });
            queue.on('pull', onPull);
          });
      });

      testSuite();
    });

    context('when queue is already registered', () => {
      beforeEach(() => {
        cache = new RedisCache();
        return cache.init()
          .then(() => {
            queue = new PriorityQueue({ cache });
            queue.push({ url: 'http://example.com/' }, 1, 0);
            return Promise.all([
              queue.onIdle(),
              queue.pause(),
            ]);
          })
          .then(() => {
            queue = new PriorityQueue({ cache });
            queue.on('pull', onPull);
          });
      });

      context('when the queue is initialized', () => {
        beforeEach(() => {
          queue.init();
        });
        it('pulls from the registered queue', () => (
          queue.onIdle()
            .then(() => {
              assert.equal(onPull.callCount, 1);
              assert.ok(onPull.calledWith({ url: 'http://example.com/' }, 1));
            })
        ));
      });

      context('when the queue is not initialized', () => {
        it('does not pull from the registered', () => (
          delay(500)
            .then(() => {
              assert.equal(onPull.callCount, 0);
            })
        ));
      });
    });
  });
});
