'use strict';
const fs = require('fs');
const os = require('os')
const path = require('path');
const regedit = require('regedit').promisified;
const { execSync, exec } = require('child_process');
let config = {};
const { file, tool, strtool, plattool } = require('../utils');
const { gdir } = require('../globalvars');
const { Shell } = require('node-windows');
// const windows_shortcuts = require('windows-shortcuts');

class Win {
    pathKey = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
    install_queue = []
    userDataFile = 'userData.json';

    parsedArgs = null

    //#TODO 添加一个方法，createShortcut（“名字”，“exe路径”，"icon"），根据上面三个信息，创建一个快捷方式，icon如果没有传，其值等于 exe路径，参考本项目下 auto_installer.bat 90行代码开始写（要求，如果快捷方式已经存在，则先删除再创建）
    async createShortcut(name, exePath, iconPath = exePath) {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const shortcutPath = path.join(desktopPath, `${name}.lnk`);

        // 检查快捷方式是否存在
        if (await this.fileExists(shortcutPath)) {
            console.log(`Shortcut "${name}" already exists. Removing it before creating a new one.`);
            await this.deleteFile(shortcutPath);
        }

        // 使用 node-windows 的 Shell 来创建快捷方式
        try {
            const shell = new Shell();
            await shell.createShortcut({
                target: exePath,
                workingDirectory: path.dirname(exePath),
                description: name,
                icon: iconPath,
                hotkey: '',
                args: '',
                desktop: true,
                filename: name
            });
            console.log(`Shortcut "${name}" created successfully.`);
        } catch (error) {
            console.error(`Failed to create shortcut "${name}":`, error);
        }
    }

