# koa-serve-list

> Serves pages that contain directory listings for a given path for koa.  
> [serve-index] wrapper for koa's middleware.

[![NPM version][npm-img]][npm-url]
[![NPM Downloads][downloads-image]][npm-url]
[![Build status][travis-img]][travis-url]
[![Test coverage][coveralls-img]][coveralls-url]
[![Dependency status][david-img]][david-url]
[![License][license-img]][license-url]

## Install

```sh
$ npm install --save koa-serve-list
```

## Usage

### **=1.x**, 100%, working with `koa-v2`

```js
const Koa = require('koa');
const serveList = require('koa-serve-list');
const serveStatic = require('koa-serve-static');
const app = new Koa();

app.use(serveList(path, options));
app.use(serveStatic(root, options));

app.listen(3000);
```

### **<1.x**

```js
var koa = require('koa');
var serveList = require('koa-serve-list');
var serveStatic = require('koa-serve-static');
var app = koa();

app.use(serveList(path, options));
app.use(serveStatic(root, options));

app.listen(3000);
```

[npm-img]: https://img.shields.io/npm/v/koa-serve-list.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-serve-list
[travis-img]: https://img.shields.io/travis/koa-modules/serve-list.svg?style=flat-square
[travis-url]: https://travis-ci.org/koa-modules/serve-list
[coveralls-img]: https://img.shields.io/coveralls/koa-modules/serve-list.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koa-modules/serve-list?branch=master
[license-img]: https://img.shields.io/badge/license-MIT-green.svg?style=flat-square
[license-url]: LICENSE
[david-img]: https://img.shields.io/david/koa-modules/serve-list.svg?style=flat-square
[david-url]: https://david-dm.org/koa-modules/serve-list
[downloads-image]: https://img.shields.io/npm/dm/koa-serve-list.svg?style=flat-square
[serve-index]: https://github.com/expressjs/serve-index
