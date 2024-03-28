const path = require('path');
const os = require('os');
const fs = require('fs');
const Base = require('../base/base');
const http = require('http')
class Gdir extends Base {
    intranetIPAddress = `http://192.168.100.5/`
    localStaticHttpsApiUrl = `https://static.local.12gm.com:905/`
    localStaticHttpApiUrl = `http://static.local.12gm.com:805/`
    testAccessibleApi = null
    constructor() {
        super()
         
    }
    getDesktopFile(param) {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        
        if (param) {
            return path.join(desktopPath, param);
        } else {
            return desktopPath;
        }
    }
    getCustomTempDir(subDir) {
        const unixStylePath = __filename.split(/\\+/).join('/');
        const Driver = unixStylePath[0] + ":/"
        const temp = path.join(Driver, '.tmp');
        const fullPath = subDir ? path.join(temp, subDir) : temp;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        } 
        return fullPath;
    }
    getRelationRootDir(subDir) {
        const cwd = path.join(__dirname, '../../');
        const fullPath = subDir ? path.join(cwd, subDir) : cwd;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getUserProfileDir(subDir) {
        const userProfileDir = os.homedir();
        const fullPath = subDir ? path.join(userProfileDir, subDir) : userProfileDir;
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getRelationRootFile(subDir) {
        const fullPath = this.getRelationRootDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    getRootDir(subDir) {
        let cwd = this.getArg(`root`)
        if(!cwd)cwd = this.getRelationRootDir()
        const fullPath = subDir ? path.join(cwd, subDir) : cwd;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getRootFile(subDir) {
        const fullPath = this.getRootDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    async testLocalApiUrls() {
        try {
            await this.testUrl(this.intranetIPAddress);
            return this.intranetIPAddress
        } catch (error) {
            return this.localStaticHttpApiUrl
        }
    }
    async testUrl(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                const { statusCode } = res;
                if (statusCode >= 200 && statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Failed to access URL ${url}. Status code: ${statusCode}`));
                }
            }).on('error', (err) => {
                reject(new Error(`Failed to access URL ${url}. Error: ${err.message}`));
            });
        });
    }
    getLocalStaticApiUrl(upath) {
        if (upath) return this.localStaticHttpApiUrl + upath
        return this.localStaticHttpApiUrl
    }
    async getLocalStaticApiTestUrl(upath) {
        if(!this.testAccessibleApi)this.testAccessibleApi = await this.testLocalApiUrls()
        if (upath) return this.testAccessibleApi + upath
        return this.testAccessibleApi
    }
    getLocalDir(subDir) {
        const homeDir = this.getHomeDir(`.desktop_by_node`);
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getLocalInfoDir(subDir) {
        const homeDir = this.getLocalDir(`.info`);
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getLocalInfoFile(subDir) {
        const homeDir = this.getLocalInfoDir();        
        if (homeDir && !fs.existsSync(homeDir)) {
            fs.mkdirSync(homeDir, { recursive: true });
        }
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        return fullPath;
    }
    getLocalFile(subDir) {
        const dir = this.getHomeDir(`.desktop_by_node`);
        const fullPath = subDir ? path.join(dir, subDir) : dir;
        this.mkbasedir(fullPath)
        return fullPath;
    }
    getHomeDir(subDir) {
        const homeDir = os.homedir();
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getHomeFile(subDir) {
        const homeDir = this.getHomeDir();
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getTempDir(subDir) {
        const fullPath = subDir ? path.join(os.tmpdir(), subDir) : os.tmpdir();
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getTempFile(subDir) {
        const tempDir = this.getTempDir();
        const fullPath = subDir ? path.join(tempDir, subDir) : tempDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getAppDataDir(subDir) {
        const homeDir = os.homedir();
        const fullPath = subDir ? path.join(homeDir, 'AppData', subDir) : path.join(homeDir, 'AppData');
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getAppDataFile(subDir) {
        const appDataDir = this.getAppDataDir();
        const fullPath = subDir ? path.join(appDataDir, subDir) : appDataDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getDownloadDir(subDir) {
        const homeDir = os.homedir();
        const fullPath = subDir ? path.join(homeDir, 'Downloads', subDir) : path.join(homeDir, 'Downloads');
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getDownloadFile(subDir) {
        const appDataDir = this.getDownloadDir();
        const fullPath = subDir ? path.join(appDataDir, subDir) : appDataDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getPublicDir(subDir) {
        const publicDir = this.getRootDir('public');
        const fullPath = subDir ? path.join(publicDir, subDir) : publicDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
    getPublicFile(subDir) {
        const fullPath = this.getPublicDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    getLibraryDir(subDir) {
        const platform = os.platform();
        if (platform != 'win32') {
            return this.getLibraryByLinuxDir(subDir);
        } else  {
            return this.getLibraryByWin32Dir(subDir);
        }
    }
    getLibraryByLinuxDir(subDir) {
        const cwd = path.join(__dirname, '../');
        const fullPath = path.join(cwd, `base/library/linux/${subDir || ''}`);
        return fullPath;
    }
    getLibraryByWin32Dir(subDir) {
        const cwd = path.join(__dirname, '../');
        const fullPath = path.join(cwd, `base/library/win32/${subDir || ''}`);
        return fullPath;
    }
    getStaticFile(subDir) {
        const fullPath = this.getStaticDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    getStaticDir(subDir) {
        return this.getPublicDir(`static/${subDir || ''}`);
    }
    getStaticFile(subDir) {
        const fullPath = this.getStaticDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    getCoreDir(subDir) {
        return this.getPublicDir(`core/${subDir || ''}`);
    }
    getCoreFile(subDir) {
        const fullPath = this.getCoreDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    getSrcDir(subDir) {
        return this.getPublicDir(`src/${subDir || ''}`);
    }
    getSrcFile(subDir) {
        const fullPath = this.getSrcDir(subDir);
        this.mkbasedir(fullPath);
        return fullPath;
    }
    mkbasedir(directoryPath) {
        directoryPath = path.dirname(directoryPath)
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }
    }
    mkdir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    getArg(name) {
        if (typeof name === 'number') {
            name = name + 1;
            if (process.argv.length > name) {
                return process.argv[name];
            } else {
                return null;
            }
        }
        for (let i = 0; i < process.argv.length; i++) {
            const arg = process.argv[i];
            const regex = new RegExp("^[-]*" + name + "(\$|=|-|:)");
            if (regex.test(arg)) {
                if (arg.includes(`${name}:`)) {
                    return arg.split(":")[1];
                }else if (arg.includes(`${name}=`)) {
                    return arg.split("=")[1];
                } else if (arg === `--${name}` || arg === `-${name}` || arg.match(`^-{0,1}\\*{1}${name}`)) {
                    if (i + 1 < process.argv.length) {
                        return process.argv[i + 1];
                    } else {
                        return null;
                    }
                } else if (arg === name) {
                    if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("-")) {
                        return process.argv[i + 1];
                    } else {
                        return "";
                    }
                }
            }
        }
        return null;
    }
}
module.exports = new Gdir()