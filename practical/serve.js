const path = require('path');
const fs = require('fs');
const conf = require('../util/conf');
const { app } = require('../electron');
const { execSync } = require('child_process');
// const remoteUrl = conf.getValue('remoteUrl')
// const expressPort = remoteUrl.url.match(/:(\d+)/);
// const port = parseInt(expressPort[1], 10);
const net = require('net');
// const appRoot = path.resolve(app.getAppPath());
// const mainServer = conf.getValue('mainServer')
// const indexDir = "." + path.dirname(mainServer.indexPath)
// const distDir = path.join(appRoot, indexDir)
const http = require('http');

const { strtool, urltool, file, plattool, setenv } = require('../utils');

class Serve {
    httpPort = 18000

    constructor() {
    }

    startVue(port = 23350, distDir = "dist") {
        const handler = require('serve-handler');
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                "public": distDir
            });
        });
        server.listen(port, () => {
            console.log(`Running at http://localhost:${port}`);
        });
    }

    async startFrontend(localFrontendDir, frontend_command = "dev", frontend_type = "vue", callback) {
        const yarn = setenv.where(`yarn`)
        const frontendDir = file.resolvePath(localFrontendDir);
        if (!this.isNodeModulesNotEmpty(frontendDir) && this.isPackageJson(frontendDir)) {
            await plattool.spawnAsync(`yarn install`, true, frontendDir);
        }
        const start_command = `${yarn} ${frontend_command}`
        console.log(`start_command`,start_command,frontendDir)
        let debugUrl = ``
        const result =  plattool.execCmdSync(start_command, true, frontendDir)
        const output = strtool.toString(result);
        debugUrl = urltool.extractHttpUrl(output)
        callback(debugUrl);
    }

    startHTTP(port) {
        port = port ? port : this.startPort
        http.checkPort(port)
            .then((freePort) => {
                console.log(`freePort ${freePort}`)
                http.startHTTPServer(freePort)
            })
            .catch((error) => {
                console.error('Error while checking ports:', error);
            });
    }

    checkPort(port) {
        return new Promise((resolve, reject) => {
            const tester = net.createServer();
            tester.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    tester.close(() => () => {
                        return this.checkPort(port + 1).then(resolve).catch(e => { })
                    });
                } else {
                    reject(err);
                    resolve(null);
                }
            });

            tester.once('listening', () => {
                tester.close(() => resolve(port));
            });

            tester.listen(port);
        });
    }

    isNodeModulesNotEmpty(directory) {
        const nodeModulesPath = path.join(directory, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            return false;
        }
        return !this.isEmptyDir(nodeModulesPath);
    }
    isPackageJson(directory) {
        const filePath = path.join(directory, 'package.json');
        if (fs.existsSync(filePath)) {
            return true;
        }
        return false;
    }
    isEmptyDir(directory) {
        if (!fs.existsSync(directory)) {
            return true;
        }
        const contents = fs.readdirSync(directory);
        return contents.length == 0;
    }

}

Serve.toString = () => '[class Serve]';
module.exports = new Serve();


