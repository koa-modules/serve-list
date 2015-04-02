# koa-serve-index

> Serves pages that contain directory listings for a given path for koa.  
> [serve-index] wrapper for koa's middleware.

[![NPM version][npm-img]][npm-url]
[![Build status][travis-img]][travis-url]
[![Test coverage][coveralls-img]][coveralls-url]
[![License][license-img]][license-url]
[![Dependency status][david-img]][david-url]

## Install

```sh
$ npm install --save koa-serve-index
```

## Usage

Adding this into your koa server file:

```js
var koa = require('koa');
var serveIndex = require('koa-serve-index');
var serveStatic = require('koa-serve-static');
var app = koa();

app.use(serveIndex(path, options));
app.use(serveStatic(root, options));

app.listen(3000);
```

## API

* **serveIndex**

> Just **serve-index** wrapper, returns a GeneratorFunction.

[npm-img]: https://img.shields.io/npm/v/koa-serve-index.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-serve-index
[travis-img]: https://img.shields.io/travis/koa-modules/serve-index.svg?style=flat-square
[travis-url]: https://travis-ci.org/koa-modules/serve-index-
[coveralls-img]: https://img.shields.io/coveralls/koa-modules/serve-index.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koa-modules/serve-index?branch=master
[license-img]: https://img.shields.io/badge/license-MIT-green.svg?style=flat-square
[license-url]: LICENSE
[david-img]: https://img.shields.io/david/koa-modules/serve-index.svg?style=flat-square
[david-url]: https://david-dm.org/koa-modules/serve-index
[serve-index]: https://github.com/expressjs/serve-index
