const assert = require('assert');
const AsyncEventEmitter = require('../lib/async-events');
const { delay } = require('../lib/helper');

describe('AsyncEventEmitter', function () {
  let eventEmitter;

  beforeEach(function () {
    eventEmitter = new AsyncEventEmitter();
  });

  it('listens to an event', function () {
    let actual = 0;
    const expected = 1;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.emitAsync('success');
    assert.equal(actual, expected);
  });

  it('listens to an event emitted multiple times', function () {
    let actual = 0;
    const expected = 2;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.emitAsync('success');
    eventEmitter.emitAsync('success');
    assert.equal(actual, expected);
  });

  it('listens multiple times to an event', function () {
    let actual = 0;
    const expected = 3;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.on('success', () => { actual += 2; });
    eventEmitter.emitAsync('success');
    assert.equal(actual, expected);
  });

  it('listens to an event with single argument', function () {
    let actual;
    const expected = new Error('Url must be defined!');
    eventEmitter.on('error', error => { actual = error; });
    eventEmitter.emitAsync('error', expected);
    assert.equal(actual, expected);
  });

  it('listens to an event with multiple arguments', function () {
    let actual;
    const expected = 1;
    eventEmitter.on('pull', (options, depth) => { actual = depth; });
    eventEmitter.emitAsync('pull', { url: 'http://example.com/' }, 1);
    assert.equal(actual, expected);
  });

  it('listens to an async event', function () {
    let actual = 0;
    const expected = 0;
    eventEmitter.on('success', async () => {
      await delay(100);
      actual += 1;
    });
    eventEmitter.emitAsync('success');
    assert.equal(actual, expected);
  });

  it('waits until resolving async event', async function () {
    let actual = 0;
    const expected = 1;
    eventEmitter.on('success', async () => {
      await delay(100);
      actual += 1;
    });
    await eventEmitter.emitAsync('success');
    assert.equal(actual, expected);
  });
});
