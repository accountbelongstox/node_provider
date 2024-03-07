const path = require('path');
const os = require('os');
const fs = require('fs');
const Base = require('../base/base');
class Gdir extends Base{
    localStaticApiUrl = `https://static.local.12gm.com:905/`
    constructor() {
        super()
    }
    getRelationRootDir(subDir) {
        const cwd = path.join(__dirname, '../');
        const fullPath = subDir ? path.join(cwd, subDir) :cwd;
        if (fullPath && !fs.existsSync(fullPath)) {
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
        const fullPath = subDir ? path.join(process.cwd(), subDir) : process.cwd();
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
    getLocalStaticApiUrl(upath) {
        if(upath) return this.localStaticApiUrl + upath
        return this.localStaticApiUrl
    }
    getLocalDir(subDir) {
        const homeDir = this.getHomeDir(`.the_by_node`);
        const fullPath = subDir ? path.join(homeDir, subDir) : homeDir;
        if (fullPath && !fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    } 
    getLocalFile(subDir) {
        const dir = this.getHomeDir(`.the_by_node`);
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
        return this.getRelationRootDir(`library/${subDir || ''}`);
    }
    getLibraryByWin32Dir(subDir) {
        const fullPath = this.getLibraryDir(`win32/${subDir || ''}`);
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
}
module.exports = new Gdir()