const assert = require('assert');
const AsyncEventEmitter = require('../lib/async-events');
const { delay } = require('../lib/helper');

describe('AsyncEventEmitter', () => {
  let eventEmitter;

  beforeEach(() => {
    eventEmitter = new AsyncEventEmitter();
  });

  it('listens to an event', () => {
    let actual = 0;
    const expected = 1;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.emit('success');
    assert.equal(actual, expected);
  });

  it('listens to an event emitted multiple times', () => {
    let actual = 0;
    const expected = 2;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.emit('success');
    eventEmitter.emit('success');
    assert.equal(actual, expected);
  });

  it('listens multiple times to an event', () => {
    let actual = 0;
    const expected = 3;
    eventEmitter.on('success', () => { actual += 1; });
    eventEmitter.on('success', () => { actual += 2; });
    eventEmitter.emit('success');
    assert.equal(actual, expected);
  });

  it('listens to an event with single argument', () => {
    let actual;
    const expected = new Error('Url must be defined!');
    eventEmitter.on('error', error => { actual = error; });
    eventEmitter.emit('error', expected);
    assert.equal(actual, expected);
  });

  it('listens to an event with multiple arguments', () => {
    let actual;
    const expected = 1;
    eventEmitter.on('pull', (options, depth) => { actual = depth; });
    eventEmitter.emit('pull', { url: 'http://example.com/' }, 1);
    assert.equal(actual, expected);
  });

  it('listens to an async event', () => {
    let actual = 0;
    const expected = 0;
    eventEmitter.on('success', () => delay(100).then(() => { actual += 1; }));
    eventEmitter.emit('success');
    assert.equal(actual, expected);
  });

  it('waits until resolving async event', () => {
    let actual = 0;
    const expected = 1;
    eventEmitter.on('success', () => delay(100).then(() => { actual += 1; }));
    return eventEmitter.emit('success')
      .then(() => {
        assert.equal(actual, expected);
      });
  });
});
