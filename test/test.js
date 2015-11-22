const after = require('after');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const Koa = require('koa');
const serveIndex = require('..');

const fixtures = path.join(__dirname, '/fixtures');
const relative = path.relative(process.cwd(), fixtures);

const skipRelative = ~relative.indexOf('..') || path.resolve(relative) === relative;

describe('serveIndex(root)', () => {
  var server
  before(() => {
    server = createServer()
  })

  it('should require root', () => {
    assert.throws(serveIndex, /root path required/)
  })

  it('should serve text/html without Accept header', (done) => {
    request(server)
    .get('/')
    .expect('Content-Type', 'text/html; charset=utf-8')
    .expect(200, done)
  })

  it('should serve a directory index', (done) => {
    request(server)
    .get('/')
    .expect(200, /todo\.txt/, done)
  })

  it('should work with HEAD requests', (done) => {
    request(server)
    .head('/')
    .expect(200, '', done)
  })

  it('should work with OPTIONS requests', (done) => {
    request(server)
    .options('/')
    .expect('Allow', 'GET, HEAD, OPTIONS')
    .expect(200, done)
  })

  it('should deny POST requests', (done) => {
    request(server)
    .post('/')
    .expect(405, done)
  })

  it('should deny path will NULL byte', (done) => {
    request(server)
    .get('/%00')
    .expect(400, done)
  })

  it('should deny path outside root', (done) => {
    request(server)
    .get('/../')
    .expect(403, done)
  })

  it('should skip non-existent paths', (done) => {
    request(server)
    .get('/bogus')
    .expect(404, 'Not Found', done)
  })

  it('should treat an ENAMETOOLONG as a 414', (done) => {
    var path = Array(11000).join('foobar')

    request(server)
    .get('/' + path)
    .expect(414, done)
  })

  it('should skip non-directories', (done) => {
    request(server)
    .get('/nums')
    .expect(404, 'Not Found', done)
  })

  describe('when given Accept: header', () => {
    describe('when Accept: application/json is given', () => {
      it('should respond with json', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(/g# %3 o & %2525 %37 dir/)
        .expect(/users/)
        .expect(/file #1\.txt/)
        .expect(/nums/)
        .expect(/todo\.txt/)
        .expect(/さくら\.txt/)
        .expect(200, done)
      });
    });

    describe('when Accept: text/html is given', () => {
      it('should respond with html', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(/<a href="\/g%23%20%253%20o%20%26%20%252525%20%2537%20dir"/)
        .expect(/<a href="\/users"/)
        .expect(/<a href="\/file%20%231.txt"/)
        .expect(/<a href="\/todo.txt"/)
        .expect(/<a href="\/%E3%81%95%E3%81%8F%E3%82%89\.txt"/)
        .end(done);
      });

      it('should property escape file names', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(/<a href="\/foo%20%26%20bar"/)
        .expect(/foo &amp; bar/)
        .expect(bodyDoesNotContain('foo & bar'))
        .end(done);
      });

      it('should sort folders first', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8')
        .end((err, res) => {
          if (err) done(err);
          var body = res.text.split('</h1>')[1];
          var urls = body.split(/<a href="([^"]*)"/).filter((s, i) => i%2);
          assert.deepEqual(urls, [
            '/%23directory',
            '/collect',
            '/g%23%20%253%20o%20%26%20%252525%20%2537%20dir',
            '/users',
            '/file%20%231.txt',
            '/foo%20%26%20bar',
            '/nums',
            '/todo.txt',
            '/%E3%81%95%E3%81%8F%E3%82%89.txt'
          ]);
          done();
        });
      });
    });

    describe('when Accept: text/plain is given', () => {
      it('should respond with text', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect(/users/)
        .expect(/g# %3 o & %2525 %37 dir/)
        .expect(/file #1.txt/)
        .expect(/todo.txt/)
        .expect(/さくら\.txt/)
        .end(done);
      });
    });

    describe('when Accept: application/x-bogus is given', () => {
      it('should respond with 406', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'application/x-bogus')
        .expect(406, done)
      });
    });
  });

  describe('with "hidden" option', () => {
    it('should filter hidden files by default', (done) => {
      request(server)
      .get('/')
      .expect(bodyDoesNotContain('.hidden'))
      .expect(200, done)
    });

    it('should filter hidden files', (done) => {
      server = createServer('test/fixtures', {'hidden': false})

      request(server)
      .get('/')
      .expect(bodyDoesNotContain('.hidden'))
      .expect(200, done)
    });

    it('should not filter hidden files', (done) => {
      server = createServer('test/fixtures', {'hidden': true})

      request(server)
      .get('/')
      .expect(200, /\.hidden/, done)
    });
  });

  describe('with "filter" option', () => {
    it('should custom filter files', (done) => {
      var cb = after(2, done)
      server = createServer(fixtures, {'filter': filter})

      function filter(name) {
        if (name.indexOf('foo') === -1) return true
        cb()
        return false
      }

      request(server)
      .get('/')
      .expect(bodyDoesNotContain('foo'))
      .expect(200, cb)
    });

    it('should filter after hidden filter', (done) => {
      server = createServer(fixtures, {'filter': filter, 'hidden': false})

      function filter(name) {
        if (name.indexOf('.') === 0) {
          done(new Error('unexpected hidden file'))
        }

        return true
      }

      request(server)
      .get('/')
      .expect(200, done)
    });

    it('should filter directory paths', (done) => {
      var cb = after(4, done)
      var server = createServer(fixtures, {'filter': filter})

      function filter(name, index, list, dir) {
        if (path.normalize(dir) === path.normalize(path.join(fixtures, '/users'))) {
          cb()
        }
        return true
      }

      request(server)
      .get('/users')
      .expect(200, cb)
    });
  });

  describe('with "icons" option', () => {
    it('should include icons for html', (done) => {
      var server = createServer(fixtures, {'icons': true})

      request(server)
      .get('/collect')
      .expect(/data:image\/png/)
      .expect(/icon-default/)
      .expect(/icon-directory/)
      .expect(/icon-image/)
      .expect(/icon-txt/)
      .expect(/icon-application-pdf/)
      .expect(/icon-video/)
      .expect(/icon-xml/)
      .expect(200, done)
    });
  });

  describe('with "template" option', () => {
    describe('when setting a custom template file', () => {
      var server;
      before(() => {
        server = createServer(fixtures, {'template': __dirname + '/shared/template.html'});
      });

      it('should respond with file list', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(/<a href="\/g%23%20%253%20o%20%26%20%252525%20%2537%20dir"/)
        .expect(/<a href="\/users"/)
        .expect(/<a href="\/file%20%231.txt"/)
        .expect(/<a href="\/todo.txt"/)
        .expect(200, done)
      });

      it('should respond with testing template sentence', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, /This is the test template/, done)
      });

      it('should have default styles', (done) => {
        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, /ul#files/, done)
      });

      it('should list directory twice', (done) => {
        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect((res) => {
          var occurances = res.text.match(/directory \/users\//g)
          if (occurances && occurances.length === 2) return
          throw new Error('directory not listed twice')
        })
        .expect(200, done)
      });
    });

    describe('when setting a custom template function', () => {
      it('should invoke function to render', (done) => {
        server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, 'This is a template.');
        }});

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, 'This is a template.', done);
      });

      it('should handle render errors', (done) => {
        server = createServer(fixtures, {'template': (locals, callback) => {
          callback(new Error('boom!'));
        }});

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(500, 'boom!', done);
      });

      it('should provide "directory" local', (done) => {
        server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.directory));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, '"/users/"', done);
      });

      it('should provide "displayIcons" local', (done) => {
        server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.displayIcons));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, 'false', done);
      });

      it('should provide "fileList" local', (done) => {
        var server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.fileList.map((file) => {
            file.stat = file.stat instanceof fs.Stats;
            return file;
          })));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect('[{"name":"..","stat":true},{"name":"#dir","stat":true},{"name":"index.html","stat":true},{"name":"tobi.txt","stat":true}]')
        .expect(200, done);
      });

      it('should provide "path" local', (done) => {
        var server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.path));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, JSON.stringify(path.join(fixtures, 'users/')), done);
      });

      it('should provide "style" local', (done) => {
        var server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.style));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, /#files \.icon \.name/, done);
      });

      it('should provide "viewName" local', (done) => {
        var server = createServer(fixtures, {'template': (locals, callback) => {
          callback(null, JSON.stringify(locals.viewName));
        }});

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, '"tiles"', done);
      });
    });
  });

  describe('when using custom handler', () => {
    describe('exports.html', () => {
      alterProperty(serveIndex, 'html', serveIndex.html)

      it('should get called with Accept: text/html', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files) => {
          res.setHeader('Content-Type', 'text/html');
          res.end('called');
        }

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, 'called', done)
      });

      it('should get file list', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files) => {
          var text = files
            .filter((f) => { return /\.txt$/.test(f) })
            .sort()
          res.setHeader('Content-Type', 'text/html')
          res.end('<b>' + text.length + ' text files</b>')
        }

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, '<b>3 text files</b>', done)
      });

      it('should get dir name', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files, next, dir) => {
          res.setHeader('Content-Type', 'text/html')
          res.end('<b>' + dir + '</b>')
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, '<b>/users/</b>', done)
      });

      it('should get template path', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files, next, dir, showUp, icons, path, view, template) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(String(fs.existsSync(template)))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, 'true', done)
      });

      it('should get template with tokens', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files, next, dir, showUp, icons, path, view, template) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(fs.readFileSync(template, 'utf8'))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(/{directory}/)
        .expect(/{files}/)
        .expect(/{linked-path}/)
        .expect(/{style}/)
        .expect(200, done)
      });

      it('should get stylesheet path', (done) => {
        var server = createServer()

        serveIndex.html = (req, res, files, next, dir, showUp, icons, path, view, template, stylesheet) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(String(fs.existsSync(stylesheet)))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, 'true', done)
      });
    });

    describe('exports.plain', () => {
      alterProperty(serveIndex, 'plain', serveIndex.plain)

      it('should get called with Accept: text/plain', (done) => {
        var server = createServer()

        serveIndex.plain = (req, res, files) => {
          res.setHeader('Content-Type', 'text/plain');
          res.end('called');
        }

        request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect(200, 'called', done)
      });
    });

    describe('exports.json', () => {
      alterProperty(serveIndex, 'json', serveIndex.json)

      it('should get called with Accept: application/json', (done) => {
        var server = createServer()

        serveIndex.json = (req, res, files) => {
          res.setHeader('Content-Type', 'application/json');
          res.end('"called"');
        }

        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect(200, '"called"', done)
      });
    });
  });

  describe('when navigating to other directory', () => {
    it('should respond with correct listing', (done) => {
      var server = createServer()

      request(server)
      .get('/users/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/users\/index.html"/)
      .expect(/<a href="\/users\/tobi.txt"/)
      .end(done);
    });

    it('should include link to parent directory', (done) => {
      var server = createServer()

      request(server)
      .get('/users')
      .end((err, res) => {
        if (err) return done(err);
        var body = res.text.split('</h1>')[1];
        var urls = body.split(/<a href="([^"]*)"/).filter((s, i) => { return i%2; });
        assert.deepEqual(urls, [
          '/',
          '/users/%23dir',
          '/users/index.html',
          '/users/tobi.txt'
        ]);
        done();
      });
    });

    it('should work for directory with #', (done)  => {
      var server = createServer()

      request(server)
      .get('/%23directory/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/%23directory"/)
      .expect(/<a href="\/%23directory\/index.html"/)
      .end(done);
    });

    it('should work for directory with special chars', (done) => {
      var server = createServer()

      request(server)
      .get('/g%23%20%253%20o%20%26%20%252525%20%2537%20dir/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/g%23%20%253%20o%20%26%20%252525%20%2537%20dir"/)
      .expect(/<a href="\/g%23%20%253%20o%20%26%20%252525%20%2537%20dir\/empty.txt"/)
      .end(done);
    });

    it('should property escape directory names', (done) => {
      var server = createServer()

      request(server)
      .get('/g%23%20%253%20o%20%26%20%252525%20%2537%20dir/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a href="\/g%23%20%253%20o%20%26%20%252525%20%2537%20dir"/)
      .expect(/g# %3 o &amp; %2525 %37 dir/)
      .expect(bodyDoesNotContain('g# %3 o & %2525 %37 dir'))
      .end(done);
    });

    it('should not work for outside root', (done) => {
      var server = createServer()

      request(server)
      .get('/../support/')
      .set('Accept', 'text/html')
      .expect(403, done);
    });
  });

  describe('when setting a custom stylesheet', () => {
    var server;
    before(() => {
      server = createServer(fixtures, {'stylesheet': __dirname + '/shared/styles.css'});
    });

    it('should respond with appropriate embedded styles', (done) => {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/color: #00ff00;/)
      .end(done);
    });
  });

  describe('when set with trailing slash', () => {
    var server;
    before(() => {
      server = createServer(fixtures + '/');
    });

    it('should respond with file list', (done) => {
      request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(/users/)
      .expect(/file #1\.txt/)
      .expect(/nums/)
      .expect(/todo\.txt/)
      .expect(200, done)
    });
  });

  (skipRelative ? describe.skip : describe)('when set to \'.\'', () => {
    var server;
    before(() => {
      server = createServer('.');
    });

    it('should respond with file list', (done) => {
      var dest = relative.split(path.sep).join('/');
      request(server)
      .get('/' + dest + '/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(/users/)
      .expect(/file #1\.txt/)
      .expect(/nums/)
      .expect(/todo\.txt/)
      .expect(200, done)
    });

    it('should not allow serving outside root', (done) => {
      request(server)
      .get('/../')
      .set('Accept', 'text/html')
      .expect(403, done);
    });
  });
});

function alterProperty(obj, prop, val) {
  var prev

  beforeEach(() => {
    prev = obj[prop]
    obj[prop] = val
  })
  afterEach(() => {
    obj[prop] = prev
  })
}

function createServer(dir, opts) {
  dir = dir || fixtures

  const _serveIndex = serveIndex(dir, opts)

  const app = new Koa()

  app.use((ctx) => {
    _serveIndex(ctx).catch((err) => {
      ctx.res.statusCode = err ? (err.status || 500) : 404
      ctx.res.end(err ? err.message : 'Not Found')
    })
  })

  return app.listen()
}

function bodyDoesNotContain(text) {
  return (res) => {
    assert.equal(res.text.indexOf(text), -1)
  }
}
