const zip = require('./practicals/zip.js');
const src = require('./practicals/src.js');
const opt = require('./practicals/opt.js');
const http = require('./practicals/http.js');
const env = require('./practicals/env.js');

module.exports = {
    toString: () => '[class PracticalsPrune]',
    zip,
    src,
    opt,
    http,
    env,
};
