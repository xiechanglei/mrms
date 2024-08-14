import fs from "fs";
import {getAllFiles, readPushConfig} from "./common.js";
import path from "path";
import chalk from "chalk";
import progress from 'progress-stream';
import http from 'http';

// 推送文件
export const push = async (options) => {
    const config = readPushConfig(options);
    // 发送push-start 请求
    try {
        const response = await fetch(`http://${config.server}:${config.port}`, {
            method: 'POST',
            headers: {
                'action': 'push-start',
                'project': config.project,
                'version': config.version,
                'auth': config.auth,
                'profile': config.profile ?? ""
            }
        })
        if (response.status !== 200) {
            const responseText = await response.text();
            console.log(chalk.red("err:", responseText))
            return
        }
    } catch (e) {
        console.log(chalk.red("err:", "connect server failed on server", config.server, "and port", config.port))
        process.exit(1)
    }
    // 读取文件目录下的所有文件
    let allFiles = getAllFiles(config.dir, "");
    if (config.include !== undefined && config.include.length > 0) {
        allFiles = allFiles.filter(f => {
            return config.include.findIndex(pla => {
                // 如果是文件名称，直接精准匹配
                if (pla === f.location) {
                    return true
                }
                //通配符匹配(classes/*)
                if (pla.endsWith("*")) {
                    return f.location.startsWith(pla.substring(0, pla.indexOf("*")))
                }
                // 剩下的按照文件夹匹配
                pla = pla.endsWith("/") ? pla : pla + "/";
                return f.location.startsWith(pla)
            }) !== -1
        });
    }
    for (let {filePath, location} of allFiles) {
        await uploadFile(config, filePath, location)
    }
    console.log(chalk.green("push success! current version is:", config.version));
    process.exit(0);
}

const uploadFile = async (config, filePath, location) => {
    // 因为windows和linux的路径分隔符不一样，所以需要替换
    location = location.replace(/\\/g, "/");
    const file = fs.createReadStream(filePath);
    const totalSize = fs.statSync(filePath).size;

    const progressStream = progress({
        length: totalSize,
        time: 100 /* ms */
    });


    // process.stdout.write(chalk.black(location))
    progressStream.on('progress', (progress) => {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(chalk.green("↗ "));
        process.stdout.write(chalk.green(progress.percentage.toFixed(0)));
        process.stdout.write(chalk.green("%"));
        process.stdout.write("\t");
        process.stdout.write(location);
        // process.stdout.write(chalk.black(` [${progress.transferred}/${progress.length}]`));
    });

    const request = http.request({
        host: config.server,
        port: config.port,
        path: '/',
        method: 'POST',
        headers: {
            'action': 'push-file',
            'project': config.project,
            'version': config.version,
            'auth': config.auth,
            'profile': config.profile ?? "",
            'location': encodeURIComponent(location),
            'Content-Type': 'application/octet-stream',
        }
    });
    file.pipe(progressStream).pipe(request);
    return new Promise((resolve, reject) => {
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                process.stdout.write(chalk.bold(chalk.red(" ✕")));
                reject()
            } else {
                process.stdout.write(chalk.bold(chalk.green(" ✓")));
                resolve()
            }
            process.stdout.write("\n")
        });
    })

};

// 在当前目录下初始化服务
export const initPushClient = () => {
    const config = {
        server: "127.0.0.1",
        port: 11111,
        dir: path.resolve("./dist"),
        project: "demo_project",
        version: "1.0.0",
        include: [],
        profile: "__default__",
        auth: "demo_user"
    }
    fs.writeFileSync("mrms-push.json", JSON.stringify(config, null, 4));
}