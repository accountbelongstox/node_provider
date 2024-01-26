const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

class Conf {
    constructor(config_name="default",config_sapce="configuration") {
        this.userDataDir = path.join(os.homedir(), 'userData');
        this.confDir = path.join(config_sapce, 'userData');
        this.prefix = 'temp_conf_';
        this.JSONCONFFile = path.join(this.confDir, `${config_name}.json`);
        this.config = this.load()
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
            console.log('Configuration file read successfully:', jsonConf);
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

    setInitConfig(defaultConfig,file){
        if (!file) file = this.JSONCONFFile;
        const defaultConfigFile = this.load(file)
        return defaultConfigFile
    }

    getUserDataDir() {
        return this.userDataDir;
    }

    createTempConfigFile() {
        const timestamp = new Date().getTime();
        const randomStr = this.generateRandomString(8);
        const tempConfigFileName = `${this.prefix}${timestamp}_${randomStr}.json`;
        const tempConfigFilePath = path.join(this.userDataDir, tempConfigFileName);
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
            console.error('Unable to create config file:', error.message);
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

    setJSONCONFFile(fileName) {
        this.JSONCONFFile = path.join(this.userDataDir, `${fileName}.json`);
    }

    ensureUserTempDirExists() {
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir);
        }
    }

    getValueByHierarchy(keys) {
        let current = this.config;
        for (const key of keys) {
            if (current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return null;
            }
        }
        return current;
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
