const zip = require('./practical/zip.js');
const win = require('./practical/win.js');
const src = require('./practical/src.js');
const opt = require('./practical/opt.js');
const http = require('./practical/http.js');
const serve = require('./practical/serve.js');
const env = require('./practical/env.js');

module.exports = {
    toString: () => '[class Practical]',
    win,
    zip,
    src,
    opt,
    http,
    env,
    serve,
};
