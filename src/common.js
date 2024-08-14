import fs from "fs";
import path from "path";

/**
 * 获取所有的文件以及其想对路径
 * @param dir
 * @param location
 */
export const getAllFiles = (dir, location = "") => {
    const files = fs.readdirSync(dir);
    const data = [];
    for (let file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            data.push(...getAllFiles(filePath, path.join(location, file)))
        } else {
            data.push({
                filePath,
                location: path.join(location, file)
            })
        }
    }
    return data;
}

/**
 * 读取配置文件的内容
 * @param configFile
 * @returns {{}}
 */
export const readConfigFromFile = (configFile) => {
    let config = {}
    try {
        config = JSON.parse(fs.readFileSync(configFile));
    } catch (_) {
    }
    return config;
}

/**
 * 读取客户端配置
 * @param options
 * @returns {{}}
 */
export const readPushConfig = (options) => {
    const configFile = path.resolve(options.cfg);
    const config = readConfigFromFile(configFile);
    Object.assign(config, options);
    delete config.cfg;
    if (config.profile === null || config.profile === undefined || config.profile === "") {
        config.profile = "__default__"
    }
    if (!config.server || !config.port || !config.dir || !config.project || !config.version || !config.auth || !config.profile) {
        console.log("missing options,please use mrms command --help to get help")
        process.exit(1)
    }
    //判断目录是否存在
    if (!fs.existsSync(config.dir)) {
        console.log("dir not exist")
        process.exit(1)
    }
    // 配置文件存储
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
    return config;
}

export const readPullConfig = (options) => {
    const configFile = path.resolve(options.cfg);
    const config = readConfigFromFile(configFile);
    Object.assign(config, options);
    delete config.cfg;
    if (config.profile === null || config.profile === undefined || config.profile === "") {
        config.profile = "__default__"
    }
    if (!config.server || !config.port || !config.dir || !config.project || !config.auth || !config.profile) {
        console.log("missing options,please use mrms command --help to get help")
        process.exit(1)
    }
    // 配置文件存储
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
    config.version = config.version ?? "";
    return config;
}


// 检查写入权限
export const checkWritePermission = (config, project, auth) => getPermission(config, project, "w").includes(auth) || getPermission(config, project, "rw").includes(auth);

// 检查读取权限
export const checkReadPermission = (config, project, auth) => getPermission(config, project, "r").includes(auth) || getPermission(config, project, "rw").includes(auth);

// 获取权限
const getPermission = (config, project, mode) => {
    let permission = []
    if (config.projects[project]) {
        permission = config.projects[project][mode] ?? [];
        permission = permission instanceof Array ? permission : [permission];
    }
    return permission;
}

export const sendError = (res, code, message) => {
    res.writeHead(code, {'Content-Type': 'text/plain'});
    res.end(message);
}

export const sendSuccess = (res, data = "ok") => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
}

// 生成一个指定长度的随机字符串
const seed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const randomString = (length) => {
    let result = [];
    for (let i = 0; i < length; i++) {
        result.push(seed[Math.floor(Math.random() * seed.length)]);
    }
    return result.join("");
}

// 格式化文件大小
export const formatFileSize = (size) => {
    if (size < 1024) {
        return size + "B";
    } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + "KB";
    } else if (size < 1024 * 1024 * 1024) {
        return (size / 1024 / 1024).toFixed(2) + "MB";
    } else {
        return (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
    }
}