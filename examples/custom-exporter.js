const { inspect } = require('util');
const HCCrawler = require('headless-chrome-crawler');
const BaseExporter = require('headless-chrome-crawler/exporter/base');

const FILE = './tmp/result';

// Create a new exporter by extending BaseExporter interface
class InspectExporter extends BaseExporter {
  constructor(settings) {
    super(settings);
    if (!this._settings.depth) this._settings.depth = 2;
  }

  writeLine(result) {
    const line = inspect(result, { depth: this._settings.depth, breakLength: Infinity });
    this._stream.write(`${line}\n`);
  }

  writeHeader() {}
  writeFooter() {}
}

const exporter = new InspectExporter({
  file: FILE,
  depth: 1,
});

(async () => {
  const crawler = await HCCrawler.launch({ exporter, maxDepth: 2 });
  await crawler.queue('https://example.com/');
  await crawler.onIdle();
  await crawler.close();
})();