    // 辅助方法检查文件是否存在
    async fileExists(filePath) {
        return new Promise((resolve, reject) => {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }

    // 辅助方法删除文件
    async deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    isWindows() {
        return os.platform() === 'win32';
    }

    kill(process = "chrome") {
        const cmd = `pkill ${process}`;
        return cmd;
    }

    isAppInLoginItems() {
        const settings = app.getLoginItemSettings()
        return settings.openAtLogin === true
    }

    checkAdmin(callback) {
        if (!this.isAdmin()) {
            console.error(`请以管理员模式运行,(右键:管理员运行.)`)
            setTimeout(() => {
                this.checkAdmin(callback)
            }, 3000)
        } else {
            if (callback) callback()
        }
    }

    exec_explorer(file_path, group, default_config, callback) {
        file_path = path.normalize(file_path)
        if (!fs.existsSync(file_path)) {
            if (group && default_config) file_path = path.join(default_config.icon_dir, group)
        }
        let cmd = `explorer "${file_path}"`
        console.log(cmd)
        tool.exeBySpawn(cmd, (err, std) => {
            if (callback) callback(err, std)
        });
    }

    async runAsAdmin(file_path, callback) {
        file_path = path.normalize(file_path);
        const originalCwd = process.cwd();
        let cmd;
        let result;
        const baseDir = path.dirname(file_path);
        const exename = path.basename(file_path)
        if (!fs.existsSync(file_path)) {
            cmd = `explorer "${baseDir}"`;
            result = { error: 'Executable file does not exist. Opening the parent directory of the executable file.' };
            console.error(result.error);
        } else {
            process.chdir(baseDir);
            cmd = `start ${file_path}`;
            console.log(`runAsAdmin: ${cmd}`)
            result = await plattool.execCommand(cmd, true);
        }
        process.chdir(originalCwd);
        if (callback) {
            callback(result);
        }
    }

    runAsAdminByGSudo(file_path, group, default_config, pare = '', callback) {
        console.log(`file_path`, file_path)
        file_path = path.normalize(file_path)
        let cmd
        let runmode = `explorer`
        if (!fs.existsSync(file_path)) {
            if (group && default_config) file_path = path.join(default_config.icon_dir, group)
            cmd = `explorer "${file_path}"`
        } else {
            if (file.isExecutable(file_path)) {
                let gsudo = gdir.getLibraryByWin32Dir(`gsudo.portable/gsudo.exe`)
                gsudo = path.normalize(gsudo)
                let current_user = os.userInfo().username;
                if (pare) {
                    pare = ` ` + pare
                }
                cmd = `${gsudo} -u ${current_user} "${file_path}"${pare}`
                runmode = `admin`
            } else {
                cmd = `explorer "${file_path}"${pare}`
            }
        }

        console.log(`cmd`, cmd)
        plattool.execCommand(cmd, true, null, null, (err, std) => {
            let rData = {
                runmode,
                err,
                std
            }
            if (callback) callback(rData)
        }, 3000);
    }


    isHyperVEnabled(callback) {
        tool.exec_cmd('dism /online /get-featureinfo /featurename:Microsoft-Hyper-V', (stdout, error, stderr) => {
            const isEnabled = stdout.includes('State : Enabled');
            callback(isEnabled);
        })
    }

    enableHyperV(callback) {
        exec('dism /online /enable-feature /featurename:Microsoft-Hyper-V /all', (error, stdout, stderr) => {
            if (error) {
                callback(null, error,);
                return;
            }
            const wasSuccessful = stdout.includes('successfully');
            callback(wasSuccessful, null);
        });
    }

    installOrUpdateWSL2(callback) {
        this.isWSL2Enabled((isWSL2, error) => {
            if (error) {
                callback(error);
                return;
            }
            if (isWSL2) {
                console.log("WSL2 is already enabled. Trying to upgrade any WSL1 distributions.");
                this.upgradeWSL1Distributions(callback);
            } else {
                console.log("WSL2 is not enabled. Starting installation process.");
            }
        });
    }

    checkVersionByTail(inputText, version) {
        const lines = inputText.split(/[\n\r]+/);
        for (let line of lines) {
            line = line.replaceAll(/\s+$/g, ``)
            if (line.endsWith(version)) {
                return true;
            }
        }
        return false;
    }

    getWslDistributes(callback) {
        let cmd = 'wsl -l --quiet'
        tool.exec_cmd(cmd, (stdout, error) => {
            stdout = strtool.trim(stdout)
            let distros = stdout.split(/\s+/)
            distros = distros.map(str => str.replace(/\x00/g, "")).filter(str => str != "");
            callback(distros);
        })
    }

    async isWSL2Enabled(callback) {
        const result = await plattool.execByCommand('wsl --status',)
        const hasWSL2 = this.checkVersionByTail(result.stdout, `2`)
        return hasWSL2
    }

    async installWsl2() {
        let upCmd = `wsl --update`
        let result = await plattool.execByCommand(upCmd)
        console.log(result)
        let setDefaultCmd = `wsl --set-default-version 2`
        result = await plattool.execByCommand(setDefaultCmd)
        console.log(result)
    }

    upgradeWSL1Distributions(callback) {
        exec('wsl --list --verbose', (error, stdout) => {
            if (error) {
                callback(error);
                return;
            }
            const wsl1Distributions = stdout.split('\n')
                .filter(line => line.includes(' 1 '))
                .map(line => line.trim().split(' ')[0]);

            if (wsl1Distributions.length === 0) {
                console.log("No WSL1 distributions found.");
                callback(null);
                return;
            }

            wsl1Distributions.forEach(dist => {
                console.log(`Upgrading ${dist} to WSL2.`);
                exec(`wsl --set-default-version  2`, (err) => {
                    if (err) {
                        callback(err);
                    } else {
                        console.log(`${dist} has been upgraded to WSL2.`);
                        callback(null);
                    }
                });
            });
        });
    }

    async isVisualStudio(callback) {
        let vs
        try {
            vs = await this.queryRegistry("HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\VisualStudio\\SxS\\VS7")
        } catch (e) {
            vs = null
        }
        if (callback) callback(vs)
    }

    async killProcessByPort(port) {
        return new Promise((resolve, reject) => {
            const netstatCommand = `netstat -ano | findstr :${port}`;
            exec(netstatCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                const lines = stdout.trim().split('\n');
                const pidRegex = /(\d+)$/; // Regular expression to match PID at the end of each line
                const pids = lines.map(line => {
                    const match = line.match(pidRegex);
                    return match ? match[1] : null;
                }).filter(pid => pid); // Filter out null values

                if (pids.length === 0) {
                    resolve(`No processes found using port ${port}`);
                    return;
                }

                const forceOption = pids.length > 1 ? '/F' : '';
                const taskkillCommand = `taskkill ${forceOption} /PID ${pids.join(' /PID ')}`;
                exec(taskkillCommand, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout.trim());
                });
            });
        });
    }
}

Win.toString = () => '[class Win Api]';
module.exports = new Win();

