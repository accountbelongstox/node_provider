const path = require('path');
const fs = require('fs');
const electron = require('electron');
const util = require('util');
const winShortcut = require('windows-shortcuts');
const { atob } = require('atob');
const { file, strtool, httptool, tool } = require('../utils.js');
const { gdir, env } = require('../globalvars.js');
let pngImgToIco;
const config = {}
const ShortcutQureyAsync = util.promisify(winShortcut.query);
const ShortcutEditAsync = util.promisify(winShortcut.edit);
const ShortcutCreateAsync = util.promisify(winShortcut.create);
const { nativeImage, app, screen } = electron;

class Main {
    iconParseLnkCache = {};
    iconTmpDir = gdir.getLocalDir()
    converToError = []
    converToErrorImgs = []

    constructor() {
    }

    async parseLnkFile(lnkFilePath) {
        if (!file.isAbsolute(lnkFilePath)) {
            lnkFilePath = gdir.getDesktopFile(lnkFilePath)
        }

        const basename = path.basename(lnkFilePath);
        if (this.iconParseLnkCache[basename]) {
            return this.iconParseLnkCache[basename];
        }

        try {
            const shortcutData = await ShortcutQureyAsync(lnkFilePath);
            shortcutData.linkPath = lnkFilePath;
            this.iconParseLnkCache[basename] = shortcutData;
            return shortcutData;
        } catch (error) {
            console.error(`Error reading shortcut ${lnkFilePath}:`, error);
            return null;
        }
    }

