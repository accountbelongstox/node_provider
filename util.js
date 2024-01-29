const date = require('./util/date.js');
const json = require('./util/json.js');
const strtool = require('./util/strtool.js');
const tool = require('./util/tool.js');
const urltool = require('./util/urltool.js');
const arr = require('./util/arr.js');
const file = require('./util/file.js');
const fpath = require('./util/fpath.js');
const platform = require('./util/platform.js');
const htmlparse = require('./util/htmlparse.js');
const math_ = require('./util/math.js');
const conf = require('./util/conf.js');
const log = require('./util/log.js');
const plattool = require('./util/plattool');
const sysarg = require('./util/sysarg');
const setenv = require('./util/setenv.js');


module.exports = {
    toString: () => '[class Util]',
    date,
    json,
    strtool,
    arr,
    tool,
    urltool,
    file,
    fpath,
    platform,
    htmlparse,
    math:math_,
    conf:conf,
    plattool,
    log,
    sysarg,
    setenv,
};
