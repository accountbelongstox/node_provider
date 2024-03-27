const win = require('./practical/win.js');
const src = require('./globalvar/src.js');
const opt = require('./practical/opt.js');
const http = require('./practical/http.js');
const serve = require('./practical/serve.js');
const shoticon = require('./practical/shoticon.js');
const softinstall = require('./practical/softinstall.js');

module.exports = {
    toString: () => '[class Practical]',
    win,
    src,
    opt,
    http,
    serve,
    shoticon,
    softinstall,
};
