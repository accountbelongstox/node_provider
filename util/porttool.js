const {  exec } = require('child_process');
const Base = require('../base/base');
const net = require('net');

class Porttool extends Base {
    constructor() {
        super();
        this.currentDir = process.cwd();
    }

    async isPortInUse(port) {
        return new Promise((resolve, reject) => {
            const netstatCommand = `netstat -ano | findstr :${port}`;
            exec(netstatCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                const lines = stdout.trim().split('\n').map(line => line.trim().replace(/\r/g, ''));
                let portLines = lines;
                let isPortUsed = false;
                let isIncludePort = false;
                for (let i = 0; i < portLines.length; i++) {
                    const parts = portLines[i].split(/\s+/); 
                    let firstValue = parts[0];
                    if(firstValue == "TCP")firstValue =  parts[1];
                    if (firstValue.endsWith(`:${port}`)) {
                        isIncludePort = true
                    }
                    const lastValue = parts[parts.length - 1];
                    if (!isNaN(parseInt(lastValue, 10)) && parseInt(lastValue, 10) > 0) {
                        isPortUsed = true;
                        if (isIncludePort) {
                            break
                        }
                    }
                }
                isPortUsed = isIncludePort && isPortUsed
                resolve(isPortUsed);
            });
        }).catch(error => {
            console.error("An error occurred while checking port:", error);
            return true;
        });
    }
    async killProcessByPort(port) {
        return new Promise((resolve, reject) => {
            // Execute netstat command to find processes using the specified port
            const netstatCommand = `netstat -ano | findstr :${port}`;
            exec(netstatCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error); // 使用 reject() 来处理错误
                    return;
                }
                // Parse the netstat output to extract the PID and port
                const lines = stdout.trim().split('\n').map(line => line.trim().replace(/\r/g, ''));
                const processesToKill = [];
                lines.forEach(line => {
                    const lineParts = line.split(/\s+/);
                    const pid = lineParts[lineParts.length - 1]; // PID is the last item
                    if (pid.match(/^\d+$/) && parseInt(pid) > 0) {
                        const processPort = lineParts[1].split(':')[1]; // Extract the port from the local address
                        if (parseInt(processPort) === port) {
                            processesToKill.push({ pid, port: processPort });
                        }
                    }
                });

                if (processesToKill.length === 0) {
                    resolve(`No processes found using port ${port}`);
                    return;
                }

                // Determine if taskkill command should be forced
                const forceOption = processesToKill.length > 1 ? '/F' : '';
                // Prepare taskkill command with PID(s)
                const pids = processesToKill.map(process => process.pid).join(' /PID ');
                const taskkillCommand = `taskkill ${forceOption} /PID ${pids}`;

                // Execute taskkill command
                exec(taskkillCommand, (error, stdout, stderr) => {
                    if (error) {
                        reject(error); // 使用 reject() 来处理错误
                        return;
                    }
                    resolve(stdout.trim());
                });
            });
        });
    }

    async checkPort(port) {
        return new Promise((resolve, reject) => {
            port = parseInt(port);
            const tester = net.createServer();
            tester.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(true);
                } else {
                    reject(err);
                }
            });

            tester.once('listening', () => {
                tester.close(() => {
                    resolve(false);
                });
            });

            tester.listen(port, 'localhost');
        });
    }
    isPortTaken(port) {
        return new Promise((resolve, reject) => {
            const tester = net.createServer()
                .once('error', err => {
                    if (err.code !== 'EADDRINUSE') {
                        reject(err);
                        return;
                    }
                    resolve(true);
                })
                .once('listening', () => {
                    tester.once('close', () => {
                        resolve(false);
                    }).close();
                })
                .listen(port);
        });
    }
}

Porttool.toString = () => '[class Porttool]';
module.exports = new Porttool();
