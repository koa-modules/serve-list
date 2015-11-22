'use strict'

/*!
 * serve-list
 * Copyright(c) 2011 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * Copyright(c) 2015 Fangdun Cai
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

const originalServeIndex = require('serve-index')

exports = module.exports = serveIndex

/**
 * @param {String} path
 * @param {Object} options
 * @return {Promise}
 * @api public
 */

function serveIndex(root, options) {
  const fn = originalServeIndex(root, options)
  return (ctx, next) => {
    return new Promise((resolve, reject) => {
      // hacked statusCode
      if (ctx.status === 404) ctx.status = 200
      // unnecessary response by koa
      ctx.respond = false
      // 404, serve-static forward non-404 errors
      // force throw error
      fn(ctx.req, ctx.res, reject)
    })
  }
}

Object.defineProperty(exports, 'html', {
  get: () => {
    return originalServeIndex.html
  },
  set: (html) => {
    originalServeIndex.html = html
  }
})

Object.defineProperty(exports, 'json', {
  get: () => {
    return originalServeIndex.json
  },
  set: (json) => {
    originalServeIndex.json = json
  }
})

Object.defineProperty(exports, 'plain', {
  get: () => {
    return originalServeIndex.plain
  },
  set: (plain) => {
    originalServeIndex.plain = plain
  }
})
