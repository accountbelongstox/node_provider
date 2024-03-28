const fs = require('fs');
const path = require('path');
const Base = require('../base/base');
const { exec, execSync } = require('child_process');
const querystring = require('querystring');
const https = require('node:https');
const http = require('node:http');
const readline = require('readline');
const os = require('os');
const { env } = require('../globalvars');
const { ziptask,conf } = require('./units');

class Getnode extends Base {
    tmpDirName = `nodes_autoinstaller`
    error = {}
    mirrors_url = `https://mirrors.tencent.com/npm/`
    node_dist_url = 'https://nodejs.org/dist/';
    node_dist_file = 'node_dist.html';

    retryLimit = 30;
    retryCount = 0;

    constructor(tmpDir) {
        super()
        this.tmpDir = tmpDir || '';
        this.versionNumber = '';
        this.nodeInstallDir = '/usr/node';
    }

    getCurrentOS() {
        return os.platform();
    }

    isWindows() {
        return this.getCurrentOS() === 'win32';
    }

    isLinux() {
        return this.getCurrentOS() === 'linux';
    }

    getNodeDirectory(npath) {
        const currentOS = this.getCurrentOS();
        let tmpDir = '/usr/nodes';
        if (currentOS === 'win32') {
            tmpDir = `D:/lang_compiler`;
        }
        if (npath) tmpDir = path.join(tmpDir, npath)
        this.mkdir(tmpDir)
        return tmpDir
    }

