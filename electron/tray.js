const { Tray, Menu } = require('electron')
const { src } = require('../practicals');


class ElectronTray {
    tray = null

    createTray(trayMenuItems,icon) {
        if(!icon)icon = src.getDefaultImageFile()
        this.tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate(trayMenuItems);
        this.tray.setContextMenu(contextMenu);
    }
}


module.exports = new ElectronTray()