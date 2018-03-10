const { createServer } = require('http');
const { parse } = require('url');
const mime = require('mime');

class Server {
  /**
   * @param {!number} port
   * @return {!Promise<!Server>}
   */
  static run(port) {
    const server = new Server(port);
    return new Promise(resolve => void server._server.once('listening', () => {
      resolve(server);
    }));
  }

  /**
   * @param {!number} port
   */
  constructor(port) {
    this._server = createServer(this._onRequest.bind(this));
    this._server.listen(port);
    this._delays = new Map();
    this._auths = new Map();
    this._contents = new Map();
  }

  reset() {
    this._delays.clear();
    this._auths.clear();
    this._contents.clear();
  }

  /**
   * @return {!Promise}
   */
  stop() {
    return new Promise(resolve => void this._server.close(resolve));
  }

  /**
   * @param {!string} path
   * @param {!string} username
   * @param {!string} password
   */
  setAuth(path, username, password) {
    this._auths.set(path, { username, password });
  }

  /**
   * @param {!string} path
   * @param {!string} content
   */
  setContent(path, content) {
    this._contents.set(path, content);
  }

  /**
   * @param {!string} path
   * @param {!number} delay
   */
  setResponseDelay(path, delay) {
    this._delays.set(path, delay);
  }

  /**
   * @param {!IncomingMessage} request
   * @param {!ServerResponse} response
   * @private
   */
  _onRequest(request, response) {
    this._handleError(request, response);
    const { path } = parse(request.url);
    response.setHeader('Content-Type', mime.getType(path));
    const auth = this._auths.get(path);
    if (!this._authenticate(auth, request)) {
      response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure Area"' });
      response.end('HTTP Error 401 Unauthorized: Access is denied');
      return;
    }
    const delay = this._delays.get(path) || 0;
    setTimeout(() => {
      const content = this._contents.get(path);
      if (content) {
        response.end(content);
        return;
      }
      response.end(path);
    }, delay);
  }

  /**
   * @param {!IncomingMessage} request
   * @param {!ServerResponse} response
   * @private
   */
  _handleError(request, response) {
    request.on('error', error => {
      if (error.code === 'ECONNRESET') {
        response.end();
        return;
      }
      throw error;
    });
  }

  /**
   * @param {!{username:string, password:string}} auth
   * @param {!IncomingMessage} request
   * @return {!boolean}
   * @private
   */
  _authenticate(auth, request) {
    if (!auth) return true;
    const credentials = this._getCredentials(request.headers.authorization);
    if (credentials === `${auth.username}:${auth.password}`) return true;
    return false;
  }

  /**
   * @param {!string=} authorization
   * @return {!string}
   * @private
   */
  _getCredentials(authorization = '') {
    const credentials = authorization.split(' ')[1] || '';
    return Buffer.from(credentials, 'base64').toString();
  }
}

module.exports = Server;
