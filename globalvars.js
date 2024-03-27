const gdir = require('./globalvar/gdir.js');
const env = require('./globalvar/env.js');
const encyclopedia = require('./globalvar/encyclopedia.js');


module.exports = {
    toString: () => '[class Globalvar]',
    gdir,
    env,
    encyclopedia,
};
