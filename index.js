/*!
 * serve-index
 * Copyright(c) 2011 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2015 Fangdun Cai
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var thenify = require('thenify');
var originalServeIndex = require('serve-index');

/**
 * @param {String} path
 * @param {Object} options
 * @return {GeneratorFunction}
 * @api public
 */

exports = module.exports = function serveIndexWrapper(path, options) {
  var middleware = thenify(originalServeIndex(path, options));

  return serveIndex;

  function* serveIndex(next) {
    try {
      // hacked res.statusCode
      this.res.statusCode = 200;
      // 404, serve-static forward non-404 errors
      var result = yield middleware(this.req, this.res);
      if (result === void 0) {
        // hacked 404
        if (result === void 0) {
          var err = new Error();
          err.message = 'Not Found';
          err.status = 404;
          throw err;
        }
      }
    } catch (e) {
      throw e;
    }
    yield next;
  }
}

Object.defineProperty(exports, 'html', {
  get: function () {
    return originalServeIndex.html;
  },
  set: function(html) {
    originalServeIndex.html = html;
  }
});

Object.defineProperty(exports, 'json', {
  get: function () {
    return originalServeIndex.json;
  },
  set: function(json) {
    originalServeIndex.json = json;
  }
});

Object.defineProperty(exports, 'plain', {
  get: function () {
    return originalServeIndex.plain;
  },
  set: function(plain) {
    originalServeIndex.plain = plain;
  }
});