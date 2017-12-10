const fs = require('fs');
const { resolve } = require('path');
const HCCrawler = require('headless-chrome-crawler');
const BaseCache = require('headless-chrome-crawler/cache/base');

const FILE = resolve(__dirname, '../tmp/fs-cache.json');

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
  exists(options) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    return Promise.resolve(obj[FsCache.key(options)] || false);
  }
  set(options) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    obj[FsCache.key(options)] = true;
    fs.writeFileSync(this._settings.file, JSON.stringify(obj));
    return Promise.resolve();
  }
  remove(options) {
    const obj = JSON.parse(fs.readFileSync(this._settings.file));
    delete obj[FsCache.key(options)];
    fs.writeFileSync(FILE, JSON.stringify(obj));
    return Promise.resolve();
  }
}

HCCrawler.launch({
  maxConcurrency: 1,
  evaluatePage: (() => ({
    title: $('title').text(),
    h1: $('h1').text(),
  })),
  onSuccess: (result => {
    console.log('onSuccess', result);
  }),
  cache: new FsCache({ file: FILE }),
})
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.queue('https://example.net/');
    crawler.queue('https://example.com/'); // The queue won't be requested
    crawler.onIdle()
      .then(() => crawler.close());
  });
