const path = require('path');
const fs = require('fs');
const electron = require('electron');
const util = require('util');
const readdirPromise = util.promisify(fs.readdir);
const statPromise = util.promisify(fs.stat);
const winShortcut = require('windows-shortcuts');
const {
    app,
} = require('../comlib/component.js');
const { config_base, config } = require('../comlib/config.js');


const utilUnit = require('../unit/utilUnit.js');
const fileUnit = require('../unit/fileUnit.js');
const stringUnit = require('../unit/stringUnit.js');

const httpWidget = require('./httpWidget.js');
// const htmlWidget = require('./htmlWidget.js');
// const stringUnit = require('../unit/stringUnit.js');

const ShortcutQureyAsync = util.promisify(winShortcut.query);
const ShortcutEditAsync = util.promisify(winShortcut.edit);
const ShortcutCreateAsync = util.promisify(winShortcut.create);
const { nativeImage } = electron;

class Main {
    iconCache = {};
    baseIconsConfigKeys = [
        "winget_id",
        "source_internet",
        "source_local",
        "source_winget",
        "installation_method",
    ]
    localIconCache = null

    getShortcutIconList() {
        let shortcutIconList = fileUnit.readDirectory(config_base.icon_dir)
        return shortcutIconList
    }

    getShortcutIconListTotal() {
        let shortcutIconList = this.getShortcutIconList()
        let totalLength = Object.values(shortcutIconList).reduce((acc, val) => acc + val.length, 0);
        return totalLength
    }

