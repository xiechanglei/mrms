import fs from "fs";
import path from "path";
import {formatFileSize, readPullConfig} from "./common.js";
import chalk from "chalk";
import http from "http";

export const pull = async (options) => {
    const config = readPullConfig(options);
    //读取文件列表
    try{
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
    }catch (e){
        console.log(chalk.red("err:", "connect server failed on server", config.server, "and port", config.port, e.message))
        process.exit(1)
    }
}

const downloadFile = async (config, file_path) => {
    // 格式化路径
    const format_file_path = file_path.replace(/\\/g, "/");
    // 创建文件夹
    const file = path.resolve(config.dir, format_file_path);
    const dirname = path.dirname(file);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, {recursive: true});
    }
    // 创建文件流
    const fileStream = fs.createWriteStream(file);
    // 已经接收的字节数
    let receivedBytes = 0;

    // 文件的下载参数
    const options = {
        headers: {
            'action': 'pull-file',
            'project': config.project,
            'version': config.version,
            'auth': config.auth,
            'profile': config.profile,
            'location': encodeURIComponent(file_path)
        }
    };

    process.stdout.write(chalk.green("↘ "));
    process.stdout.write(chalk.green("0% "));
    process.stdout.write(file_path);
    // 下载文件

    return new Promise((resolve, reject) => {
        http.get(`http://${config.server}:${config.port}`, options, (response) => {
            if (response.statusCode !== 200) {
                process.stdout.write(chalk.bold(chalk.red(" ✕")));
                process.stdout.write("\n");
                process.exit(1)
            }
            const totalBytes = response.headers['content-length'];
            process.stdout.write(chalk.yellow(` [${formatFileSize(receivedBytes)}/${formatFileSize(totalBytes)}] `));
            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                const progress = (receivedBytes / totalBytes * 100).toFixed(0);
                process.stdout.write(chalk.green("↘ "));
                process.stdout.write(chalk.green(`${progress}% `));
                process.stdout.write(file_path);
                process.stdout.write(chalk.yellow(` [${formatFileSize(receivedBytes)}/${formatFileSize(totalBytes)}] `));
            });
            response.on('end', () => {
                process.stdout.write(chalk.bold(chalk.green(" ✓")));
                process.stdout.write("\n");
                fileStream.close();
                resolve()
            });
            response.pipe(fileStream);
        }).on('error', (error) => {
            process.stdout.write(chalk.bold(chalk.red(" ✕")));
            process.stdout.write("\n");
            process.exit(1)
            reject()
        })
    })
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