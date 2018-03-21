const pick = require('lodash/pick');
const BaseExporter = require('./base');

/**
 * @implements {BaseExporter}
 */
class JSONLineExporter extends BaseExporter {
  /**
   * @param {!Object} result
   * @override
   */
  writeLine(result) {
    if (this._settings.fields) result = pick(result, this._settings.fields);
    const line = JSON.stringify(result, this._settings.jsonReplacer);
    this._stream.write(`${line}\n`);
  }

  /**
   * @override
   */
  writeHeader() {}

  /**
   * @override
   */
  writeFooter() {}
}

module.exports = JSONLineExporter;
