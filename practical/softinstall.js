'use strict';
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fetch = require('node-fetch');
const child_process = require('child_process');
const { gdir } = require('../globalvars.js');
const Base = require('../base/base');
const { httptool, zip, file } = require('../utils.js');

class Softinstall extends Base {
    installQueue = {}
    isQueueRunning = false;
    installation_socket_event_name = `installer`

    constructor() {
        super();
    }

    addInstallQueue(software) {
        if (!software || typeof software !== 'object') {
            console.error('Invalid software object.');
            return;
        }

        if (!software.hasOwnProperty('basename')) {
            console.error('Software object must have a basename property.');
            return;
        }

        const { basename } = software;

        if (basename in this.installQueue) {
            console.warn(`${basename} is already in the installation queue.`);
            return;
        }

        this.installQueue[basename] = software;

        httptool.eggSocket(this.installation_socket_event_name, {
            type: 'add',
            message: `Added ${basename} to the installation queue`,
            progress: 0,
            basename,
            aid: software.aid,
        });

        if (!this.isQueueRunning) {
            this.popInstallQueue();
        }
    }

    popInstallQueue() {
        const queueLength = Object.keys(this.installQueue).length;
        if (queueLength > 0) {
            const keys = Object.keys(this.installQueue);
            const firstKey = keys[0];
            const software = this.installQueue[firstKey];
            delete this.installQueue[firstKey];
            const basename = software.basename;
            httptool.eggSocket(this.installation_socket_event_name, {
                type: 'pop',
                installMessage: `Installing ${software.basename}`,
                progress: 1,
                basename,
                aid: software.aid,
            });
            this.installSoftware(software, (installingProgress, installMessage) => {
                installMessage = installMessage ? installMessage : `Installing ${software.basename}`
                httptool.eggSocket(this.installation_socket_event_name, {
                    type: 'progress',
                    installMessage,
                    installingProgress,
                    ...software
                });
            }
                ,
                () => {
                    software.isExist = file.isFile(software.target);
                    httptool.eggSocket(this.installation_socket_event_name, {
                        type: 'done',
                        installMessage: `Installed ${software.basename}`,
                        installingProgress: 100,
                        ...software
                    });
                    this.popInstallQueue()
                });
        } else {
            this.isQueueRunning = false
        }
    }

    async getSoftwareGroup() {
        const apiUrl = `${this.app.config.api_url}/config/soft_group.json`;
        try {
            const response = await fetch(apiUrl);
            if (response.status === 200) {
                const softwareGroup = await response.json();
                return softwareGroup;
            } else {
                throw new Error('Failed to retrieve software group data.');
            }
        } catch (error) {
            throw error;
        }
    }

    async getSoftwareIcons() {
        const apiUrl = `${this.app.config.api_url}/config/soft_icons.json`;
        try {
            const response = await fetch(apiUrl);
            if (response.status === 200) {
                const softwareIcons = await response.json();
                return softwareIcons;
            } else {
                throw new Error('Failed to retrieve software icon data.');
            }
        } catch (error) {
            throw error;
        }
    }

    async getSoftwareList() {
        const apiUrl = `${this.app.config.api_url}/config/soft_all.json`;
        try {
            const response = await fetch(apiUrl);
            if (response.status === 200) {
                const softwareList = await response.json();
                return softwareList;
            } else {
                throw new Error('Failed to retrieve software list data.');
            }
        } catch (error) {
            throw error;
        }
    }