    getLocalDir(subpath) {
        const appDataLocalDir = process.env.LOCALAPPDATA || path.join(process.env.APPDATA, 'Local');
        if (subpath) {
            return path.join(appDataLocalDir, subpath);
        } else {
            return appDataLocalDir;
        }
    }

    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            console.log(`Error reading file "${filePath}": ${error.message}`);
            return ``
        }
    }


    getTempDirectory() {
        const currentOS = this.getCurrentOS();
        let tmeDir = '/tmp/node';
        if (currentOS === 'win32') {
            tmeDir = path.join(this.getLocalDir(), this.tmpDirName);;
        }
        this.mkdir(tmeDir)
        return tmeDir
    }

    getDownloadDirectory(fpath) {
        const homeDir = os.homedir();
        const downloadsDir = path.join(homeDir, 'Downloads');
        const currentOS = this.getCurrentOS();
        let tmeDir = '/tmp/node/Downloads';
        if (currentOS === 'win32') {
            tmeDir = path.join(downloadsDir, this.tmpDirName);;
        }
        this.mkdir(tmeDir)
        if (fpath) tmeDir = path.join(tmeDir, fpath)
        return tmeDir
    }

    mkdir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    async download(downUrl, downname) {
        let downloadDir = this.getDownloadDirectory()
        if (!downname) downname = downUrl.split('/').pop()
        downname = this.unescape_url(downname)
        if (!downloadDir.endsWith(downname)) {
            downloadDir = path.join(downloadDir, downname)
        }
        await this.downFile(downUrl, downloadDir);
        return downloadDir
    }

    mkbasedir(directoryPath) {
        directoryPath = path.dirname(directoryPath)
        return this.mkdir(directoryPath)
    }

    downFile(downUrl, dest) {
        return new Promise((resolve, reject) => {
            this.mkbasedir(dest);
            const protocol = downUrl.startsWith('https') ? https : http;
            const fileStream = fs.createWriteStream(dest);
            const req = protocol.get(downUrl, res => {
                if (res.statusCode !== 200) {
                    this.retry(downUrl, dest, resolve, reject);
                    return;
                }
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(dest);
                });
            });
            req.on('error', error => {
                fs.unlink(dest, () => {
                    this.retry(downUrl, dest, resolve, reject);
                });
            });
            fileStream.on('error', error => {
                fs.unlink(dest, () => {
                    this.retry(downUrl, dest, resolve, reject);
                });
            });
            req.end();
        });
    }

    retry(downUrl, dest, resolve, reject) {
        if (this.retryCount < this.retryLimit) {
            this.retryCount++;
            console.log(`Retry ${this.retryCount} for file ${dest}`);
            this.downFile(downUrl, dest).then(resolve).catch(reject); // 重新下载
        } else {
            console.log(`Retry limit reached for file ${dest}`);
            reject(false);
        }
    }

    isFile(filename) {
        if (!filename || typeof filename != "string") {
            return false
        }
        if (fs.existsSync(filename)) {
            const stats = fs.statSync(filename);
            if (stats.isFile()) {
                return true
            }
        }
        return false
    }

    async compareFileSizes(remoteUrl, localPath) {
        if (!this.isFile(localPath)) return false
        try {
            const remoteSize = await this.getRemoteFileSize(remoteUrl);
            const localSize = this.getFileSize(localPath);
            console.log(`compareFileSizes : url:${remoteUrl},remoteSize:${remoteSize},localPath:${localPath}`)
            return remoteSize == localSize;
        } catch (err) {
            console.error("An error occurred:", err);
            return false;
        }
    }
    getFileSize(filePath) {
        if (!this.existsSync(filePath)) {
            return -1
        }
        try {
            const stats = fs.statSync(filePath);
            const fileSizeInBytes = stats.size;
            return fileSizeInBytes;
        } catch (error) {
            return -1; // 返回-1表示获取文件大小失败
        }
    }

    unescape_url(url) {
        const unescapedURL = querystring.unescape(url);
        return unescapedURL
    }

    get_node_downloads() {
        return {
        }
    }

    get_version() {
        return parseFloat(process.version.slice(1));
    }

    get_version_full() {
        return process.version;
    }

    get_node_modules(appPath) {
        return path.join(appPath, "node_modules");
    }

    extract_nodeversip(appConfig) {
        const specified_node_version = appConfig.package_json?.engines?.node;
        this.warn(appConfig.name, specified_node_version);

        return specified_node_version
            ? specified_node_version.split(' ')
                .map(token => parseFloat(token.replace(/^[^\d]*(\d.*)$/, '$1')))
                .filter(number => !isNaN(number))
            : [];
    }

    extractVersionsByOut(content) {
        return content
            ? (content.match(/Expected version "([0-9 ||]+)"/)?.[1]?.split(' || ') || null)
            : null;
    }

    extractErrorsByStr(inputString) {
        return inputString
            ? inputString.split('\n')
                .filter(line => line.includes('error'))
                .map(line => line.trim()) || null
            : null;
    }
    async readVersionNumber() {
        return new Promise((resolve) => {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            readline.question('Enter the version number: ', (version) => {
                this.versionNumber = version;
                readline.close();
                resolve();
            });
        });
    }

    hasSudo() {
        try {
            execSync('sudo -n true', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }
    getLastModifiedTime(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.mtime;
        } catch (error) {
            console.error(`Error getting last modified time for file "${filePath}":`, error);
            return null;
        }
    }

    async getNodeDistHtml() {
        const nodeDistHtmlPath = path.join(this.getDownloadDirectory(), 'node_dist.html');
        let reDonload = false
        if (this.isFile(nodeDistHtmlPath)) {
            const lastModifiedTime = this.getLastModifiedTime(nodeDistHtmlPath)
            if (lastModifiedTime) {
                const diffInMs = Date.now() - lastModifiedTime.getTime();
                if (diffInMs > (24 * 60 * 60 * 1000)) {
                    reDonload = true
                }
            } else {
                reDonload = true
            }
        } else {
            reDonload = true
        }
        if (reDonload) {
            await this.downloadNodeDistHtml()
        }
        return nodeDistHtmlPath
    }

    async getLocalSimpleVersionsList() {
        const versions = await this.getLocalVersionsList()
        const groupedVersions = versions.reduce((groups, version) => {
            const [, major, minor] = version.split('.');
            const key = `${major}.${minor}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(version);
            return groups;
        }, {});

        const groupsInfo = Object.values(groupedVersions).map(group => {
            const firstVersion = group[0];
            const [, major, minor] = firstVersion.split('.');
            return `v${major}.${minor}.x (${group.length} versions)`;
        });
        return groupedVersions
    }

    async getLocalVersionsList() {
        const DistHtml = await this.getNodeDistHtml();
        const Content = this.readFile(DistHtml)

        const versionPattern = /\bv(\d+\.\d+)\.\d+\b/g;
        const versionsList = Content.match(versionPattern);
        if (!Array.isArray(versionsList)) {
            versionsList = []
        }
        return versionsList
        if (versionsList) {
            const latestVersionsList = await this.getLatestVersionFromList(versionsList);
            this.readVersionNumber()
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter the major version number: ', (answer) => {
                rl.close();
                const majorNumber = parseInt(answer);
                if (isNaN(majorNumber)) {
                    console.log('Invalid input. Please enter a valid integer.');
                } else {
                    console.log(`Major version number entered: ${majorNumber}`);
                    this.getLatestVersionByMajor(majorNumber, latestVersionsList)
                        .then((resolvedValue) => {
                            console.log(resolvedValue);
                            const version = resolvedValue;
                            console.log("version", version);
                            this.installNode(version)
                            const projectName = 'faker'
                            const startScript = 'main.js';
                            const nodePath = '/usr/node/' + version + '/node-' + version + '-linux-x64' + '/bin/node';
                            const command = `${nodePath} ${startScript}`;
                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`执行命令时发生错误：${error}`);
                                    return;
                                }
                                console.log(`${projectName}`);
                            });
                            this.getNpmByVersion(version);
                            this.getYarnByVersion(version);
                            this.getPm2ByVersion(version);
                            // 定义项目目录、项目类型、启动参数和 Node.js 版本
                            let projectDir = '/mnt/d/programing/faker/';
                            let projectType = 'vue'; // 项目类型
                            let startParameter = 'dev'; // 启动参数
                            //    let nodeVersion = '18'; // Node.js 版本
                            this.runByPm2(projectDir, projectType, startParameter, version);
                        })
                        .catch((error) => {
                            console.error('An error occurred:', error);
                        });

                }

            });

        } else {
            console.log('No versions found in the file.');
        }
    }

    async getLatestVersionFromList(versionsList) {
        if (!versionsList) versionsList = await this.getLocalVersionsList()
        const latestVersionsMap = {};

        for (const version of versionsList) {
            const versionNumber = version.replace(/^v/, '');
            const [major, minor, patch] = versionNumber.split('.').map(Number);
            const currentMajor = latestVersionsMap[major];

            if (!currentMajor || minor > currentMajor.minor || (minor === currentMajor.minor && patch > currentMajor.patch)) {
                latestVersionsMap[major] = { minor, patch, version };
            }
        }
        const latestVersions = Object.values(latestVersionsMap).map(({ version }) => version);
        return latestVersions;
    }

    async downloadNodeDistHtml() {
        await this.download(this.node_dist_url, this.node_dist_file);
    }

    async getLatestVersionByNumber(versionNumber, versionsList) {
        let maxVersion = null;

        for (const version of versionsList) {
            if (version.startsWith(versionNumber)) {
                if (!maxVersion || this.compareVersions(version, maxVersion) > 0) {
                    maxVersion = version;
                }
            }
        }

        return maxVersion;
    }
    async getLatestVersionByMajor(majorNumber, latestVersionsList) {
        for (const version of latestVersionsList) {
            const versionNumber = version.replace(/^v/, '');
            const [major, ,] = versionNumber.split('.').map(Number);

            if (major === majorNumber) {
                return version;
            }
        }

        return null;
    }

    compareVersions(versionA, versionB) {
        const partsA = versionA.split('.').map(Number);
        const partsB = versionB.split('.').map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const partA = partsA[i] || 0;
            const partB = partsB[i] || 0;

            if (partA !== partB) {
                return partA - partB;
            }
        }

        return 0;
    }

    async installNode(version) {
        const nodeDir = path.join(this.nodeInstallDir, version);

        if (fs.existsSync(nodeDir)) {
            console.log(`Node version ${version} is already installed at ${nodeDir}`);
            return;
        }

        try {
            if (!fs.existsSync(this.nodeInstallDir)) {
                fs.mkdirSync(this.nodeInstallDir, { recursive: true });
            }

            if (!fs.existsSync(nodeDir)) {
                fs.mkdirSync(nodeDir, { recursive: true });
            }

            const downloadUrl = `https://nodejs.org/dist/${version}/node-${version}-linux-x64.tar.gz`;
            const downloadPath = path.join(this.nodeInstallDir, `node-${version}-linux-x64.tar.gz`);

            console.log(`Downloading Node.js ${version} from ${downloadUrl}...`);
            await this.downloadFile(downloadUrl, downloadPath);
            console.log(`Node.js ${version} downloaded successfully.`);

            console.log(`Extracting Node.js ${version} to ${nodeDir}...`);
            await this.extractFile(downloadPath, nodeDir);
            console.log(`Node.js ${version} extracted successfully.`);

            console.log(`Node.js ${version} installed successfully at ${nodeDir}`);
        } catch (error) {
            console.error(`Error installing Node.js ${version}:`, error);
        }
    }

    extractFile(src, destDir) {
        return new Promise((resolve, reject) => {
            const tarProcess = exec(`tar -xzf ${src} -C ${destDir}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });

            tarProcess.stdin.end();
        });
    }

    getNodeExecutable() {
        if (this.isLinux()) {
            return 'node';
        } else {
            return 'node.exe';
        }
    }

    getNpmExecutable() {
        if (this.isLinux()) {
            return 'npm';
        } else {
            return 'npm.cmd';
        }
    }

    getNpxExecutable() {
        if (this.isLinux()) {
            return 'npx';
        } else {
            return 'npx.cmd';
        }
    }

    getYarnExecutable() {
        if (this.isLinux()) {
            return 'yarn';
        } else {
            return 'yarn.cmd';
        }
    }

    getPm2Executable() {
        if (this.isLinux()) {
            return 'pm2';
        } else {
            return 'pm2.cmd';
        }
    }

    getFileNameWithoutExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            return fileName.slice(0, lastDotIndex);
        } else {
            return fileName;
        }
    }

    findNodeVersionByPlatform(nodeHrefVersions, version) {
        let matchRoles = [`v${version}.`, 'win', 'x64', '.7z']
        if (this.isLinux()) {
            matchRoles = [`v${version}.`, 'linux', 'x64', '.gz']
        }
        let matchRolesCopy = matchRoles.slice();
        let matchFound = false;
        while (!matchFound && matchRolesCopy.length > 0) {
            for (const version of nodeHrefVersions) {
                let mathis = true
                for (const versionmatch of matchRolesCopy) {
                    if (!version.includes(versionmatch)) {
                        mathis = false
                    }
                }
                if (mathis) {
                    return version;
                }
            }
            matchRolesCopy.pop();
        }
        return null
    }

    extractNodeHrefVersions(nodeHTMLContent) {
        const lines = nodeHTMLContent.split('\n');
        const hrefValues = [];
        lines.forEach(line => {
            const hrefMatch = line.match(/href="(.*?)"/);
            if (hrefMatch && hrefMatch[1]) {
                hrefValues.push(hrefMatch[1]);
            }
        });

        return hrefValues;
    }

    installNodeAndYarn(nodePath, npmPath, nodeInstallFileDir) {
        console.log(`Node.js version: ${nodePath}`);
        console.log(`Npm version: ${npmPath}`);
        let nodeVersion = execSync(`${nodePath} -v`, { encoding: 'utf-8' });
        let npmVersion = execSync(`${npmPath} -v`, { encoding: 'utf-8' });
        console.log(`Node.js version: ${nodeVersion}`);
        console.log(`Npm version: ${npmVersion}`);
        let cmd = `${npmPath} config set prefix "${nodeInstallFileDir}"`;
        if (this.isLinux && this.hasSudo()) {
            cmd = `sudo ${cmd}`;
        }
        console.log(cmd);
        let out = execSync(cmd, { encoding: 'utf-8' });
        console.log(out);

        cmd = `${npmPath} config set registry ${this.mirrors_url}`;
        if (this.isLinux && this.hasSudo()) {
            cmd = `sudo ${cmd}`;
        }
        console.log(cmd);
        out = execSync(cmd, { encoding: 'utf-8' });
        console.log(out);

        cmd = `${npmPath} install -g yarn`;
        if (this.isLinux && this.hasSudo()) {
            cmd = `sudo ${cmd}`;
        }
        console.log(cmd);
        out = execSync(cmd, { encoding: 'utf-8' });
        console.log(out);

        cmd = `${npmPath} install -g pm2`;
        if (this.isLinux && this.hasSudo()) {
            cmd = `sudo ${cmd}`;
        }
        console.log(cmd);
        out = execSync(cmd, { encoding: 'utf-8' });
        console.log(out);
        console.log('Node.js installation completed.');
    }

    async getNodeByVersion(version = `18`) {
        const nodeDir = this.getNodeDirectory()
        let nodeHrefVersions = fs.readdirSync(nodeDir);
        let matchingVersion = this.findNodeVersionByPlatform(nodeHrefVersions, version)
        const nodeExe = this.getNodeExecutable()
        if (!this.isFile(path.join(this.getNodeDirectory(matchingVersion), nodeExe))) {
            const latestVersionFromList = await this.getLatestVersionFromList()
            const matchedVersion = latestVersionFromList.find(versionString => versionString.startsWith(`v${version}.`));
            if (matchedVersion) {
                const nodeDetailHTML = `${matchedVersion}.html`
                let nodeDetailDownloadFile = this.getDownloadDirectory(nodeDetailHTML)
                if (!this.isFile(nodeDetailDownloadFile)) {
                    const nodeDetailUrl = `${this.node_dist_url}${matchedVersion}/`
                    nodeDetailDownloadFile = await this.download(nodeDetailUrl, nodeDetailHTML)
                }
                const nodeHTMLContent = this.readFile(nodeDetailDownloadFile)
                nodeHrefVersions = this.extractNodeHrefVersions(nodeHTMLContent)
                matchingVersion = this.findNodeVersionByPlatform(nodeHrefVersions, version)
                if (matchingVersion) {
                    let matchingVersionDownloadFile = this.getDownloadDirectory(matchingVersion)
                    if (!this.isFile(matchingVersionDownloadFile)) {
                        const nodeDownloadUrl = `${this.node_dist_url}${matchedVersion}/${matchingVersion}`
                        matchingVersionDownloadFile = await this.download(nodeDownloadUrl, matchingVersion)
                        matchingVersion = this.getFileNameWithoutExtension(matchingVersion)
                        await ziptask.putUnZipTaskPromise(matchingVersionDownloadFile, nodeDir)
                    }
                }
            }
        }
        if (matchingVersion) {
            return path.join(this.getNodeDirectory(matchingVersion), nodeExe)
        }
        return null
    }

    async getNpmByConfig(node_version) {
        if (!node_version) {
            const binConfig = conf.getAllAppBinConf()
            const devConfig = binConfig.dev
            const frontendConfig = devConfig.frontend
            const frontendDirectory = devConfig.directory
            node_version = frontendConfig.node
        }
        if(!node_version){
            console.log(`not found node version by apps/Bin.config.js`)
        }
        return await this.getNpmByNodeVersion(node_version)
    }

    async getNpmByNodeVersion(version) {
        const nodeExec = await this.getNodeByVersion(version);
        const nodeInstallPath = path.dirname(nodeExec);
        let npmExec = path.join(nodeInstallPath, this.getNpmExecutable());
        const yarnExec = path.join(nodeInstallPath, this.getYarnExecutable());
        if (!this.isFile(yarnExec)) {
            this.installNodeAndYarn(nodeExec, npmExec, nodeInstallPath)
        }
        npmExec = npmExec.replace(/\\/g, '/');
        return npmExec
    }

    async getNpxByNodeVersion(version) {
        const nodeExec = await this.getNodeByVersion(version);
        const nodeInstallPath = path.dirname(nodeExec);
        let npxExec = path.join(nodeInstallPath, this.getNpxExecutable());
        npxExec = npxExec.replace(/\\/g, '/');
        return npxExec
    }

    async getYarnByNodeVersion(version) {
        const nodeExec = await this.getNodeByVersion(version);
        const nodeInstallPath = path.dirname(nodeExec);
        let yarnExec = path.join(nodeInstallPath, this.getYarnExecutable());
        if (!this.isFile(yarnExec)) {
            const npmExec = path.join(nodeInstallPath, this.getNpmExecutable());
            this.installNodeAndYarn(nodeExec, npmExec, nodeInstallPath)
        }
        yarnExec = yarnExec.replace(/\\/g, '/');
        return yarnExec
    }

    async getPm2ByNodeVersion(version) {
        const nodeExec = await this.getNodeByVersion(version);
        const nodeInstallPath = path.dirname(nodeExec);
        let pm2Exec = path.join(nodeInstallPath, this.getPm2Executable());
        if (!this.isFile(pm2Exec)) {
            const npmExec = path.join(nodeInstallPath, this.getNpmExecutable());
            this.installNodeAndYarn(nodeExec, npmExec, nodeInstallPath)
        }
        pm2Exec = pm2Exec.replace(/\\/g, '/');
        return pm2Exec
    }

    // runByPm2(projectDir, projectType, start_parameter, node_version) {
    //     console.log("__dirname:", __dirname);
    //     let templatePath = path.join(__dirname, 'templates', 'ecosystem.config.js');

    //     if (!fs.existsSync(templatePath)) {
    //         console.error(`Template for ${projectType} does not exist.`);
    //         return;
    //     }

    //     const templateContent = fs.readFileSync(templatePath, 'utf-8');

    //     const targetPath = path.join(projectDir, 'ecosystem.config.js');

    //     fs.writeFileSync(targetPath, templateContent);

    //     console.log(`Generated ecosystem.config.js in ${targetPath}`);

    //     const nodeInstallPath = this.getNodeByVersion(node_version);
    //     const pm2Command = '/usr/bin/pm2';

    //     let command = `sudo  ${pm2Command} start ${targetPath} --name ${projectType}`;

    //     exec(command, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Error running project by PM2: ${error.message}`);
    //         } else {
    //             console.log(`Project started using Node.js ${node_version} and PM2.`);
    //         }
    //     });
    // }
}

Getnode.toString = () => '[class Getnode]';
module.exports = new Getnode();


