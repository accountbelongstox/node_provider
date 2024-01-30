const { exec, execSync } = require('child_process');
const path = require('path');
const { config_base, config } = require('../comlib/config.js');
const fileUnit = require('../unit/fileUnit.js');
const stringUnit = require('../unit/stringUnit.js');
const htmlWidget = require('../widget/htmlWidget.js');
const httpWidget = require('../widget/httpWidget.js');
const winapiWidget = require('../widget/winapiWidget.js');
const shortcutIconWidget = require('../widget/shortcutIconWidget.js');
const zipWidget = require('../widget/zipWidget.js');
const messageWidget = require('../widget/messageWidget.js');
const utilUnit = require('../unit/utilUnit.js');

class Winget {
    install_queue = []
    must_softs = []

    search(query) {
        return new Promise((resolve, reject) => {
            exec(`winget search ${query}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        }).catch(() => { })
    }

    async install(softConfig, callback) {
        let target = softConfig.target;
        let basename = softConfig.basename;
        let grouname = softConfig.grouname;
        let aid = softConfig.aid;
        let imgid = softConfig.imgid;
        let sPath = softConfig.path ? softConfig.path : target;
        let soft_folder = fileUnit.getLevelPath(sPath, 2)
        let source_local = softConfig.source_local;
        let winget_id = softConfig.winget_id;
        if (!aid) {
            aid = shortcutIconWidget.genAid(basename)
            softConfig.aid = aid
        }
        if (!imgid) {
            imgid = shortcutIconWidget.genImagId(grouname, basename)
            softConfig.aid = aid
        }
        // return
        if (winget_id) {
            await this.installById(softConfig, true, callback);
        } else if (source_local) {
            await this.installByInstallPack(softConfig, grouname, callback);
        } else {
            await this.installByUnzipRemote(softConfig, grouname, callback);
        }
    }

    installById(installConfig, silent = true, callback) {
        let { basename, winget_id, aid, imgid, grouname } = installConfig
        htmlWidget.startInstallProgress(0, 1, aid)
        this.isInstalled(winget_id, aid).then((isInstalled) => {
            if (!isInstalled) {
                htmlWidget.startInstallProgress(20, 30, aid)
                let soft_localpath = stringUnit.to_windowspath(path.join(config.soft_localpath, basename))
                let cmd = `winget install --id "${winget_id}"`
                if (silent) {
                    cmd += ` --accept-package-agreements --location "${soft_localpath}" --silent`
                }
                fileUnit.mkdir(soft_localpath)
                this.install_queue.push({
                    id: winget_id,
                    winget_id,
                    command: cmd,
                    aid,
                    imgid,
                    callback
                })
                this.exec_install()
            } else {
                htmlWidget.startInstallProgress(10, 100, aid, 100, true, 50)
            }
        }).catch(e => { })
    }

    installByInstallPack(installConfig, group_name, callback) {
        let remote_update_url = config.setting_soft_remote_update_url
        if (remote_update_url.startsWith('\\\\')) {
            this.installByConfigProgress(installConfig, group_name, callback, `NetwordShare`)
        } else if (remote_update_url.startsWith('http://') || remote_update_url.startsWith('https://')) {
            this.installByConfigProgress(installConfig, group_name, callback, `HttpDownload`)
        } else if (remote_update_url.startsWith('ftp://')) {
            if (callback) callback(false)
        } else {
            if (callback) callback(false)
        }
    }

    installByUnzipRemote(installConfig, group_name, callback) {
        console.log(`installByUnzipRemote`)
        console.log(installConfig)
        return 
        let remote_update_url = config.setting_soft_remote_update_url
        if (remote_update_url.startsWith('\\\\')) {
            this.installByConfigProgress(installConfig, group_name, callback, `NetwordShare`)
        } else if (remote_update_url.startsWith('http://') || remote_update_url.startsWith('https://')) {
            this.installByConfigProgress(installConfig, group_name, callback, `HttpDownload`)
        } else if (remote_update_url.startsWith('ftp://')) {
            if (callback) callback(false)
        } else {
            if (callback) callback(false)
        }
    }

    async installByConfigProgress(installConfig, group_name, callback, remoteType = 'NetwordShare') {
        let install_key = `install.installedSoftFolders`
        let { target, basename, soruce_url, default_dir, iconPath, iconBase64 } = installConfig
        let remote_url = config.setting_soft_remote_update_url
        let install_path = config.soft_localpath
        let Drive = fileUnit.getDrive(install_path)
        let aid = `a` + stringUnit.get_id(basename)
        if (!fileUnit.isFile(target)) {

            let soft_basefolder = fileUnit.getLevelPath(target, 0, 2)
            if (winapiWidget.hasListUserData(install_key, soft_basefolder)) {
                shortcutIconWidget.updateIconToHTML(group_name, basename, target)
                if (callback) return callback(true)
                return
            }
            fileUnit.mkdir(install_path)
            let base_path = fileUnit.slicePathLevels(target, 2)
            let soft_basename = path.basename(base_path)
            let zip_name = `${soft_basename}.zip`
            htmlWidget.startInstallProgress(0, 50, aid)

            let target_zipname = path.join(Drive + ':/.temp/applications', zip_name)

            let zip_network_path
            if (remoteType == 'NetwordShare') {
                zip_network_path = fileUnit.getNetworkPath(remote_url, `applications/${zip_name}`)
                this.installProgressInfo(basename, target, zip_network_path, target_zipname, base_path)
                fileUnit.putCopyTask(zip_network_path, target_zipname, null,
                    (destination, success, timeDifference) => {
                        this.unzipAndinstall(aid, destination, install_path, success, group_name, basename, target, target_zipname, install_key, soft_basefolder, callback)
                    })

            } else if (remoteType == 'HttpDownload') {
                zip_network_path = httpWidget.joinURL(remote_url, `applications/${zip_name}`)
                this.installProgressInfo(basename, target, zip_network_path, target_zipname, base_path)
                httpWidget.get_file(zip_network_path, target_zipname).then((result) => {
                    let destination = result.dest
                    let success = result.success
                    this.unzipAndinstall(aid, destination, install_path, success, group_name, basename, target, target_zipname, install_key, soft_basefolder, callback)
                })
            }

        } else {
            shortcutIconWidget.updateIconToHTML(group_name, basename, target)
            console.log(`basename ${basename} is already installed`)
            if (callback) callback(true)
        }
    }

    installProgressInfo(basename, target, zip_network_path, target_zipname, base_path) {
        console.log(`Installing ${basename} Infoa:`)
        console.log(`\ttarget: ${target}`)
        console.log(`\tzip_network_path: ${zip_network_path}`)
        console.log(`\ttarget_zipname: ${target_zipname}`)
        console.log(`\tbase_path: ${base_path}`)
    }

    unzipAndinstall(aid, destination, install_path, success, group_name, basename, target, target_zipname, install_key, soft_basefolder, callback) {
        htmlWidget.startInstallProgress(50, 95, aid)
        console.log(`install copyed:`)
        console.log(`\tdestination: ${destination}`)
        console.log(`\tsuccess: ${success}`)
        console.log(`\tinstall_path: ${install_path}`)
        if (destination && success) {
            try {
                zipWidget.putUnZipTask(destination, install_path, () => {
                    htmlWidget.startInstallProgress(95, 99, aid)
                    console.log(`Start to update the icon to the interface by :`)
                    console.log(`\ttarget: ${target}`)
                    shortcutIconWidget.updateIconToHTML(group_name, basename, target)
                    fileUnit.delete(target_zipname)
                    htmlWidget.startInstallProgress(99, 100, aid)
                    winapiWidget.addListUserData(install_key, soft_basefolder)
                    if (callback) callback(true)
                })
            } catch (e) {
                console.log(e)
                if (callback) callback(false)
            }
        } else {
            htmlWidget.startInstallProgress(0, 0, aid)
            if (callback) callback(false)
        }
    }

    exec_install() {
        if (this.install_queue.length == 0) {
            return;
        }
        let { id, command, aid, callback, winget_id } = this.install_queue.shift();
        let startTime = new Date();

        let stdoutData = '';
        let isSuccess = false;

        utilUnit.exeBySpawn(command, (msg) => {
            console.log(msg)
            httpWidget.sendToWebSocket('public:addCommand', msg)
            htmlWidget.addInstallProgress(1, 98, aid)
        }, (done, success, stdoutData) => {
            if (stdoutData.includes("Successfully installed")) {
                isSuccess = true;
            }
            let installstatus = ``
            const timeDifference = new Date() - startTime; // 计算时间间隔
            if (isSuccess) {
                installstatus = `successfully`
                htmlWidget.startInstallProgress(98, 101, aid);
            } else {
                installstatus = `failed`
                htmlWidget.startInstallProgress(0, 0, aid, 100, false);
            }
            let msg = `${winget_id} installed ${installstatus}, time taken ${timeDifference / 1000}m`
            if (isSuccess) {
                messageWidget.success(msg)
            } else {
                messageWidget.error(msg)
            }
            httpWidget.sendToWebSocket('public:addCommand', stdoutData)
            if (callback) callback(isSuccess);
            this.exec_install();
        })


        childProcess.stdout.on('data', (data) => {
            // htmlWidget.addInstallProgress(aid);
            stdoutData += data.toString();
            console.log(`on_data`);
            console.log(data.toString());
        });

        childProcess.stderr.on('data', (data) => {
            // htmlWidget.addInstallProgress(aid);
            console.log(`data`);
            console.log(`StdError: ${data.toString()}`);
        });

        childProcess.on('exit', (code) => {
            if (code !== 0) {
                console.log(`success`);
                console.log(`Error: Process exited with code ${code}`);
            } else {
                if (stdoutData.includes("Successfully installed")) {
                    isSuccess = true;
                }
                console.log(`success`);
                const timeDifference = new Date() - startTime; // 计算时间间隔
                console.log(`${id} installed success. ${timeDifference}s`);
                htmlWidget.startInstallProgress(98, 101, aid);
                if (callback) callback(isSuccess);
                this.exec_install();
            }
        });
    }

    uninstall(packageId) {
        return new Promise((resolve, reject) => {
            exec(`winget uninstall ${packageId}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        }).catch(() => { })
    }

    isInstalled(packageId, aid) {
        return new Promise((resolve, reject) => {
            utilUnit.exeBySpawn(`winget list`, (msg) => {
                htmlWidget.addInstallProgress(1, 20, aid)
            }, (done, success, stdout) => {
                if (done) {
                    let isExists = false
                    if (stdout.includes(packageId)) {
                        isExists = true
                    }
                    if (!success) {
                        reject(false)
                    }
                    resolve(isExists);
                }
            })
        }).catch(() => { })
    }

    queryInstalled(packageIds) {
        return new Promise((resolve, reject) => {
            utilUnit.exeBySpawn(`winget list`, (done, success, stdout) => {
                if (done) {
                    let unInstalled = []
                    packageIds.forEach((packageId) => {
                        if (!stdout.includes(packageId)) {
                            unInstalled.push(packageId)
                        }
                    })
                    if (error) {
                        reject(unInstalled)
                    }
                    resolve(unInstalled);
                }
            });
        }).catch(() => { })
    }

    setInstallPath(path) {
        // Winget CLI 不直接支持设置安装路径，但你可以尝试使用其他工具或手动设置它。
        // 这个方法仅作为一个示例。
        console.log(`Setting install path is not directly supported by winget CLI.`);
    }

    query_exe(targetFolderPath) {
        const installExePath = path.join(targetFolderPath, 'install.exe');
        // 如果 install.exe 存在，则返回该文件路径
        if (fs.existsSync(installExePath)) {
            return installExePath;
        }
        const misFiles = fs.readdirSync(targetFolderPath).filter(file => path.extname(file) === '.msi');
        if (misFiles.length > 0) {
            return misFiles[0]
        }
        // 否则查找包含 install 的 exe 文件
        const exeFiles = fs.readdirSync(targetFolderPath).filter(file => path.extname(file) === '.exe');
        if (exeFiles.length === 1) {
            // 如果目录下只有一个 exe 文件，则直接返回该文件路径
            return path.join(targetFolderPath, exeFiles[0]);
        } else if (exeFiles.length > 1) {
            // 如果目录下有多个 exe 文件，则返回体积最大的
            let maxSize = -1;
            let maxFile = '';
            for (const file of exeFiles) {
                const filePath = path.join(targetFolderPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isFile() && stat.size > maxSize) {
                    maxSize = stat.size;
                    maxFile = filePath;
                }
            }
            return maxFile;
        } else {
            // 如果都没有找到，则返回该目录下的唯一一个文件
            const files = fs.readdirSync(targetFolderPath);

            if (files.length === 1) {
                return path.join(targetFolderPath, files[0]);
            } else {
                return null
            }
        }
    }

    createInstallIconChart(aid, src, percent, w, h,) {
        if (!w) w = config_base.icon_width
        if (!h) h = config_base.icon_height
        let cw = w
        let ch = h
        let r = 100
        let cx = 100
        let cy = 100
        let imgId = stringUnit.create_id(src)
        let html = `
        <div id="install_${imgId}">
            <figure id="selft-pie2" style="position:relative;width:${w}px;height:${h}px;"><svg xmlns:svg="http://www.w3.org/2000/svg"
                    xmlns="http://www.w3.org/2000/svg"
                    style="width:100%;height:100%;-webkit-transform: rotate(-90deg);transform: rotate(-90deg);overflow:visible;">
                    <circle r="${r}" cx="${cx}" cy="${cy}" style="fill:rgb(26, 188, 156,0);"></circle>
                    <circle r="50.5" cx="100" cy="100"
                        style="fill: rgba(26, 188, 156, 0); stroke: url(&quot;#${imgId}&quot;); stroke-width:${cw}px; stroke-dasharray: ${percent}px, 316.673px;">
                    </circle>
                </svg>
            </figure>
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <defs>
                    <pattern id="${imgId}" x="0" y="0" width="1" height="1" viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid slice">
                        <image width="100" height="100" xlink:href="${src}"></image>
                    </pattern>
                </defs>
                <!-- 使用模式填充圆形 -->
                <circle cx="100" style="display: none;" cy="100" r="50" fill="url(#${imgId})"></circle>
            </svg>
        </div>
        `
        htmlWidget.addHTMLToInnerAfter(`.aid_container_${aid}`, html)
    }

}

module.exports = new Winget()

