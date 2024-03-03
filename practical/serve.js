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

const { strtool, urltool, file,plattool, setenv,env } = require('../util');

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

    startFrontend(frontend, frontend_command, yarn,callback) {
        const env_FRONTEND_COMMAND = env.getEnv(`FRONTEND_COMMAND`)
        const env_FRONTEND_PORT = env.getEnv(`FRONTEND_PORT`)
        const env_FRONTEND = env.getEnv(`FRONTEND`)
        if(!yarn)yarn = setenv.where(`yarn`)
        const currentDir = process.cwd();
        const frontendDir = file.resolvePath(frontend);
        console.log(`env_FRONTEND_COMMAND`,env_FRONTEND_COMMAND)
        console.log(`env_FRONTEND_PORT`,env_FRONTEND_PORT)
        console.log(`env_FRONTEND`,env_FRONTEND)
        console.log(`env_FRONTEND_COMMAND`,env_FRONTEND_COMMAND)
        console.log(`yarn`,yarn)
        console.log(`currentDir`,currentDir)
        console.log(`frontendDir`,frontendDir)
        console.log(`isHttpUrl`,urltool.isHttpUrl(frontendDir))
        console.log(`resolvePath`,file.resolvePath(frontendDir))
        if (urltool.isHttpUrl(frontendDir)) {
            callback(frontend);
        } else if (file.isDir(file.resolvePath(frontendDir))) {
            const start_command = `${yarn} ${frontend_command}`
            process.chdir(frontendDir);
            if (!this.isNodeModulesNotEmpty(frontendDir) && this.isPackageJson(frontendDir)) {
                plattool.spawnAsync(`yarn install`, true,frontendDir);
            }
            console.log(`start_command`,start_command)
            let debugUrl = ``
            const result = plattool.spawnAsync(start_command,true,frontendDir)
            const output = strtool.toString(result);
            debugUrl = urltool.extractHttpUrl(output)
            process.chdir(currentDir);
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


