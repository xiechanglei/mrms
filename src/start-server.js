#!/usr/bin/env node

import http from "http";
import {
    checkReadPermission,
    checkWritePermission,
    getAllFiles,
    readConfigFromFile,
    sendError,
    sendSuccess
} from "./common.js";
import path from 'path'
import fs from 'fs'
import kill from "tree-kill";

const DEFAULT_MAX_VERSIONS = 10;

// 读取命令行中的参数
const configFile = process.argv.pop()

const config = readConfigFromFile(configFile)

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

const server = http.createServer((req, res) => {
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
}).listen(config.port);

server.on('error', () => {
    console.log("port already in use");
    console.log(process.ppid)
    kill(process.ppid, 'SIGKILL');
});