const Base = require('../base/base');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { gdir, env } = require('../globalvars');

class Conf extends Base {
    prefix = ``

    constructor(config_name = "mainconf", config_sapce = "dd_electron_userdata") {
        super()
        //#TODO 将本类的 this.userDataDir 全部改成 const confDir = this.getConfigLocalDir()
        const confDir = this.getConfigLocalDir()
        //#TODO 将本类的 this.JSONCONFFile 全部改为 const defaultSettinsFile = this.getdefaultSettinsFile()
        const defaultSettinsFile = this.getdefaultSettinsFile()
        this.config = this.load(defaultSettinsFile)
    }

    getConfigLocalDir(settingsFile=``){
        const appName = this.getAppName()
        const localAppDataPath = path.join(os.homedir(), `.desktop_by_node${appName}`);
        //#TODO 如果目录localAppDataPath不存在则递归创建,如果settingsFile不为空则连接路径
        if (!fs.existsSync(localAppDataPath)) {
            fs.mkdirSync(localAppDataPath, { recursive: true });
        }
    
        // If a settings file is provided, append it to the path
        if (settingsFile) {
            return path.join(localAppDataPath, settingsFile);
        }
        return localAppDataPath
    }

    getdefaultSettinsFile(){
        // #TODO 调用getConfigLocalDir(`mainSettings.json`)并返回
         return this.getConfigLocalDir('mainSettings.json')
     }
 


    allAppConf() {
        return this.getAllAppConf()
    }

    getAllAppConf() {
        const appConfName = this.getAppName();
        const appDir = this.getAppDir();
        if (!appConfName || !appDir) {
            console.error(`Config file by (${appConfName}) not found`);
            return {};
        }
        const configFilePath = path.join(appDir, appConfName, `config`, 'config.default.js');
        if (!this.isFile(configFilePath)) {
            this.copyDefaultConfFile()
        }
        if (this.isFile(configFilePath)) {
            const config = require(configFilePath);
            if (typeof config === 'function') {
                return config();
            } else {
                return config;
            }
        } else {
            console.error(`Config file (${configFilePath}) not found`);
            return {};
        }
    }

    getAppConfDir() {
        const appConfName = this.getAppName();
        const appDir = this.getAppDir();
        return path.join(appDir, appConfName, `config`);
    }

    getAllAppBinConf() {
        const appConfName = this.getAppName();
        const appDir = this.getAppDir();
        if (!appConfName || !appDir) {
            console.error(`Config file by (${appConfName})Bin not found`);
            return {};
        }
        const configFilePath = path.join(appDir, appConfName, `config`, 'bin.js');
        if (!this.isFile(configFilePath)) {
            this.copyBinDefaultConfFile()
        }
        if (this.isFile(configFilePath)) {
            const config = require(configFilePath);
            if (typeof config === 'function') {
                return config();
            } else {
                return config;
            }
        } else {
            console.error(`Config file (${configFilePath}) not found`);
            return {};
        }
    }

    getAppDir() {
        return gdir.getRootDir('apps');
    }

    getEggConfDir(subDir, relation = false) {
        const relationDir = './electron/config'
        let configDir = relation ? relationDir : gdir.getRootDir(relationDir);
        if (subDir) {
            configDir = configDir + `/` + subDir;
        }
        return configDir
    }

    copyDefaultConfFile() {
        const eggConfigFilePath = this.getEggConfDir('config.default.js');
        const appConfigDir = this.getAppConfDir();
        const appConfigFilePath = path.join(appConfigDir, 'config.default.js');

        this.copyFile(eggConfigFilePath, appConfigFilePath)
    }

    copyBinDefaultConfFile() {
        const eggBinConfigFilePath = this.getEggConfDir('bin.js');

        const appConfigDir = this.getAppConfDir();
        const appBinConfigFilePath = path.join(appConfigDir, 'bin.js');

        this.copyFile(eggBinConfigFilePath, appBinConfigFilePath)
    }

