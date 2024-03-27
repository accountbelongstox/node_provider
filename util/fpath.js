const fs = require('fs');
const path = require('path');
const Base = require('../base/base');

class FPath extends Base {
    constructor() {
        super();
    }

    get_base_name(filePath) {
        if(!filePath)return filePath;
        return path.basename(filePath);
    }

    get_base_dir(filePath) {
        return path.dirname(filePath);
    }

    get_ext(filePath) {
        return path.extname(filePath).slice(1);
    }

    equal(path1, path2) {
        const normalizedPath1 = path.normalize(path1);
        const normalizedPath2 = path.normalize(path2);
        return normalizedPath1 == normalizedPath2;
    }
}

FPath.toString = () => '[class FPath]';
module.exports = new FPath();
