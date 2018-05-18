const AsyncEventEmitter = require('../lib/async-events');
const { delay } = require('../lib/helper');

describe('AsyncEventEmitter', () => {
  beforeEach(() => {
    this.eventEmitter = new AsyncEventEmitter();
  });

  test('listens to an event', () => {
    let actual = 0;
    const expected = 1;
    this.eventEmitter.on('success', () => { actual += 1; });
    this.eventEmitter.emitAsync('success');
    expect(actual).toBe(expected);
  });

  test('listens to an event emitted multiple times', () => {
    let actual = 0;
    const expected = 2;
    this.eventEmitter.on('success', () => { actual += 1; });
    this.eventEmitter.emitAsync('success');
    this.eventEmitter.emitAsync('success');
    expect(actual).toBe(expected);
  });

  test('listens multiple times to an event', () => {
    let actual = 0;
    const expected = 3;
    this.eventEmitter.on('success', () => { actual += 1; });
    this.eventEmitter.on('success', () => { actual += 2; });
    this.eventEmitter.emitAsync('success');
    expect(actual).toBe(expected);
  });

  test('listens to an event with single argument', () => {
    let actual;
    const expected = new Error('Url must be defined!');
    this.eventEmitter.on('error', error => { actual = error; });
    this.eventEmitter.emitAsync('error', expected);
    expect(actual).toBe(expected);
  });

  test('listens to an event with multiple arguments', () => {
    let actual;
    const expected = 1;
    this.eventEmitter.on('pull', (options, depth) => { actual = depth; });
    this.eventEmitter.emitAsync('pull', { url: 'http://example.com/' }, 1);
    expect(actual).toBe(expected);
  });

  test('listens to an async event', () => {
    let actual = 0;
    const expected = 0;
    this.eventEmitter.on('success', async () => {
      await delay(100);
      actual += 1;
    });
    this.eventEmitter.emitAsync('success');
    expect(actual).toBe(expected);
  });

  test('waits until resolving async event', async () => {
    let actual = 0;
    const expected = 1;
    this.eventEmitter.on('success', async () => {
      await delay(100);
      actual += 1;
    });
    await this.eventEmitter.emitAsync('success');
    expect(actual).toBe(expected);
  });
});
