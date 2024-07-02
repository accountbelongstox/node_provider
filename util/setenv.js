const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
//#TODO 4 修改 本类，将c#的PathManager.cs（在项目目录下的csharp/ddwin/ddwin/coreTools/PathManager.cs）全部移置过来，类名改为winpath

class winpath {
    constructor() {
        this.regType = os.platform() === 'win32' ? 'REG_SZ' : ''; // Windows注册表类型
        this.supportedCommands = ['add', 'remove', 'is', 'show'];
    }

    queryEnvironmentVariable() {
        if (os.platform() !== 'win32') {
            throw new Error('This function is designed for Windows only.');
        }
        try {
            const command = 'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path';
            const result = execSync(command).toString();
            const pathValue = result.split(/\s+/).slice(-1)[0].trim();
            return pathValue || '';
        } catch (error) {
            throw new Error(`Error querying environment variable: ${error.message}`);
        }
    }

    getCurrentPath() {
        const result = this.queryEnvironmentVariable();
        const regType = this.getPathType(result);
        const pathsMatch = result.split(regType)[1].trim();
        const cleanedPaths = pathsMatch.split(';').map(p => p.trim()).filter(Boolean);
        return cleanedPaths;
    }

    getPathType(result = "") {
        if (!result) result = this.queryEnvironmentVariable();
        const parts = result.split(/\s+/);
        return parts.find(part => part.startsWith('REG_')) || 'REG_SZ';
    }

    backupEnvPath(currentPath) {
        const backupDir = path.join(os.tmpdir(), '$SetPath_bak_');
        fs.mkdirSync(backupDir, { recursive: true });

        // Cleanup old backups if more than 30 exist
        const backupFiles = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('$SetPath_bak_') && f.endsWith('.bak'))
            .sort((a, b) => fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs);

        if (backupFiles.length > 30) {
            backupFiles.slice(0, backupFiles.length - 30).forEach(file => {
                fs.unlinkSync(path.join(backupDir, file));
            });
        }

        const currentTime = new Date().toISOString().replace(/:/g, '');
        const backupFilePath = path.join(backupDir, `$SetPath_bak_${currentTime}.bak`);
        fs.writeFileSync(backupFilePath, currentPath.join(';'));

        console.log(`Backup file saved to: ${backupFilePath}`);
        if (backupFiles.length > 30) {
            console.log(`Cleaned up ${backupFiles.length - 30} outdated backup files.`);
        }
    }

    addPath(newPath) {
        newPath = path.resolve(newPath);
        const currentPath = this.getCurrentPath();
        if (!currentPath.includes(newPath)) {
            const updatedPath = [...currentPath, newPath];
            this.backupEnvPath(updatedPath);
            this.updatePathRegistry(updatedPath);
        } else {
            console.log(`The path '${newPath}' already exists in the environment.`);
        }
    }

    updatePathRegistry(updatedPath) {
        const regType = this.getPathType();
        const addPath = updatedPath.join(';');
        const command = `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path /t ${regType} /d "${addPath}" /f`;
        execSync(command);
        console.log('Path updated successfully.');
    }

    removePath(pathToRemove) {
        pathToRemove = path.resolve(pathToRemove);
        const currentPath = this.getCurrentPath();
        if (currentPath.includes(pathToRemove)) {
            const updatedPath = currentPath.filter(p => p !== pathToRemove);
            this.backupEnvPath(updatedPath);
            this.updatePathRegistry(updatedPath);
        } else {
            console.log(`The path '${pathToRemove}' does not exist in the environment.`);
        }
    }

    isPath(pathToCheck) {
        pathToCheck = path.resolve(pathToCheck);
        return this.getCurrentPath().includes(pathToCheck);
    }

    executeCommand(command, arg) {
        if (!this.supportedCommands.includes(command)) {
            console.error(`Unsupported command. Supported commands are: ${this.supportedCommands.join(', ')}`);
            return;
        }
        switch (command) {
            case 'add':
                this.addPath(arg);
                break;
            case 'remove':
                this.removePath(arg);
                break;
            case 'is':
                console.log(this.isPath(arg));
                break;
            case 'show':
                console.log(this.getCurrentPath());
                break;
            default:
                console.error('Invalid command usage.');
        }
    }
}

module.exports = winpath;