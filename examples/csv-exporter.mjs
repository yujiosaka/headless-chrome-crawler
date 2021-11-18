// const HCCrawler = require('..');
// const CSVExporter = require('../exporter/csv');
// const filenamifyUrl = require('filenamify-url');
import filenamifyUrl from 'filenamify-url';
import * as fs from 'fs';
import * as HCCrawler from '../lib/hccrawler.js';
import * as CSVExporter from '../exporter/csv.js';
import crypto from 'crypto';
const FILE = './tmp/result.json';
const PATH = './tmp/';

const exporter = new CSVExporter.default({
  file: FILE,
  fields: ['options.hash', 'options.url']
});

(async () => {
  const crawler = await HCCrawler.default.launch({
    maxRequest: 100,
    evaluatePage: (() => ({
      content: $('html').html(),
    })),
    onSuccess: result => {
      console.log(`Processing result for ${result.options.url}`);
      console.log(`   Screenshot is saved at ${result.options.screenshot.path}`);
      fs.writeFileSync(`${result.options.html.path}`, result.result.content);
      console.log(`   HTML is saved at ${result.options.html.path}`);
    },
    preRequest: options => {
      // if (!options.saveAs) return false; // Skip the request by returning false
      options.hash = crypto.createHash('md5').update(options.url).digest('hex');;
      options.screenshot = { path: `${PATH}${options.hash}.webp`, fullPage: true };
      options.html = { path: `${PATH}${options.hash}.html` };
      return true;
    },
    maxDepth: 2,
    exporter,
  });
  await crawler.queue('https://batdongsan.com.vn/');
  await crawler.onIdle();
  await crawler.close();
})();
