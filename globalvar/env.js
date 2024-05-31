const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const Base = require('../base/base');

class Env extends Base {
    static annotationSymbol = '#';
    envContent = null
    initEnv = false;

    constructor(rootDir = null, envName = '.env', delimiter = '=') {
        super();
        this.rootDir = rootDir || this.getCwd();
        this.envName = envName;
        this.delimiter = delimiter;
    }

    _init() {
        if (!this.initEnv) {
            this.initEnv = true;
            this.localEnvFile = this._getLocalEnvFile();
            this.exampleEnvFile = this._getExampleEnvFile();
            this.mergeEnv(this.localEnvFile, this.exampleEnvFile);
        }
    }

    _getLocalEnvFile() {
        const localEnvFile = path.join(this.rootDir, this.envName);
        return localEnvFile;
    }

    _getExampleEnvFile() {
        const exampleFiles = [
            path.join(this.rootDir, `${this.envName}_example`),
            path.join(this.rootDir, `${this.envName}-example`),
            path.join(this.rootDir, `${this.envName}.example`),
        ];
        for (const exampleFile of exampleFiles) {
            if (fs.existsSync(exampleFile)) {
                return exampleFile;
            }
        }
        return null;
    }

    //loadDir
    load(rootDir, envName = '.env', delimiter = '=') {
        return new Env(rootDir, envName, delimiter);
    }

    loadFile(envFilePath, delimiter = '=') {
        const rootDir = path.dirname(envFilePath);
        const envName = path.basename(envFilePath);
        return new Env(rootDir, envName, delimiter);
    }

    mergeEnv(envFile, exampleEnvFile) {
        if (!exampleEnvFile) {
            return;
        }
        const exampleArr = this.readEnv(exampleEnvFile);
        const localArr = this.readEnv(envFile);
        const exampleDict = Env.arrToDict(exampleArr);
        const localDict = Env.arrToDict(localArr);
        const addedKeys = Object.keys(exampleDict).filter(key => !localDict.hasOwnProperty(key));
        addedKeys.forEach(key => localDict[key] = exampleDict[key]);
        if (addedKeys.length > 0) {
            console.log(`Env-Update env: ${envFile}`);
            const updatedArr = Env.dictToArr(localDict);
            this.saveEnv(updatedArr, envFile);
            addedKeys.forEach(key => console.log(`Env-Added key: ${key}`));
        }
    }

    readKey(key) {
        this._init();
        const content = fs.readFileSync(this.localEnvFile, 'utf8');
        for (const line of content.split('\n')) {
            const [k, v] = line.trim().split(this.delimiter, 2);
            if (k.trim() === key) {
                return v.trim();
            }
        }
        return null;
    }

    replaceOrAddKey(key, val) {
        const lines = [];
        const content = fs.readFileSync(this.localEnvFile, 'utf8');
        for (const line of content.split('\n')) {
            const [k, v] = line.trim().split(this.delimiter, 2);
            if (k.trim() === key) {
                lines.push(`${key}${this.delimiter}${val}`);
            } else {
                lines.push(line.trim());
            }
        }
        if (!lines.some(line => line.startsWith(`${key}${this.delimiter}`))) {
            lines.push(`${key}${this.delimiter}${val}`);
        }
        const updatedContent = lines.join('\n') + '\n';
        fs.writeFileSync(this.localEnvFile, updatedContent);
    }

    readEnv(filePath) {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        return content.split('\n').map(line => line.trim().split(this.delimiter, 2));
    }

    getEnvs(filePath = null) {
        return this.readEnv(filePath || this.localEnvFile);
    }

    saveEnv(envArr, filePath) {
        const content = envArr.map(([k, v]) => `${k}${this.delimiter}${v}`).join('\n') + '\n';
        fs.writeFileSync(filePath, content);
    }

    setEnv(key, value, filePath = null) {
        this._init();
        filePath = filePath || this.localEnvFile;
        const envArr = this.readEnv(filePath);
        const updatedArr = envArr.map(([k, v]) => (k === key ? [k, value] : [k, v]));
        if (!updatedArr.some(([k]) => k === key)) {
            updatedArr.push([key, value]);
        }
        this.saveEnv(updatedArr, filePath);
    }

    isEnv(key, filePath = null) {
        this._init();
        const val = this.getEnv(key, filePath);
        const result = Boolean(val);
        if (process.argv.includes('is_env')) {
            console.log(result ? 'True' : 'False');
        }
        return result;
    }

    getEnv(key, default_val=``, filePath = null) {
        this._init();
        filePath = filePath || this.localEnvFile;
        const envArr = this.readEnv(filePath);
        for (const [k, v] of envArr) {
            if (k === key) {
                return v;
            }
        }
        return default_val;
    }

    static arrToDict(array) {
        return Object.fromEntries(array);
    }

    static dictToArr(dictionary) {
        return Object.entries(dictionary);
    }
}

Env.toString = () => '[class Env]';
module.exports = new Env();