    compareJSON(objA, objB) {
        if (typeof objA !== 'object' || typeof objB !== 'object') {
            return false;
        }
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) {
            return false;
        }
        for (const key of keysA) {
            if (typeof objA[key] === 'object' && typeof objB[key] === 'object') {
                if (!this.compareJSON(objA[key], objB[key])) {
                    return false;
                }
            } else if (objA[key] !== objB[key]) {
                return false;
            }
        }
        return true;
    }

    mergeJSON(objA, objB) {
        if (this.compareJSON(objA, objB)) {
            return objA;
        }
        return Object.assign({}, objA, objB);
    }

    readLocalSoftwareGroups() {
        const dataDir = path.join(this.app.config.appUserDataDir, 'data');
        const softwareGroupsFilePath = path.join(dataDir, 'software_groups.json');
        try {
            if (fs.existsSync(softwareGroupsFilePath)) {
                const softwareGroupsData = fs.readFileSync(softwareGroupsFilePath, 'utf8');
                return JSON.parse(softwareGroupsData);
            }
        } catch (error) {
            console.error('读取本地软件分组时出错:', error);
        }
        return {};
    }

    async readAndUpdateLocalSoftwareIcons() {
        const dataDir = path.join(this.app.config.appUserDataDir, 'data');
        const softwareIconsFilePath = path.join(dataDir, 'software_icons.json');
        let localSoftwareIcons = {};
        try {
            if (fs.existsSync(softwareIconsFilePath)) {
                const softwareIconsData = fs.readFileSync(softwareIconsFilePath, 'utf8');
                localSoftwareIcons = JSON.parse(softwareIconsData);
            }
        } catch (error) {
            console.error('读取本地软件图标时出错:', error);
        }
        try {
            const response = await axios.get('REMOTE_ICON_JSON_URL');
            if (response.status === 200) {
                localSoftwareIcons = { ...localSoftwareIcons, ...response.data };
                fs.writeFile(softwareIconsFilePath, JSON.stringify(localSoftwareIcons), (writeError) => {
                    if (writeError) {
                        console.error('写入本地软件图标时出错:', writeError);
                    }
                });
            }
        } catch (requestError) {
            console.error('请求远程软件图标时出错:', requestError);
        }
        return localSoftwareIcons;
    }

    async updateLocalSoftwareGroups() {
        const dataDir = path.join(this.app.config.appUserDataDir, 'data');
        const softwareGroupsFilePath = path.join(dataDir, 'software_groups.json');
        let localSoftwareGroups = {};
        try {
            if (fs.existsSync(softwareGroupsFilePath)) {
                const softwareGroupsData = fs.readFileSync(softwareGroupsFilePath, 'utf8');
                localSoftwareGroups = JSON.parse(softwareGroupsData);
            }
        } catch (error) {
            console.error('读取本地软件分组时出错:', error);
        }
        try {
            const response = await axios.get(remoteSoftwareGroupsURL);
            if (response.status === 200) {
                const remoteSoftwareGroups = response.data;
                Object.keys(remoteSoftwareGroups).forEach((groupName) => {
                    localSoftwareGroups[groupName] = localSoftwareGroups[groupName] || {};
                    const remoteGroup = remoteSoftwareGroups[groupName];
                    localSoftwareGroups[groupName] = { ...localSoftwareGroups[groupName], ...remoteGroup };
                });
                fs.writeFile(softwareGroupsFilePath, JSON.stringify(localSoftwareGroups), (writeError) => {
                    if (writeError) {
                        console.error('写入本地软件分组时出错:', writeError);
                    }
                });
            }
        } catch (requestError) {
            console.error('请求远程软件分组时出错:', requestError);
        }
    }

    parseSoftwareGroups(mergedSoftwareGroups) {
        const parsedSoftwareGroups = {};
        for (const groupName in mergedSoftwareGroups) {
            const group = mergedSoftwareGroups[groupName];
            parsedSoftwareGroups[groupName] = {};
            for (const softwareName in group) {
                const softwareObject = group[softwareName];
                if (softwareObject.basename && softwareObject.target) {
                    parsedSoftwareGroups[groupName][softwareName] = softwareObject;
                    const targetPath = softwareObject.target;
                    if (fs.existsSync(targetPath)) {
                        softwareObject.localFileExists = true;
                    } else {
                        softwareObject.localFileExists = false;
                    }
                }
            }
        }
        return parsedSoftwareGroups;
    }
    async executeSoftware(software) {
        if (!software.path || !software.target || !software.installation_method) {
            throw new Error('执行软件所需的参数不完整');
        }
        if (fs.existsSync(software.target)) {
            child_process.exec(`explorer "${software.target}"`);
        } else {
            if (software.installation_method === 'winget') {
                if (!software.winget_id) {
                    throw new Error('winget安装所需的参数不完整');
                }
                const installDir = software.default_install_dir || this.app.config.default_install_dir;
                const installCommand = `winget install --id ${software.winget_id} --location "${installDir}"`;
                child_process.exec(installCommand);
            } else if (software.installation_method === 'unzip') {
                if (!software.basename || !software.source_internet) {
                    throw new Error('解压安装所需的参数不完整');
                }
                const installDir = software.default_install_dir || this.app.config.default_install_dir;
                const installPath = path.join(installDir, software.basename);
                if (!fs.existsSync(installPath)) {
                    const fileUrl = `${this.app.config.API}/${software.source_internet}`;
                    const localFilePath = await this.downloadFile(fileUrl);
                    this.unzipFile(localFilePath, installDir);
                }
            } else {
                throw new Error('不支持的安装方法');
            }
        }
    }

    async installSoftware(software, progressCallback, callback) {
        const installDir = software.appDir;
        const basename = software.basename;
        const target = software.target;
        const mainDir = file.getLevelPath(target, 2);
        const source_local = software.source_local;
        const applications = 'softlist/static_src/applications/';

        const installProgress = { value: 0 };


        if (software.winget_id) {
            const installCommand = `winget install --id ${software.winget_id} --location "${installDir}"`;
            child_process.exec(installCommand);
        } else if (software.install_type === 'installer') {
            const installPath = path.join(installDir, basename);
            if (!fs.existsSync(installPath)) {
                const fileUrl = gdir.getLocalStaticApiUrl(`${software_library}/${source_local}.exe`);
                const localFilePath = await httptool.downloadFile(fileUrl, progressCallback);
                zip.putUnZipTask(localFilePath, installDir, progressCallback);
            }
        } else if (software.install_type === '') {
            if (!fs.existsSync(target)) {
                const downloadUrl = gdir.getLocalStaticApiUrl(`${applications}/${mainDir}.zip`);
                const localFilePath = await httptool.downloadFile(downloadUrl, null, (progress, readyDownload, downloading, message) => {
                    if (progress == -1) {
                        if (progressCallback) progressCallback(-1, message)
                        if (callback) callback();
                        return
                    } else {
                        installProgress.value = progress / 3
                        if (progressCallback) progressCallback(installProgress.value)
                    }
                });
                if (localFilePath && localFilePath.dest) {
                    const dest = localFilePath.dest

                    const timer = setInterval(() => {
                        if (installProgress.value < 99) {
                            installProgress.value++;
                            if (progressCallback) progressCallback(installProgress.value);
                        } else {
                            if (timer) clearInterval(timer);
                            if (callback) callback();
                            return
                        }
                    }, 1000);

                    zip.putUnZipTask(dest, installDir, () => {
                        if (progressCallback) progressCallback(100);
                        if (timer) clearInterval(timer);
                        if (callback) callback()
                        return
                    }, (progress) => {
                        console.log(`progress`, progress)
                    });
                } else {
                    const message = `Download and decompression errors.`
                    console.log(message)
                    if (progressCallback) progressCallback(-1, message)
                    if (callback) callback()
                    return
                }
            } else {
                const message = `Software ${basename} is already installed in ${target}`
                console.log(message)
                if (progressCallback) progressCallback(100, message)
                if (callback) callback()
                return
            }
        } else {
            return { error: { code: 'UNSUPPORTED_INSTALL_METHOD', message: 'Unsupported installation method' } };
        }
    }

    async installWithWinget(software) {
        if (!software.winget_id || !software.installation_method) {
            throw new Error('winget安装所需的参数不完整');
        }
        const installDir = software.default_install_dir || this.app.config.default_install_dir;
        const installCommand = `winget install --id ${software.winget_id} --location "${installDir}"`;
        child_process.exec(installCommand);
    }

    async installByUnpacking(software) {
        if (!software.basename || !software.installation_method) {
            throw new Error('解压安装所需的参数不完整');
        }
        const installDir = software.default_install_dir || this.app.config.default_install_dir;
        const basename = software.basename;
        const sourceInternet = software.source_internet;
        const downloadUrl = `${sourceInternet}/applications/${basename}.zip`;
        const targetPath = path.join(installDir, basename);
        if (Utils.fs.existsSync(targetPath)) {
            console.log(`软件 ${basename} 已经安装在 ${targetPath}`);
            return;
        }
        const tmpDir = this.app.config.HOME || this.app.config.userHome;
        const tmpFilePath = path.join(tmpDir, `${basename}.zip`);
        await this.downloadFile(downloadUrl, tmpFilePath);
        zip.putUnZipTask(tmpFilePath, installDir);
    }
}



Softinstall.toString = () => '[class Softinstall]';
module.exports = new Softinstall()
