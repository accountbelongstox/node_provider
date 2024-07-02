'use strict';
const path = require('path');
const Util = require('../utils');
const UserAgent = require('user-agents');

class Options {
    baseDir = path.join(__dirname, '..')
    setBaseDirToken = null
    defaultOptions = {
        devtools: false,
        mobile: false,
        disableGpu: true,
        proxy: null,
        random_user_agent: true,
        headless: false,
        waitForComplete: true,
        timeout: 50000,
        logging: false,
        // userAgent:,
        mute: true,
        showImages: false,
        showStyle: true,
        // width: ,
        // height: ,
        urlStrict: false,
        // deviceScaleFactor:,
        // stealth_js:,
        // executablePath: 
    }

    setBaseDir(baseDir) {
        this.baseDir = baseDir
        this.setBaseDir = true
    }

    getBaseDir(file) {
        if (file) file = path.join(this.baseDir, file)
        return file
    }

    getLibrary(file) {
        if (this.setBaseDirToken) {
            const exefile = this.findChromeExecutable(this.baseDir);
            if (exefile) return exefile;
        }
        let libraryDir = this.getBaseDir(`library`)
        if (file) file = path.join(libraryDir, file)
        return file
    }

    findChromeExecutable(dir) {
        const executableName = 'chrome.exe';
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                const subDirResult = this.findChromeExecutable(filePath);
                if (subDirResult) {
                    return subDirResult;
                }
            } else if (file === executableName) {
                return path.join(dir, executableName); // 返回绝对路径
            }
        }
        return null;
    }

    getBaseSubDir(subdir) {
        return path.join(this.baseDir, subdir);
    }

    initConfig() {
        this.defaultOptions.userAgent = this.defaultOptions.mobile ? this.getMobileUserAgent() : this.getPCUserAgent()
        this.defaultOptions.stealth_js = this.getLibrary('libs/stealth.min.js')
        this.defaultOptions.executablePath = this.getLibrary('chrome/chrome.exe')
        this.defaultOptions.width = this.defaultOptions.mobile ? 320 : 1920
        this.defaultOptions.height = this.defaultOptions.mobile ? 568 : 1080
        // this.defaultOptions.deviceScaleFactor = this.defaultOptions.mobile ? 2 : 1
        //https://peter.sh/experiments/chromium-command-line-switches/
        return this.defaultOptions
    }

    async iniOptions(config, type = 'selenium', chromeOptions) {
        if (type == 'puppeteer') {
            return this.iniOptionsPuppeteer(config)
        } else if (type == 'selenium') {
            return await this.iniOptionsSelenium(chromeOptions, config)
        }
    }

    buildChromeArgs(config) {
        const {
            disableGpu,
            proxy,
            mute,
            width,
            height,
            headless
        } = config;

        const args = [
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--ignore-ssl-errors',
            '--disable-infobars',
            '--no-sandbox',
            `--window-size=${width},${height}`,
            // '--incognito',
            '--lang=zh-CN',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--user-data-dir',
            '--trusted-download-sources',
            '--disable-features=site-per-process',
            '--disable-setuid-sandbox',
        ];

        if (disableGpu) {
            args.push('--disable-gpu');
            args.push('--blink-settings=imagesEnabled=false');
        }

        if (proxy) args.push(`--proxy-server=${proxy}`);
        if (mute) args.push('--mute-audio');
        if (headless) args.push('--disable-gpu');

        return args;
    }

    async iniOptionsSelenium(chromeOptions, config) {
        chromeOptions.ignoreHTTPSErrors = true;
        chromeOptions.excludeSwitches = ['enable-automation', 'enable-logging'];
        chromeOptions.experimental.detach = true;

        const defaultDownloadPath = Util.file.getDefaultDownloadPath();
        await Util.file.mkdir(downDir);

        chromeOptions.experimental.prefs = {
            'profile.default_content_settings.popups': 0,
            'download.default_directory': defaultDownloadPath,
            'profile.default_content_setting_values.automatic_downloads': 1
        };

        chromeOptions.args.push(...this.buildChromeArgs(config));

        return chromeOptions;
    }

    iniOptionsPuppeteer(config) {
        const args = this.buildChromeArgs(config);
        if (config.devtools) args.push('--auto-open-devtools-for-tabs');
        return args;
    }

    getPCUserAgent() {
        if (this.defaultOptions.random_user_agent) {
            const userAgent = new UserAgent({ deviceCategory: 'desktop'/*platform: 'Win32'*/ });
            const randomUserAgent = userAgent.random();
            // console.log(`randomUserAgent`)
            // console.log(randomUserAgent)
            const randomUserString = randomUserAgent.toString();
            return randomUserString
        } else {
            return "Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 5 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19"
        }
    }

    getMobileUserAgent() {
        if (this.defaultOptions.random_user_agent) {
            const userAgent = new UserAgent({ deviceCategory: 'mobile' });
            const randomUserAgent = userAgent.random();
            // console.log(`randomUserAgent`)
            // console.log(randomUserAgent)
            const randomUserString = randomUserAgent.toString();
            return randomUserString
        } else {
            return `'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1'`
        }
    }
}


Options.toString = () => '[class Options]';
module.exports = new Options();

