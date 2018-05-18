const { unlink, readFile } = require('fs');
const CSVExporter = require('../exporter/csv');
const JSONLineExporter = require('../exporter/json-line');
const { jsonStableReplacer, escapeQuotes } = require('../lib/helper');

const CSV_FILE = './tmp/result.csv';
const JSON_FILE = './tmp/result.json';
const ENCODING = 'utf8';
const URL1 = 'https://github.com/yujiosaka/headless-chrome-crawler';
const URL2 = 'https://github.com/yujiosaka/headless-chrome-crawler/blob/master/package.json';
const TITLE1 = 'yujiosaka/headless-chrome-crawler: Headless Chrome crawls with jQuery support, powered by Puppeteer';
const TITLE2 = 'headless-chrome-crawler/package.json at master · yujiosaka/headless-chrome-crawler';
const HEADER1 = 'yujiosaka/headless-chrome-crawler';
const HEADER2 = 'yujiosaka/headless-chrome-crawler';

describe('Exporter', () => {
  function removeTemporaryFile(file) {
    return new Promise(resolve => {
      unlink(file, (() => void resolve()));
    });
  }

  function readTemporaryFile(file) {
    return new Promise((resolve, reject) => {
      readFile(file, ENCODING, ((error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }));
    });
  }

  describe('CSVExporter', () => {
    beforeEach(() => removeTemporaryFile(CSV_FILE));
    afterEach(() => removeTemporaryFile(CSV_FILE));

    describe('when the exporter is constructed', () => {
      beforeEach(() => {
        this.exporter = new CSVExporter({
          file: CSV_FILE,
          fields: ['options.url', 'result.title', 'result.header'],
        });
      });

      test('does not write a header', () => (
        new Promise(resolve => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(CSV_FILE))
            .then(actual => {
              const expected = 'options.url,result.title,result.header\n';
              expect(actual).toBe(expected);
              resolve();
            });
          this.exporter.writeHeader();
          this.exporter.end();
        })
      ));

      test('does not write a footer', () => (
        new Promise(resolve => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(CSV_FILE))
            .then(actual => {
              const expected = '';
              expect(actual).toBe(expected);
              resolve();
            });
          this.exporter.writeFooter();
          this.exporter.end();
        })
      ));

      test('writes a line', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(CSV_FILE))
            .then(actual => {
              const expected = `${URL1},${escapeQuotes(TITLE1)},${HEADER1}\n`;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.end();
        })
      ));

      test('writes multiple lines with header and footer', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(CSV_FILE))
            .then(actual => {
              const header = 'options.url,result.title,result.header\n';
              const line1 = `${URL1},${escapeQuotes(TITLE1)},${HEADER1}\n`;
              const line2 = `${URL2},${escapeQuotes(TITLE2)},${HEADER2}\n`;
              const expected = header + line1 + line2;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeHeader();
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.writeLine({
            options: { url: URL2 },
            result: { title: TITLE2, header: HEADER2 },
          });
          this.exporter.writeFooter();
          this.exporter.end();
        })
      ));
    });

    describe("when the exporter is constructed with separator = '\\t'", () => {
      beforeEach(() => {
        this.exporter = new CSVExporter({
          file: CSV_FILE,
          fields: ['options.url', 'result.title', 'result.header'],
          separator: '\t',
        });
      });

      test('writes multiple lines with header and footer', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(CSV_FILE))
            .then(actual => {
              const header = 'options.url\tresult.title\tresult.header\n';
              const line1 = `${URL1}\t${TITLE1}\t${HEADER1}\n`;
              const line2 = `${URL2}\t${TITLE2}\t${HEADER2}\n`;
              const expected = header + line1 + line2;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeHeader();
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.writeLine({
            options: { url: URL2 },
            result: { title: TITLE2, header: HEADER2 },
          });
          this.exporter.writeFooter();
          this.exporter.end();
        })
      ));
    });
  });

  describe('JSONLineExporter', () => {
    beforeEach(() => removeTemporaryFile(JSON_FILE));
    afterEach(() => removeTemporaryFile(JSON_FILE));

    describe('when the exporter is constructed', () => {
      beforeEach(() => {
        this.exporter = new JSONLineExporter({ file: JSON_FILE });
      });

      test('does not write a header', () => (
        new Promise(resolve => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const expected = '';
              expect(actual).toBe(expected);
              resolve();
            });
          this.exporter.writeHeader();
          this.exporter.end();
        })
      ));

      test('does not write a footer', () => (
        new Promise(resolve => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const expected = '';
              expect(actual).toBe(expected);
              resolve();
            });
          this.exporter.writeFooter();
          this.exporter.end();
        })
      ));

      test('writes a line', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const expected = `${JSON.stringify({
                options: { url: URL1 },
                result: { title: TITLE1, header: HEADER1 },
              })}\n`;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.end();
        })
      ));

      test('writes multiple lines with header and footer', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const line1 = `${JSON.stringify({
                options: { url: URL1 },
                result: { title: TITLE1, header: HEADER1 },
              })}\n`;
              const line2 = `${JSON.stringify({
                options: { url: URL2 },
                result: { title: TITLE2, header: HEADER2 },
              })}\n`;
              const expected = line1 + line2;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeHeader();
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.writeLine({
            options: { url: URL2 },
            result: { title: TITLE2, header: HEADER2 },
          });
          this.exporter.writeFooter();
          this.exporter.end();
        })
      ));
    });

    describe("when the exporter is constructed with fields = ['options.url', 'result.title']", () => {
      beforeEach(() => {
        this.exporter = new JSONLineExporter({
          file: JSON_FILE,
          fields: ['options.url', 'result.title'],
        });
      });

      test('writes multiple lines with only specified fields', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const line1 = `${JSON.stringify({
                options: { url: URL1 },
                result: { title: TITLE1 },
              })}\n`;
              const line2 = `${JSON.stringify({
                options: { url: URL2 },
                result: { title: TITLE2 },
              })}\n`;
              const expected = line1 + line2;
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeLine({
            options: { url: URL1 },
            result: { title: TITLE1, header: HEADER1 },
          });
          this.exporter.writeLine({
            options: { url: URL2 },
            result: { title: TITLE2, header: HEADER2 },
          });
          this.exporter.end();
        })
      ));
    });

    describe('when the exporter is constructed with jsonReplacer = jsonStableReplacer', () => {
      beforeEach(() => {
        this.exporter = new JSONLineExporter({
          file: JSON_FILE,
          jsonReplacer: jsonStableReplacer,
        });
      });

      test('writes line sorted by order', () => (
        new Promise((resolve, reject) => {
          this.exporter.onEnd()
            .then(() => readTemporaryFile(JSON_FILE))
            .then(actual => {
              const expected = '{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}\n';
              expect(actual).toBe(expected);
              resolve();
            })
            .catch(reject);
          this.exporter.writeLine({ c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 });
          this.exporter.end();
        })
      ));
    });
  });
});