    async generateIconShortcut(icons) {
        let create_icons = 0
        let icon_dir = config_base.icon_dir
        for (let icon_dirname in icons) {
            let icon_type = icons[icon_dirname]
            if (Object.keys(icon_type).length > 0) {
                let full_icondir = path.join(icon_dir, icon_dirname);
                fileUnit.mkdirPromise(full_icondir)
                    .then(() => {
                        for (let icon_name in icon_type) {
                            let icon_option = icon_type[icon_name]
                            let shortcut_path = path.join(full_icondir, icon_name)
                            if (path.extname(shortcut_path) != ".lnk") {
                                shortcut_path = shortcut_path + ".lnk"
                            }
                            fileUnit.isFileAsync(shortcut_path, (isFile) => {
                                if (!isFile) {
                                    let shortcutOption = {
                                        path: icon_option[`path`],
                                        target: icon_option[`target`],
                                        icon: icon_option[`iconPath`]
                                    }
                                    create_icons++
                                    try {
                                        winShortcut.create(shortcut_path, shortcutOption)
                                    } catch (e) {
                                        console.log(e)
                                    }
                                }
                            })
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            }
        }
        if (create_icons > 0) {

            messageWidget.success(`Successfully created icon: ${create_icons}.`)
        }
    }

    async scanIconsDir() {
        let icon_dir = config_base.icon_dir
        let iconsDirJSON = {};
        const subDirs = await readdirPromise(icon_dir);
        for (let subdir of subDirs) {
            const fullPath = path.join(icon_dir, subdir);
            const stats = await statPromise(fullPath);
            if (stats.isDirectory()) {
                const files = await readdirPromise(fullPath);
                iconsDirJSON[subdir] = files.filter(f => !f.startsWith('.')).reduce((acc, filename) => {
                    acc[filename] = null;
                    return acc;
                }, {});
            }
        }
        return iconsDirJSON;
    }

    updatePathsInIconCachejson(obj) {
        let includes = [`c`]
        let newPath = config.soft_localpath
        for (let key in obj) {
            if (key === 'path' || key === 'target' || key === 'iconPath') {
                if (key) {
                    let oldPath = obj[key]
                    let drive = fileUnit.getDrive(oldPath)
                    if (!includes.includes(drive) && drive) {
                        obj[key] = fileUnit.replacePathByLevel(oldPath, 2, newPath);
                    }
                }
            }
        }
        return obj;
    }

    mergeIconCache(iconLocal, iconsRemoteJSON) {
        for (const key in iconsRemoteJSON) {
            if (!iconLocal[key]) {
                iconLocal[key] = iconsRemoteJSON[key];
            }
            for (const key2 in iconsRemoteJSON[key]) {
                if (!iconLocal[key][key2]) {
                    iconLocal[key][key2] = iconsRemoteJSON[key][key2]
                }
                for (const key3 in iconsRemoteJSON[key][key2]) {
                    if (!iconLocal[key][key2][key3]) {
                        iconLocal[key][key2][key3] = iconsRemoteJSON[key][key2][key3]
                    }
                }
            }
        }
        iconLocal = this.updatePathsInIconCachejson(iconLocal)
        return iconLocal
    }

    async getNoIconGenerated(localIconCache, iconsDirJSON) {
        let NoIconGenerated = {};
        for (let subdir in iconsDirJSON) {
            if (!localIconCache[subdir]) {
                console.log(localIconCache[subdir])
                NoIconGenerated[subdir] = iconsDirJSON[subdir];
            } else {
                for (let filename in iconsDirJSON[subdir]) {
                    if (!localIconCache[subdir][filename]) {
                        if (!NoIconGenerated[subdir]) {
                            NoIconGenerated[subdir] = {};
                        }
                        console.log(subdir, filename)
                        NoIconGenerated[subdir][filename] = iconsDirJSON[subdir][filename];
                    }
                }
            }
        }
        return NoIconGenerated;
    }

    countSubElement(jsonObj) {
        let count = 0;
        for (let key in jsonObj) {
            let value = jsonObj[key];
            if (typeof value === 'object' && value !== null) {
                for (let subKey in value) {
                    count++;
                }
            }
        }
        return count;
    }

    async iconsDirUpToCacheJSON(localIconCache) {
        if (!localIconCache) localIconCache = this.readIconJSONCacheByLocal()
        const iconsDirJSON = await this.scanIconsDir();
        let updateJSON = await this.getNoIconGenerated(localIconCache, iconsDirJSON)
        if (Object.keys(updateJSON).length) {
            let countSubElement = this.countSubElement(updateJSON)
            let shortcutsIcon = this.readShortcutsIconJSONByLocal()
            for (let gname in updateJSON) {
                let gConf = updateJSON[gname]
                if (!localIconCache[gname]) {
                    localIconCache[gname] = {}
                }
                for (let softname in gConf) {
                    let gDir = path.join(config_base.icon_dir, gname)
                    let lnkPath = path.join(gDir, softname)
                    let basename = path.basename(softname, '.lnk')
                    this.readLinkFile(lnkPath, (result) => {
                        let softConf = {
                            path: result.target,
                            target: result.target,
                            listcount: Object.keys(gConf).length,
                            iconPath: result.expanded.icon,
                            basename,
                            winget_id: "",
                            isExist: fileUnit.isFile(result.target),
                            source_internet: "",
                            source_local: "",
                            source_winget: "",
                            installation_method: "",
                            default_icon: "",
                            default_install_dir: "",
                            install_type: "",
                            is_local: true
                        }
                        localIconCache[gname][softname] = softConf
                        countSubElement--
                        if (countSubElement == 0) {
                            console.log(localIconCache)
                            this.saveIconJSONByLocal(localIconCache)
                        }
                        if (!shortcutsIcon[basename]) {
                            this.readFileAsBase64(softConf.iconPath, (iconBase64) => {
                                this.updateIconToHTML(gname, softConf, iconBase64)
                                shortcutsIcon[basename] = {
                                    basename,
                                    iconBase64
                                }
                                let jsonFile = this.getShortcutsIconFName()
                                fileUnit.saveJSON(jsonFile, shortcutsIcon)
                            })
                        } else {
                            let iconBase64 = shortcutsIcon[basename].iconBase64
                            this.updateIconToHTML(gname, softConf, iconBase64)
                        }
                    })
                }
            }
        }
    }

    convertRightWebPages(localIconCache) {
        let borders = [`border-primary`,
            `border-info`,
            `border-success`,
            `border-danger`,
            `border-warning`]
        for (const groupname in localIconCache) {
            const parent = localIconCache[groupname];
            for (const basename in parent) {
                localIconCache[groupname][basename].aid = this.genAid(basename)
                localIconCache[groupname][basename].gid = this.genGid(groupname);
                localIconCache[groupname][basename].img_id = this.genImagId(basename)
                localIconCache[groupname][basename].groupname = groupname
                localIconCache[groupname][basename].border = utilUnit.getRandomItem(borders)
            }
        }
        return localIconCache
    }

    updateIconToHTML(groupname, softConf, iconBase64) {
        softConf.iconBase64 = iconBase64
        let gid = stringUnit.get_id(groupname, `g`)
        let basename = softConf.basename
        let updateConf = {
            groupname,
            softConf,
            icon_width: config_base.icon_width,
            gid,
            img_id: this.genImagId(basename)
        }
        console.log(`index:updateIconToHtml`)
        httpWidget.sendToWebSocket(`index:updateIconToHtml`, updateConf)
    }


    genAid(basename) {
        return stringUnit.get_id(basename, `a`)
    }

    genGid(groupname) {
        return stringUnit.get_id(groupname, `g`)
    }

    genImagId(basename) {
        let aid = this.genAid(basename)
        return this.genImagIdByAid(aid)
    }

    genImagIdByAid(aid) {
        return `imgid_${aid}`
    }

    /*
    有一个文件夹icons_dir 下面有多个子文件夹，子文件夹内有多个文件
    方法一：
    扫描icons_dir 根据子文件夹组成icons_dirJSON
    {
        subdir:{
            finame1,
            finame2,
        }
    }
    的格式
    有一个JSON名为，localIconCache格式为：
    {
        subdir:{
            finame1：{},
            finame2：{},
        }
    }
    判断localIconCache中没有icons_dirJSON的项，并提取出来，组成NoIconGenerated，格式和上面一样
    方法二：
    并将没有的写入localIconCache，使localIconCache成为合并了icons_dirJSON和localIconCache
    */

    async readIcons() {
        let localIconCache = this.readIconJSONByLocal()
        if (Object.keys(localIconCache).length === 0) {
            localIconCache = await this.MergeRemoteIconFiles()
        }
        localIconCache = this.checkIconFileIsExists(localIconCache)
        this.generateIconShortcut(localIconCache)
        if (!this.seticonsDirUpToCacheJSON) {
            this.seticonsDirUpToCacheJSON = setInterval(() => {
                console.log(`check new icons`)
                this.iconsDirUpToCacheJSON(localIconCache)
            }, 180000)
        }

        localIconCache = this.convertRightWebPages(localIconCache)
        this.localIconCache = localIconCache
        return localIconCache
    }

    async readIconsCache(){
        if(this.localIconCache){
            return this.localIconCache
        }
        return await this.readIcons()
    }

    async MergeRemoteIconFiles() {
        let iconLocal = this.readIconJSONByLocal()
        let remoteConfigFile = `icons_config/${config.remote_soft_icon_conf}`

        let iconShortcuts = `icons_config/${this.getRemoteShortcutsIconFile()}`
        let softJsonUrl = `icons_config/softs.json`

        let remote_update_url = config.setting_soft_remote_update_url
        let iconsRemoteJSON = {}
        let iconsShortcutsJSON = {}
        let softJson = {}
        if (remote_update_url.startsWith('\\\\')) {
            iconsRemoteJSON = fileUnit.openNetworkJSON(remote_update_url, remoteConfigFile)
            iconsShortcutsJSON = fileUnit.openNetworkJSON(remote_update_url, iconShortcuts)
        } else if (remote_update_url.startsWith('http://') || remote_update_url.startsWith('https://')) {
            let remoteConfigFileUrl = httpWidget.joinURL(remote_update_url, remoteConfigFile)
            console.log(`MergeRemoteIconFiles ${remoteConfigFileUrl}`)
            iconsRemoteJSON = await httpWidget.getJSON(remoteConfigFileUrl);
            let remoteIconShortcuts = httpWidget.joinURL(remote_update_url, iconShortcuts)
            console.log(`MergeRemoteIconFiles ${remoteIconShortcuts}`)
            iconsShortcutsJSON = await httpWidget.getJSON(remoteIconShortcuts);
            softJson = await httpWidget.getJSON(httpWidget.joinURL(remote_update_url, softJsonUrl));
        } else if (remote_update_url.startsWith('ftp://')) {
            return iconLocal;
        } else {
            return iconLocal;
        }
        iconLocal = this.mergeIconCache(iconLocal, iconsRemoteJSON)
        this.saveIconJSONByLocal(iconLocal)
        fileUnit.saveJSON(this.getShortcutsIconFile(), iconsShortcutsJSON)
        fileUnit.saveJSON(fileUnit.getTemp(`softs.json`), softJson)
        iconLocal = this.mergeIconShort(iconLocal, iconsShortcutsJSON)
        return iconLocal
    }


    getDefaultImageBase64Icon() {
        if (this.defaultImageBase64IconTemp) {
            return this.defaultImageBase64IconTemp
        }
        let icon = fileUnit.get_stylesheet(`img/default_app.png`)
        this.defaultImageBase64IconTemp = fileUnit.readBase64ByFile(icon)
        return this.defaultImageBase64IconTemp
    }

    getDefaultImageFile() {
        let icon = fileUnit.get_stylesheet(`img/default_app.png`)
        return icon
    }


    async readShortcutAsync(shortcutPath) {
        try {
            const shortcut = await ShortcutQureyAsync(shortcutPath);
            return shortcut;
        } catch (err) {
            console.error(`Failed to read shortcut ${shortcutPath}: ${err.toString()}`);
            return null;
        }
    }

    readIconByFile(file_path) {
        const icon = nativeImage.createFromPath(file_path);
        const base64Image = icon.toDataURL();
        return base64Image
    }

    appReadIconByFile(file_path, callback) {
        app.getFileIcon(file_path, { size: 'normal' }).then((icon) => {
            try {
                let iconBase64 = icon.toDataURL();
                callback(iconBase64)
            } catch (e) {
                callback(this.getDefaultImageBase64Icon())
            }
        }).catch(e => { })

    }

    getIconInBase64(filePath, callback) {
        if (path.extname(filePath) === '.lnk') {
            winShortcut.query(filePath, (err, result) => {
                if (err) {
                    callback(this.getDefaultImageBase64Icon(), 'DEFAULT_VALUE');
                    return;
                }
                const iconPath = result.icon;
                if (!iconPath) {
                    callback(this.getDefaultImageBase64Icon(), 'DEFAULT_VALUE');
                    return;
                }
                this.readFileAsBase64(iconPath, callback);
            });
        } else {
            this.readFileAsBase64(filePath, callback);
        }
    }

    readLinkFile(filePath, callback) {
        try {
            winShortcut.query(filePath, (err, result) => {
                if (err) {
                    console.log(err)
                }
                callback(result, 'DEFAULT_VALUE');
            });
        } catch (e) {
            callback(null, 'DEFAULT_VALUE');
            console.log(e)
        }
    }

    readFileAsBase64(filePath, callback) {
        if (fileUnit.isImageFile(filePath)) {
            let base64Image = this.getDefaultImageBase64Icon()
            // console.log(`readFileAsBase64 By ImageFile: ${filePath}`)
            callback(base64Image)
        } else {
            // console.log(`readFileAsBase64 By File: ${filePath}`)
            appReadIconByFile(filePath, callback)
        }
    }

    async createShortcutAsync(shortcutPath, shortcutOptions) {
        try {
            const shortcut = await ShortcutCreateAsync(shortcutPath, shortcutOptions);
            return shortcut;
        } catch (err) {
            console.error(`Failed to edit shortcut ${shortcutPath}: ${err.message}`);
            return null;
        }
    }

    async editShortcutAsync(shortcutPath, shortcutOptions) {
        try {
            const shortcut = await ShortcutEditAsync(shortcutPath, shortcutOptions);
            return shortcut;
        } catch (err) {
            console.error(`Failed to edit shortcut ${shortcutPath}: ${err.message}`);
            return null;
        }
    }

    getRemoteShortcutsIconFile() {
        return `icons_cache.json`
    }

    getShortcutsIconFName() {
        let config_dir = fileUnit.getTemp(this.getRemoteShortcutsIconFile());
        return config_dir
    }

    getShortcutsIconFile() {
        let config_dir = this.getShortcutsIconFName();
        fileUnit.mkbasedir(config_dir)
        return config_dir
    }

    readShortcutsIconJSONByLocal() {
        let jsonFile = this.getShortcutsIconFile()
        return fileUnit.readJSON(jsonFile)
    }

    getIconFile() {
        let config_dir = fileUnit.getTemp('shortcuts.cache.json');
        fileUnit.mkbasedir(config_dir)
        return config_dir
    }

    readIconJSONCacheByLocal() {
        let jsonFile = this.getIconFile()
        let iconsJson = fileUnit.readJSON(jsonFile)
        return iconsJson
    }

    readIconJSONByLocal() {
        let jsonFile = this.getIconFile()
        let iconsJson = fileUnit.readJSON(jsonFile)
        let shortcutsIcon = this.readShortcutsIconJSONByLocal()
        return this.mergeIconShort(iconsJson, shortcutsIcon)
    }

    isCacheItemIconBase64(iconBase64) {
        if (iconBase64) {
            iconBase64 = iconBase64.trim()
            if (iconBase64 && !iconBase64.endsWith(`;base64,`)) {
                return true
            }
        }
        return false
    }

    mergeIconShort(iconsJson, shortcutsIcon) {
        let base64Img = `iconBase64`
        for (const key in iconsJson) {
            for (const key2 in iconsJson[key]) {
                let basename = iconsJson[key][key2][`basename`]
                if (shortcutsIcon[basename] && this.isCacheItemIconBase64(shortcutsIcon[basename][base64Img])) {
                    iconsJson[key][key2][base64Img] = shortcutsIcon[basename][base64Img]
                } else {
                    iconsJson[key][key2][base64Img] = this.getDefaultImageBase64Icon()
                }
            }
        }
        return iconsJson
    }

    saveIconJSONByLocal(config) {
        fileUnit.saveJSON(this.getIconFile(), config)
    }

    async generateIconJson() {
        const iconJson = await this.getShortcutIcon(config_base.icon_dir);
    }

    async updateShortcut(group, basename, target, icon, base64image) {
        let icon_dir = path.join(config_base.icon_dir, group);
        let icon_basename
        if (path.extname(basename) != '.lnk') {
            icon_basename = basename + '.lnk'
        } else {
            icon_basename = basename
        }
        let icon_path = path.join(icon_dir, icon_basename);
        target = fileUnit.replaceDir(target, config.setting_soft, 2)
        // let workingDir = path.dirname(target)
        if (!icon) icon = target
        let icon_option = {
            target,
            // workingDir,
            // arg,
            icon: icon_path
        }
        if (fileUnit.existsSync(icon_path)) {
            this.editShortcutAsync(icon_path, icon_option)
        } else {
            this.createShortcutAsync(icon_path, icon_option)
        }
        let icon_config = this.readIconJSONByLocal()
        if (!icon_config[group]) {
            icon_config[group] = {}
        }
        if (!icon_config[group][icon_basename]) {
            let softbaseinfo = {
                path: target,
                target: target,
                id: `${group.replace(/\s+/g, ``)}_selector`,
                basename
            }
            if (base64image) {
                softbaseinfo[`iconBase64`] = base64image
            }
            icon_config[group][icon_basename] = softbaseinfo
        } else {
            if (base64image) {
                icon_config[group][icon_basename][`iconBase64`] = base64image
            }
        }
        this.saveIconJSONByLocal(icon_config)
    }

    async updateShortcutPaths(dirPath, newPath, paths) {
        const files = fs.readdirSync(dirPath);
        files.forEach(async (file) => {
            const filePath = path.join(dirPath, file);
            const stats = fs.lstatSync(filePath);
            if (stats.isDirectory()) {
                this.updateShortcutPaths(filePath, newPath, paths);
            } else if (path.extname(file).toLowerCase() === '.lnk') {
                let shortcut = await this.readShortcutAsync(filePath)
                // const relativePath = path.relative(path1, path2);
                let target = shortcut.target
                let icon = shortcut.icon
                if (!icon) {
                    icon = shortcut.target
                }
                let workingDir = path.dirname(target);
                icon = icon.replace(/^"+|"+$/g, '');
                target = target.replace(/^"+|"+$/g, '');
                workingDir = workingDir.replace(/^"+|"+$/g, '');
                let target_include = fileUnit.matchPathStartwith(target, paths)
                let icon_include = fileUnit.matchPathStartwith(icon, paths)
                let workingDir_include = fileUnit.matchPathStartwith(workingDir, paths)
                if (target_include) {
                    target = fileUnit.pathReplace(target, target_include, newPath)
                }
                if (icon_include) {
                    icon = fileUnit.pathReplace(icon, icon_include, newPath)
                }
                if (workingDir_include) {
                    workingDir = fileUnit.pathReplace(workingDir, workingDir_include, newPath)
                }
                let shortcutOptions = {
                    target,
                    workingDir,
                    // fileName,
                    icon,
                }
                await this.editShortcutAsync(filePath, shortcutOptions);
                // lnk(filePath).then((shortcut) => {
                //     console.log(shortcut)
                //     const updatedShortcut = Object.assign(shortcut, {
                //         path: newPath,
                //         icon: newIconPath,
                //     });
                //     console.log(updatedShortcut)
                //     // lnk(filePath, updatedShortcut).catch((err) => {
                //     //     console.error(`Error updating shortcut: ${err}`);
                //     // });
                // }).catch(e => {})
            }
        });
    }

    checkIconFileIsExists(iconConfig) {
        for (let gname in iconConfig) {
            for (let basename in iconConfig[gname]) {
                let isExist = fileUnit.isFile(iconConfig[gname][basename].target);
                iconConfig[gname][basename].isExist = isExist
                let is_local = iconConfig[gname][basename].is_local
                if (is_local) {
                    let gdir = path.join(config_base.icon_dir, gname)
                    let linkdir = path.join(gdir, basename)
                    if (!fileUnit.isFile(linkdir)) {
                        delete iconConfig[gname][basename]
                    }
                }
            }
        }
        return iconConfig
    }
}


module.exports = new Main()