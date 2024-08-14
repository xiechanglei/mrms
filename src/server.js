import fs from 'fs';
import path from 'path';
import find from 'find-process';
import kill from 'tree-kill';
import {readConfigFromFile} from "./common.js";
import {exec} from "child_process"
import {fileURLToPath} from 'url'
import chalk from "chalk";

const DEFAULT_MAX_VERSIONS = 10;
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
export const startServer = async (options) => {
    const configFile = path.resolve(options.cfg);
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
    const baseDir = path.dirname(fileURLToPath(import.meta.url))
    const startServerFile = baseDir + "/start-server.js"
    const command = `npx forever start -m 1 -s  ${startServerFile} ${configFile}`;
    exec(command, (error, stdout, stderr) => {
    });
    console.log(chalk.green("start server success at port " + config.port))
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
            kill(p.pid, 'SIGKILL', () => {
            });
            kill(p.ppid, 'SIGKILL', () => {
            });
        })
    });

}