const path = require('path');
const fs = require('fs');
const Conf = require('ee-core/config');
const { app } = require('electron');
const { execSync } = require('child_process');
const remoteUrl = Conf.getValue('remoteUrl')
const expressPort = remoteUrl.url.match(/:(\d+)/);
const port = parseInt(expressPort[1], 10);
const net = require('net');
const appRoot = path.resolve(app.getAppPath());
const mainServer = Conf.getValue('mainServer')
const indexDir = "." + path.dirname(mainServer.indexPath)
const distDir = path.join(appRoot, indexDir)
const http = require('http');

const { strtool, urltool, file,plattool, setenv } = require('../util');

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

    startFrontend(frontend, frontend_command, callback) {
        const yarn = setenv.where(`yarn`)
        console.log(`yarn`,yarn)
        const currentDir = process.cwd();
        const frontendDir = file.resolvePath(frontend);
        if (urltool.isHttpUrl(frontendDir)) {
            callback(frontend);
        } else if (file.isDir(file.resolvePath(frontendDir))) {
            const start_command = `"${yarn}" ${frontend_command}`
            // process.chdir(frontendDir);
            if (!this.isNodeModulesNotEmpty(frontendDir) && this.isPackageJson(frontendDir)) {
                plattool.spawnAsync(`yarn install`, true,frontendDir);
            }
            let debugUrl = ``
            const result = plattool.spawnAsync(start_command,true,frontendDir)
            // const result = execSync(start_command, { stdio: 'inherit' });
            const output = strtool.toString(result);
            debugUrl = urltool.extractHttpUrl(output)
            // process.chdir(currentDir);
            callback(debugUrl);
        } else {
            console.error(`Invalid frontend directory: ${frontendDir}`);
            callback();
        }
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


