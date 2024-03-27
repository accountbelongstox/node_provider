const elec = require('./egg_util/elec.js');
const view = require('./egg_util/view.js');
const ctrl = require('./egg_util/ctrl.js');
const tray = require('./egg_util/tray.js');

module.exports = {
    toString: () => '[class Practical2]',
    elec,
    view,
    ctrl,
    tray,
};
