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

    relaunch(layout = 0) {
        let restartTime = layout > 0 ? layout / 1000 : 0;
        if (restartTime > 0) {
            console.log(`The application will restart in ${restartTime} seconds...`);
<<<<<<< HEAD
            const timer = setInterval(() => {
                restartTime = restartTime - 1;
                console.log(`Restart countdown: ${restartTime} seconds`);
                if (restartTime <= 0) {
                    clearInterval(timer);
=======
            const atimer = setInterval(() => {
                restartTime = restartTime - 1;
                console.log(`Restart countdown: ${restartTime} seconds`);
                if (restartTime <= 0) {
                    clearInterval(atimer);
>>>>>>> 7277f84d66832d12cb6601508e31e28ae87fed3f
                    console.log('Restarting...');
                    app.relaunch();
                    app.exit();
                }
            }, 1000);
        }
    }

    close() {
        app.exit();
    }

}

module.exports = new ElectronCtrl();