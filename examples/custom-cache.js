const fs = require('fs');
const HCCrawler = require('headless-chrome-crawler');
const BaseCache = require('headless-chrome-crawler/cache/base');

const FILE = './tmp/fs-cache.json';

// Create a new cache by extending BaseCache interface
class FsCache extends BaseCache {
  init() {
    fs.writeFileSync(this._settings.file, '{}');
    return Promise.resolve();
  }
  clear() {
    fs.unlinkSync(this._settings.file);
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  get(key) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    return Promise.resolve(obj[key] || null);
  }
  set(key, value) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    obj[key] = value;
    fs.writeFileSync(this._settings.file, JSON.stringify(obj));
    return Promise.resolve();
  }
  enqueue(key, value, priority) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    const queue = obj[key] || [];
    const item = { value, priority };
    queue.push(item);
    queue.sort((a, b) => b.priority - a.priority);
    obj[key] = queue;
    fs.writeFileSync(this._settings.file, JSON.stringify(obj));
    return Promise.resolve();
  }
  dequeue(key) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    const queue = obj[key] || [];
    const item = queue.shift();
    fs.writeFileSync(FILE, JSON.stringify(obj));
    if (!item) return Promise.resolve(null);
    return Promise.resolve(item.value);
  }
  size(key) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    if (!obj[key]) return Promise.resolve(0);
    return Promise.resolve(obj[key].length);
  }
  remove(key) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    delete obj[key];
    fs.writeFileSync(FILE, JSON.stringify(obj));
    return Promise.resolve();
  }
}

const cache = new FsCache({ file: FILE });

(async () => {
  const crawler = await HCCrawler.launch({
    maxConcurrency: 1,
    onSuccess: (result => {
      console.log(`Requested ${result.options.url}.`);
    }),
    cache,
  });
  crawler.queue('https://example.com/');
  crawler.queue('https://example.net/');
  crawler.queue('https://example.com/'); // The queue won't be requested
  await crawler.onIdle();
  await crawler.close();
})();
