import fs from 'fs';
import path from 'path';
import find from 'find-process';
import kill from 'tree-kill';
import http from 'http';
import {
    readConfigFromFile,
    checkWritePermission,
    checkReadPermission,
    sendError,
    sendSuccess,
    getAllFiles
} from "./common.js";

const  DEFAULT_MAX_VERSIONS = 10;

// 配文件所在路径
let configFile;
// 处理push请求
const processPush = (req, res, config) => {
    const {project, version, auth, action, location, profile} = req.headers;
    if (!checkWritePermission(config, project, auth)) {
        sendError(res, 401, 'you have no permission to write this project')
        return
    }
    const projectDir = path.resolve(config.dir, project, version, profile);
    if (action === "push-start") {
        //判断版本是否存在
        if (fs.existsSync(projectDir)) {
            //删除文件夹
            fs.rmdirSync(projectDir, {recursive: true});
        }
        // 创建文件夹
        fs.mkdirSync(projectDir, {recursive: true});
        // 留存版本
        let maxVersions = parseInt(config.maxVersions ?? DEFAULT_MAX_VERSIONS);
        // NaN
        if (isNaN(maxVersions)) {
            maxVersions = DEFAULT_MAX_VERSIONS;
        }

        const versions = fs.readdirSync(path.resolve(config.dir, project));
        if (versions.length > maxVersions) {
            versions.sort((a, b) => {
                return fs.statSync(path.resolve(config.dir, project, b)).mtime - fs.statSync(path.resolve(config.dir, project, a)).mtime
            });
            for (let i = maxVersions; i < versions.length; i++) {
                fs.rm(path.resolve(config.dir, project, versions[i]), {recursive: true}, () => {
                });
            }
        }
        sendSuccess(res)
    } else if (action === "push-file") {
        const location_decode = decodeURIComponent(location);
        try {
            //对location进行处理，保证文件路径在项目目录下
            const file = path.resolve(projectDir, location_decode);
            if (!file.startsWith(projectDir)) {
                throw new Error("invalid location");
            }
            //创建文件
            fs.mkdirSync(path.dirname(file), {recursive: true});
            // 解析form-data格式的文件
            const fileWriteStream = fs.createWriteStream(file);
            req.on('data', (chunk) => {
                fileWriteStream.write(chunk);
            });
            req.on('end', () => {
                fileWriteStream.end();
                sendSuccess(res)
            });
            req.on('error', () => {
                fs.rmdirSync(projectDir, {recursive: true});
                sendError(res, 500, `upload failed: ${location_decode}`);
            })
        } catch (e) {
            fs.rmdirSync(projectDir, {recursive: true});
            sendError(res, 500, `upload failed: ${location_decode}`);
        }

    } else if (action === "push-cancel") {
        // 取消上传，删除文件夹
        fs.rmdirSync(projectDir, {recursive: true});
        sendSuccess(res)
    } else {
        sendError(res, 401, 'invalid action')
    }
}

// 处理pull请求
const processPull = (req, res, config) => {
    let {project, version, auth, action, location, profile} = req.headers;
    if (!checkReadPermission(config, project, auth)) {
        sendError(res, 401, 'you have no permission to read this project');
        return
    }
    //如果version没有指定,就获取最新的版本
    if (version === undefined || version === "") {
        const versions = fs.readdirSync(path.resolve(config.dir, project));
        versions.sort((a, b) => {
            return fs.statSync(path.resolve(config.dir, project, b)).mtime - fs.statSync(path.resolve(config.dir, project, a)).mtime
        });
        version = versions[0];
    }
    const projectDir = path.resolve(config.dir, project, version, profile);
    if (!fs.existsSync(projectDir)) {
        sendError(res, 404, 'version not found');
        return
    }
    if (action === "pull-start") {
        sendSuccess(res, getAllFiles(projectDir).map(f => f.location.replace(/\\/g, "/")));
    } else if (action === "pull-file") {
        try {
            const location_decode = decodeURIComponent(location);
            const file = path.resolve(projectDir, location_decode);
            if (!file.startsWith(projectDir)) {
                throw new Error("invalid location");
            }
            const stream = fs.createReadStream(file);
            stream.pipe(res);
        } catch (e) {
            sendError(res, 500, `download failed: ${location_decode}`);
        }
    } else {
        sendError(res, 401, 'invalid action')
    }
}

// 在当前目录下初始化服务
export const initServer = () => {
    const config = {
        port: 11111,
        dir: path.resolve("."),
        maxVersions: DEFAULT_MAX_VERSIONS,
        projects: {}
    }
    fs.writeFileSync("mrms-server.json", JSON.stringify(config, null, 4));
    console.log("server config is stored in: mrms-server.json,you can use mrms add [options] to add a project and users")
}

// 启动服务
export const startServer = (options) => {
    configFile = path.resolve(options.cfg);
    const config = readConfigFromFile(configFile);
    // init config
    config.port = config.port ?? (options.port ?? 11111);
    config.dir = config.dir ?? path.resolve(options.dir ?? ".");
    config.projects = config.projects ?? {};
    config.maxVersions = parseInt(config.maxVersions ?? DEFAULT_MAX_VERSIONS);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
    console.log("all config is stored in:", configFile);
    console.log("next time,")
    console.log("you only need to run 'mrms start' to start the server on this directory, ")
    console.log("or to run 'mrms start --cfg your-config-file' to start the server on another directory.")
    console.log("***************************************")
    http.createServer((req, res) => {
        // 获取header种的auth
        const {action} = req.headers;
        // push ,push-file,push-over
        if (action && action.startsWith("push")) {
            processPush(req, res, readConfigFromFile(configFile));
        } else if (action && action.startsWith("pull")) {
            processPull(req, res, readConfigFromFile(configFile));
        } else {
            sendError(res, 401, 'invalid request')
        }
    }).listen(config.port, (err) => {
        if (err) {
            console.log("error:", err);
        }
    });

    console.log("this server is running on port:", config.port)
    console.log("this server is running on directory:", config.dir)
    console.log("this server is running on block mode, you can use ' nohup mrms start >/dev/null 2>&1 &  ' to run it in background.")
    console.log("***************************************")
    console.log("you can use 'mrms stop' to stop the server. or use 'mrms stop --port your-port' to stop another server.")
}

// 停止服务
export const stopServer = (options) => {
    let port = options.port;
    if (options.port === undefined) {
        const configFile = path.resolve(options.cfg);
        try {
            const config = JSON.parse(fs.readFileSync(configFile));
            port = config.port;
        } catch (e) {
            console.log("no port in command and config file, please specify the port.")
            return
        }
    }
    // 关闭对应端口的服务
    console.log("stop server on port:", port)
    find('port', port).then((list) => {
        list.forEach((p) => {
            kill(p.pid, 'SIGKILL', function () {
                console.log('Process %s has been killed', p.pid);
            });
        })
    });

}