    getPrimaryDisplay() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        return { width, height }
    }

    getIconWidth() {
        let icon_width = 50;
        try {
            const { width, height } = this.getPrimaryDisplay();
            if (width <= 1920) {
                icon_width = 30
            } else if (width <= 1920) {
                icon_width = 30
            }
        } catch (e) {
            console.log(e)
        }
        return icon_width

    }

    async generateIconShortcut(icons) {
        const iconCacheDirectory = `iconCacheDirectory`
        let create_icons = 0
        let icon_dir = gdir.getLocalDir(iconCacheDirectory)
        for (let icon_dirname in icons) {
            let icon_type = icons[icon_dirname]
            if (Object.keys(icon_type).length > 0) {
                let full_icondir = path.join(icon_dir, icon_dirname);
                file.mkdirPromise(full_icondir)
                    .then(() => {
                        for (let icon_name in icon_type) {
                            let icon_option = icon_type[icon_name]
                            let shortcut_path = path.join(full_icondir, icon_name)
                            if (path.extname(shortcut_path) != ".lnk") {
                                shortcut_path = shortcut_path + ".lnk"
                            }
                            file.isFileAsync(shortcut_path, (isFile) => {
                                if (!isFile) {
                                    let iconPath = icon_option[`iconPath`]
                                    if (!file.isFile(iconPath)) {

                                        iconPath = icon_option[`iconImgPath`]
                                    }
                                    let shortcutOption = {
                                        path: icon_option[`path`],
                                        target: icon_option[`target`],
                                        icon: iconPath
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

    addIconToCacheJSON(jsonData, resultIcons) {
        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            const softwareList = item['softwareList'];
            for (let i = 0; i < softwareList.length; i++) {
                const softwareItem = softwareList[i];
                const basename = softwareItem.basename;
                if (resultIcons[basename] && resultIcons[basename].iconBase64) {
                    jsonData[index].softwareList[i].iconBase64 = resultIcons[basename].iconBase64
                } else {
                    jsonData[index].softwareList[i].iconBase64 = ''
                }
            }
        }
        return jsonData
    }

    createIdByIconsJSON(jsonData) {
        let borders = [`border-primary`,
            `border-info`,
            `border-success`,
            `border-danger`,
            `border-warning`]
        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            const softwareList = item['softwareList'];
            const groupname = item.groupname;
            const gid = this.genGid(groupname);
            jsonData[index].border = tool.getRandomItem(borders)
            jsonData[index].gid = gid
            jsonData[index].icon_width = this.getIconWidth()
            for (let i = 0; i < softwareList.length; i++) {
                const softwareItem = softwareList[i];
                const basename = softwareItem.basename;
                if (!jsonData[index].softwareList[i].aid) {
                    jsonData[index].softwareList[i].aid = this.genAid(basename)
                    jsonData[index].softwareList[i].gid = gid;
                    jsonData[index].softwareList[i].img_id = this.genImgId(basename)
                }
            }
        }
        return jsonData
    }

    updateIconToHTML(groupname, softConf, iconBase64) {
        softConf.iconBase64 = iconBase64
        let gid = strtool.get_id(groupname, `g`)
        let basename = softConf.basename
        let updateConf = {
            groupname,
            softConf,
            icon_width: this.getIconWidth(),
            gid,
            img_id: this.genImgId(basename)
        }
        console.log(`index:updateIconToHtml`)
        httptool.sendToWebSocket(`index:updateIconToHtml`, updateConf)
    }


    genAid(basename) {
        return strtool.get_id(basename, `a`)
    }

    genGid(groupname) {
        return strtool.get_id(groupname, `g`)
    }

    genImgId(basename) {
        let aid = this.genAid(basename)
        return `img${aid}`
    }

    getDefaultImageBase64Icon() {
        if (this.defaultImageBase64IconTemp) {
            return this.defaultImageBase64IconTemp
        }
        let icon = file.get_stylesheet(`img/default_app.png`)
        this.defaultImageBase64IconTemp = file.readBase64ByFile(icon)
        return this.defaultImageBase64IconTemp
    }

    getDefaultImageFile() {
        let icon = file.get_stylesheet(`img/default_app.png`)
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
        if (file.isImageFile(filePath)) {
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
        let config_dir = gdir.getLocalDir(this.getRemoteShortcutsIconFile());
        return config_dir
    }

    getShortcutsIconFile() {
        let config_dir = this.getShortcutsIconFName();
        file.mkbasedir(config_dir)
        return config_dir
    }

    readShortcutsIconJSONByLocal() {
        let jsonFile = this.getShortcutsIconFile()
        return file.readJSON(jsonFile)
    }

    getSoftCacheFile() {
        let IconFile = gdir.getLocalFile('soft_group_v2.json');
        return IconFile
    }
    getIconCacheFile() {
        let IconFile = gdir.getLocalFile('soft_icons.json');
        return IconFile
    }
    saveLocalSoftlistJSON(iconsJson) {
        let IconFile = this.getSoftCacheFile();
        file.saveJSON(IconFile, iconsJson)
    }
    readLocalSoftlistJSON() {
        let IconFile = this.getSoftCacheFile();
        if (!file.isFile(IconFile)) {
            return null
        }
        let iconsJson = file.readJSON(IconFile)
        return iconsJson
    }
    saveLocalIconJSON(iconsJson) {
        let IconFile = this.getIconCacheFile();
        file.saveJSON(IconFile, iconsJson)
    }
    readLocalIconJSON() {
        let IconFile = this.getIconCacheFile();
        if (!file.isFile(IconFile)) {
            return null
        }
        let iconsJson = file.readJSON(IconFile)
        return iconsJson
    }
    getLocalIconJSONModified() {
        let IconFile = this.getSoftCacheFile();
        const modificationTime = file.getModificationTime(IconFile);
        return modificationTime
    }
    mergeIconJson(jsonData, newJsonData) {
        const groupnameOld = this.getGroupNames(jsonData);
        for (let index = 0; index < newJsonData.length; index++) {
            const item = newJsonData[index];
            const softwareList = item['softwareList'];
            const groupname = item['groupname'];
            const hasGroupName = this.hasGroupName(groupname, groupnameOld)
            if (!hasGroupName) {
                jsonData.push(item)
            } else {
                const softs = this.getSoftNamesByGroup(groupname, jsonData)
                for (let i = 0; i < softwareList.length; i++) {
                    const softwareItem = softwareList[i];
                    const basename = softwareItem.basename;
                    if (!this.hasSoftByGroup(basename, softs)) {
                        jsonData[index].softwareList.push(softwareItem)
                    }
                }
            }
        }
        return jsonData
    }
    hasGroupName(groupname, groupnames, jsonData) {
        if (!groupnames) groupnames = this.getGroupNames(jsonData)
        if (groupnames.includes(groupname)) {
            return true
        }
        return false
    }
    getGroupNames(jsonData) {
        let groupnames = []
        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            const groupname = item['groupname'];
            groupnames.push(groupname)
        }
        return groupnames
    }
    hasSoftByGroup(basename, softs, groupname, jsonData) {
        if (!softs) softs = this.getSoftNamesByGroup(groupname, jsonData)
        if (softs.includes(basename)) {
            return true
        }
        return false
    }
    getSoftNamesByGroup(groupname, jsonData) {
        let softs = []
        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            if (groupname == item['groupname']) {
                const softwareList = item['softwareList'];
                for (let i = 0; i < softwareList.length; i++) {
                    const softwareItem = softwareList[i];
                    const basename = softwareItem.basename;
                    softs.push(basename)
                }
            }
        }
        return softs
    }
    isLocalIconJSONModifiedWithoutHour() {
        const modificationTime = this.getLocalIconJSONModified();
        if (modificationTime === 0) {
            return false;
        }
        const currentTime = Date.now();
        const hourInMilliseconds = 3600000;
        const elapsedTime = currentTime - modificationTime;
        return elapsedTime >= hourInMilliseconds;
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
    async updateShortcut(group, basename, target, icon, base64image) {
        let icon_dir = path.join(this.iconTmpDir, group);
        let icon_basename
        if (path.extname(basename) != '.lnk') {
            icon_basename = basename + '.lnk'
        } else {
            icon_basename = basename
        }
        let icon_path = path.join(icon_dir, icon_basename);
        target = file.replaceDir(target, config.setting_soft, 2)
        // let workingDir = path.dirname(target)
        if (!icon) icon = target
        let icon_option = {
            target,
            // workingDir,
            // arg,
            icon: icon_path
        }
        if (file.existsSync(icon_path)) {
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
                let target_include = file.matchPathStartwith(target, paths)
                let icon_include = file.matchPathStartwith(icon, paths)
                let workingDir_include = file.matchPathStartwith(workingDir, paths)
                if (target_include) {
                    target = file.pathReplace(target, target_include, newPath)
                }
                if (icon_include) {
                    icon = file.pathReplace(icon, icon_include, newPath)
                }
                if (workingDir_include) {
                    workingDir = file.pathReplace(workingDir, workingDir_include, newPath)
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

    base64ToICO(base64String, outputFilePath) {
        const binaryData = atob(base64String);
        file.mkbasedir(outputFilePath)
        fs.writeFileSync(outputFilePath, binaryData, 'binary');
    }

    async pngImToIco(pngFilePath, outputIcoFilePath, deletePng = false) {
        if (!pngImgToIco) {
            pngImgToIco = require('png-to-ico');
        }
        const baseImgPath = path.basename(pngFilePath)
        if (this.converToErrorImgs.includes(baseImgPath)) {
            return
        }
        pngImgToIco(pngFilePath)
            .then(buf => {
                fs.writeFileSync(outputIcoFilePath, buf);
                if (deletePng) {
                    file.delete(pngFilePath)
                }
            })
            .catch((error) => {
                this.converToErrorImgs.push(baseImgPath)
                this.converToError.push(baseImgPath)
                if (this.converToError.length > 100) {
                    console.error('Error while converting PNGs to ICO:');
                    console.log(this.converToError);
                    this.converToError = []
                }
            });
    }

    base64ToPng(base64String, outputFilePath) {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(outputFilePath, binaryData);
    }

    createIconFile(jsonData) {
        let iconsCacheDir = gdir.getLocalDir(`iconsCache`)
        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            const softwareList = item['softwareList'];
            for (let i = 0; i < softwareList.length; i++) {
                const softwareItem = softwareList[i];
                const basename = softwareItem.basename;
                const iconBase64 = softwareItem.iconBase64;
                const iconImgPath = softwareItem.iconImgPath;

                let imgname_by_png = file.replaceExtension(basename, `png`)
                let imgname_by_ico = file.replaceExtension(basename, `ico`)
                const pngPath = path.join(iconsCacheDir, imgname_by_png)
                const iconPath = path.join(iconsCacheDir, imgname_by_ico)

                if (iconBase64) {
                    if (!file.isFile(iconPath)) {
                        this.base64ToPng(iconBase64, pngPath)
                        this.pngImToIco(pngPath, iconPath, true)
                    }
                }
                if (!iconImgPath) {
                    jsonData[index].softwareList[i].iconImgPath = iconPath
                }
            }
        }
        return jsonData
    }

    checkIconFileIsExists(jsonData) {
        const appDir = (env.getEnv('DESKTOP_APP_DIR') || file.readFile(gdir.getLocalInfoFile('appdir_info.ini'))).trim()

        for (let index = 0; index < jsonData.length; index++) {
            const item = jsonData[index];
            const softwareList = item['softwareList'];
            for (let i = 0; i < softwareList.length; i++) {
                const softwareItem = softwareList[i];


                let iconPath = softwareItem.iconPath;
                let target = softwareItem.target;
                let exe_path = softwareItem.path;
                jsonData[index].softwareList[i].appDir = appDir
                jsonData[index].softwareList[i].icon_width = this.getIconWidth()
                
                if (appDir) {
                    if (!file.isAbsolute(iconPath)) {
                        iconPath = path.join(appDir, iconPath)
                        jsonData[index].softwareList[i].iconPath = iconPath
                    }
                    if (!file.isAbsolute(exe_path)) {
                        exe_path = path.join(appDir, exe_path)
                        jsonData[index].softwareList[i].path = exe_path
                    }
                    if (!file.isAbsolute(target)) {
                        target = path.join(appDir, target)
                        jsonData[index].softwareList[i].target = target
                    }
                }
                if(target){
                    jsonData[index].softwareList[i].mainDir = file.getLevelPath(target,2)
                }
                if (file.isAbsolute(jsonData[index].softwareList[i].target)) {
                    jsonData[index].softwareList[i].isExist = file.isFile(jsonData[index].softwareList[i].target)
                }
                // let is_local = softwareItem.is_local
                // if (is_local) {
                //     gdir.getLocalDir()
                //     let dir = path.join(this.iconTmpDir, gname)
                //     let linkdir = path.join(dir, basename)
                //     if (!file.isFile(linkdir)) {
                //         delete jsonData[index].softwareList[i][basename]
                //     }
                // }

            }
        }

        return jsonData
    }


}


module.exports = new Main()