    copyFile(source, destination) {
        try {
            const data = fs.readFileSync(source);
            fs.writeFileSync(destination, data);
            console.log(`File copied from ${source} to ${destination}`);
        } catch (error) {
            console.error(`Error copying file from ${source} to ${destination}: ${error.message}`);
        }
    }

    isFile(configFilePath) {
        if (fs.existsSync(configFilePath) && fs.lstatSync(configFilePath).isFile()) {
            return true
        }
        return false
    }

    getAppName() {
        let appConfName = this.getArg(`app`)
        if (!appConfName) {
            appConfName = env.getEnv('DEFAULT_APP');
        }
        if (!appConfName) {
            const systemParams = this.getArg(`appname`);
            appConfName = systemParams.name;
        }
        if (!appConfName) {
            console.error('Please provide the "appname" parameter in system arguments (e.g., appname= xxxx )');
        }
        return appConfName;
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
                } else if (arg.includes(`${name}=`)) {
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


    getValue(name, defaultConfigFile = null) {
        if (this.config.hasOwnProperty(name)) {
            return this.config[name];
        } else if (defaultConfigFile) {
            const defaultConfig = this.load(defaultConfigFile);
            return defaultConfig[name] || null;
        } else {
            return null;
        }
    }

    setValue(name, value, defaultConfigFile = null) {
        if (defaultConfigFile) {
            const config = this.load(defaultConfigFile);
            config[name] = value;
            this.save(defaultConfigFile);
        } else {
            this.config[name] = value;
            this.save();
        }
    }

    load(file) {
        if (!file) file = this.JSONCONFFile;
        if (!fs.existsSync(file)) {
            console.log('Configuration file does not exist, creating a new file.');
            this.createConfigFile(file);
        }
        try {
            const data = fs.readFileSync(file, 'utf-8');
            const jsonConf = JSON.parse(data);
            console.log('Configuration:', file);
            return jsonConf;
        } catch (error) {
            console.error('Unable to read configuration file:', error.message);
            return {};
        }
    }

    deleteConfig(key) {
        if (this.config.hasOwnProperty(key)) {
            delete this.config[key];
            this.save();
            console.log('Config item deleted:', key);
        } else {
            console.log('Config item does not exist:', key);
        }
    }


    setInitConfig(file) {
        if (!file) file = this.JSONCONFFile;
        const defaultConfigFile = this.load(file)
        return defaultConfigFile
    }

    getUserDataDir() {
        return ;
    }

    createTempConfigFile() {
        const timestamp = new Date().getTime();
        const randomStr = this.generateRandomString(8);
        const tempConfigFileName = `${this.prefix}${timestamp}_${randomStr}.json`;
        // 使用os.tmpdir()获取临时目录路径
        const tempConfigFilePath = path.join(os.tmpdir(), tempConfigFileName);
        if (fs.existsSync(tempConfigFilePath)) {
            return tempConfigFilePath;
        }
        try {
            fs.writeFileSync(tempConfigFilePath, '{}', 'utf-8');
            console.log('Temporary config file created:', tempConfigFilePath);
            return tempConfigFilePath;
        } catch (error) {
            console.error('Unable to create temporary config file:', error.message);
            return null;
        }
    }

    clearExpiredTempConfigFiles() {
        try {
            const files = fs.readdirSync(this.userDataDir);
            const tempConfigFiles = files.filter(file => file.startsWith(this.prefix));
            const currentTime = new Date().getTime();
            tempConfigFiles.forEach(file => {
                const filePath = path.join(this.userDataDir, file);
                const fileStats = fs.statSync(filePath);
                const fileCreationTime = fileStats.birthtime.getTime();
                const expirationTime = 60 * 60 * 1000;
                if (currentTime - fileCreationTime > expirationTime) {
                    fs.unlinkSync(filePath);
                    console.log('Expired temporary config file deleted:', filePath);
                }
            });

        } catch (error) {
            console.error('Error occurred while clearing expired temporary config files:', error.message);
        }
    }

    generateRandomString(length) {
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
    }

    createConfigFile() {
        if (fs.existsSync(this.JSONCONFFile)) {
            return this.JSONCONFFile;
        }
        try {
            fs.writeFileSync(this.JSONCONFFile, '{}', 'utf-8');
            console.log('Config file created:', this.JSONCONFFile);
            return this.JSONCONFFile;
        } catch (error) {
            console.error(`Unable to create config file: ${this.JSONCONFFile}`, error.message);
            return null;
        }
    }

    setConfig(key, value) {
        this.config[key] = value;
        this.save();
    }

    getConfig(key) {
        return this.config[key];
    }

    //#TODO 添加一个方法，hasAndAdd，根据一个KEY和VAL判断是否存在，如果不存在则添加
    hasAndAdd(key, value) {
        if (!this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            this.save(); // 确保调用了保存方法，这里假设save方法已存在并能正确保存配置
        }
    }
    //#TODO 添加一个方法，hasConfig，
    hasConfig(key) {
        return this.config.hasOwnProperty(key);
    }
    setJSONCONFFile(fileName) {
        this.JSONCONFFile = path.join(this.userDataDir, `${fileName}.json`);
    }

    ensureUserTempDirExists() {
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir);
        }
    }

    getValueByHierarchy(keys, defaultValue = null) {
        let current = this.config;
        try {
            for (const key of keys) {
                if (current.hasOwnProperty(key)) {
                    current = current[key];
                } else {
                    throw new Error(`Key ${key} not found in hierarchy`);
                }
            }
            return current;
        } catch (error) {
            console.error(`Error while getting value by hierarchy: ${error.message}`);
            return defaultValue;
        }
    }


    getConfigObject() {
        return { config: this.config };
    }

    save(file) {
        const data = JSON.stringify(this.config, null, 2);
        if (!file) file = this.JSONCONFFile;
        const baseDir = path.dirname(file);
        if (!fs.existsSync(baseDir)) {
            console.log('Base directory does not exist, creating recursively:', baseDir);
            fs.mkdirSync(baseDir, { recursive: true });
        }
        try {
            fs.writeFileSync(file, data, 'utf-8');
            console.log('Configuration file saved successfully:', file);
        } catch (error) {
            console.error('Unable to save configuration file:', error.message);
        }
    }

    getConfigType(key) {
        const getConfig = (current, keys) => {
            if (keys.length === 0) {
                return current;
            }
            const nextKey = keys.shift();
            if (current.hasOwnProperty(nextKey)) {
                return getConfig(current[nextKey], keys);
            }
            return null;
        };
        return {
            config: getConfig(this.config, key.slice()),
            get: (subKey) => getConfig(this.config, subKey.slice()),
            set: (subKey, value) => this.setValueByHierarchy(subKey, value),
        };
    }

    fillConfig(config) {
        const fill = (current, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (!current.hasOwnProperty(key) || typeof source[key] !== 'object') {
                        current[key] = source[key];
                    } else {
                        fill(current[key], source[key]);
                    }
                }
            }
        };
        fill(this.config, config);
        this.save();
    }

    replaceConfig(config) {
        const traverse = (current, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] !== 'object' || source[key] === null) {
                        if (!current.hasOwnProperty(key)) {
                            current[key] = source[key];
                        } else {
                            current[key] = source[key];
                        }
                    } else {
                        if (!current.hasOwnProperty(key)) {
                            current[key] = {};
                        }
                        traverse(current[key], source[key]);
                    }
                }
            }
        };
        traverse(this.config, config);
        this.save();
    }

    setValueByHierarchy(keys, value) {
        let current = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current.hasOwnProperty(key)) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        this.save();
    }
}

Conf.toString = () => '[class Conf]';
module.exports = new Conf();
