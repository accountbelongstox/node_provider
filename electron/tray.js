const { Tray, Menu } = require('electron')
const { src } = require('../practicals');

<<<<<<< HEAD

class ElectronTray {
    tray = null

    createTray(trayMenuItems,icon) {
        if(!icon)icon = src.getDefaultImageFile()
        this.tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate(trayMenuItems);
        this.tray.setContextMenu(contextMenu);
=======
let tray = null

class ElectronTray {

    createTray(trayMenuItems,icon,title) {
        if(!icon)icon = src.getDefaultImageFile()
        tray = new Tray(icon);
        const contextMenu = Menu.buildFromTemplate(trayMenuItems);
        tray.setContextMenu(contextMenu);
        tray.setToolTip(title);
>>>>>>> 7277f84d66832d12cb6601508e31e28ae87fed3f
    }
}


module.exports = new ElectronTray()