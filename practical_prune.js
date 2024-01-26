const zip = require('./practical/zip.js');
const src = require('./practical/src.js');
const opt = require('./practical/opt.js');
const http = require('./practical/http.js');
const env = require('./practical/env.js');

module.exports = {
    toString: () => '[class PracticalPrune]',
    zip,
    src,
    opt,
    http,
    env,
};
