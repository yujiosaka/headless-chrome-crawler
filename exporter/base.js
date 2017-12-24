const { extend } = require('lodash');
const { createWriteStream } = require('fs');

/**
 * @interface
 */
class BaseExporter {
  /**
   * @param {Object=} settings
   */
  constructor(settings) {
    this._settings = extend({ encoding: 'utf8' }, settings);
    this._stream = createWriteStream(this._settings.file, this._settings.encoding);
    if (!this._settings.file) throw new Error('File must be defined!');
  }

  end() {
    this._stream.end();
  }

  /**
   * @return {Promise}
   */
  onEnd() {
    return new Promise((resolve, reject) => {
      this._stream.on('finish', resolve);
      this._stream.on('error', reject);
    });
  }

  /**
   * @param {!Object} result
   */
  writeLine() {
    throw new Error('Write footer is not overridden!');
  }

  writeHeader() {
    throw new Error('Write header is not overridden!');
  }

  writeFooter() {
    throw new Error('Write footer is not overridden!');
  }
}

module.exports = BaseExporter;
