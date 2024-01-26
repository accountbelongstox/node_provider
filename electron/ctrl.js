const { app } = require('electron');
let electronWindow
class ElectronCtrl {

    setElectronWindow(win) {
        electronWindow = win
    }

    minimize() {
        // electronWindow.setFullScreen(false)
        // electronWindow.minimize()
        electronWindow.minimize()
    }

    maximize() {
        // electronWindow.setFullScreen(true)
        electronWindow.maximize()
    }

    relaunch() {
        app.relaunch();
        app.exit();
    }

    close() {
       app.exit();
    }

}

module.exports = new ElectronCtrl();