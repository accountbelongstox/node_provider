const path = require('path');
const Conf = require('ee-core/config');
const { app } = require('electron');

const remoteUrl = Conf.getValue('remoteUrl')
const expressPort = remoteUrl.url.match(/:(\d+)/);
const port = parseInt(expressPort[1], 10);
const appRoot = path.resolve(app.getAppPath());
const mainServer = Conf.getValue('mainServer')
const indexDir = "." + path.dirname(mainServer.indexPath)
const distDir = path.join(appRoot, indexDir)

const { http } = require('../practical');

class Serve {
    httpPort = 18000

    constructor() {
    }

    startVue(port=23350,distDir="dist") {
        const handler = require('serve-handler');
        const http = require('http');
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                "public": distDir
            });
        });

        server.listen(port, () => {
            console.log(`Running at http://localhost:${port}`);
        });
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

}

Serve.toString = () => '[class Serve]';
module.exports = new Serve();


