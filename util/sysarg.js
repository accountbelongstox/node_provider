class SysArg {
    constructor() {
        this.pythonVersion = process.version;
        this.platform = process.platform;
        this.commandLineArgs = process.argv;
    }

    getPythonVersion() {
        return this.pythonVersion;
    }

    getPlatform() {
        return this.platform;
    }
    
    getArg(name,info=false) {
        if (typeof name === 'number') {
            name = name + 1;
            if (process.argv.length > name) {
                return process.argv[name];
            } else {
                return null;
            }
        }
        if(info)console.log(`getArg`)
        if(info)console.log(process.argv)
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

    isArg(name) {
        return this.getArg(name) !== null;
    }

    getArgs() {
        return this.commandLineArgs;
    }
}


SysArg.toString = () => '[class SysArg]';
module.exports = new SysArg();
