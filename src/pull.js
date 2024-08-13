import fs from "fs";
import path from "path";
import {readPullConfig} from "./common.js";

export const pull = async (options) => {
    const config = readPullConfig(options);
    //读取文件列表
    const response = await fetch(`http://${config.server}:${config.port}`, {
        method: 'POST',
        headers: {
            'action': 'pull-start',
            'project': config.project,
            'version': config.version,
            'profile': config.profile,
            'auth': config.auth
        }
    });
    if (response.status !== 200) {
        const responseText = await response.text();
        console.log(responseText)
        return
    }
    //如果下载的文件夹不存在，创建文件夹
    const dir = path.resolve(config.dir);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
    const files = await response.json();
    for (let file of files) {
        await downloadFile(config, file);
    }
}

const downloadFile = async (config, file) => {
    console.log(`downloading ${file}...`)
    const response = await fetch(`http://${config.server}:${config.port}`, {
        method: 'POST',
        headers: {
            'action': 'pull-file',
            'project': config.project,
            'version': config.version,
            'auth': config.auth,
            'profile': config.profile,
            'location': encodeURIComponent(file)
        }
    });
    if (response.status !== 200) {
        const responseText = await response.text();
        console.log(responseText)
        process.exit(1)
    }
    const buffer = await response.arrayBuffer();
    // file 可能是windows路径，需要转换
    file = file.replace(/\\/g, "/");
    const filePath = path.resolve(config.dir, file);
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, {recursive: true});
    }
    fs.writeFileSync(filePath, Buffer.from(buffer));
}

// 在当前目录下初始化服务
export const initPullClient = () => {
    const config = {
        server: "127.0.0.1",
        port: 11111,
        dir: path.resolve("."),
        project: "project_name",
        profile: "__default__",
        auth: "user"
    }
    fs.writeFileSync("mrms-pull.json", JSON.stringify(config, null, 4));
}