const map = require('lodash/map');
const get = require('lodash/get');
const { escapeQuotes } = require('../lib/helper');
const BaseExporter = require('./base');

/**
 * @implements {BaseExporter}
 */
class CSVExporter extends BaseExporter {
  /**
   * @override
   */
  constructor(settings) {
    super(settings);
    if (!this._settings.separator) this._settings.separator = ',';
    if (!this._settings.fields) throw new Error('Fields must be defined!');
  }

  /**
   * @param {!Object} result
   */
  writeLine(result) {
    const line = map(this._settings.fields, (field => (
      escapeQuotes(get(result, field), this._settings.separator)
    ))).join(this._settings.separator);
    this._stream.write(`${line}\n`);
  }

  /**
   * @override
   */
  writeHeader() {
    const header = map(this._settings.fields, (field => (
      escapeQuotes(field, this._settings.separator)
    ))).join(this._settings.separator);
    this._stream.write(`${header}\n`);
  }

  /**
   * @override
   */
  writeFooter() {}
}

module.exports = CSVExporter;
