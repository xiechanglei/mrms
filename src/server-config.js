import fs from "fs";
import {randomString} from "./common.js";
// mrms add --name test --user rw:test --cfg mrms-server.json
export const addProject = (options) => {
    // 如果文件不存在
    if (!fs.existsSync(options.cfg)) {
        console.log("config file not exist")
        process.exit(1)
    }
    // 初始化配置文件
    const config = JSON.parse(fs.readFileSync(options.cfg));
    config.projects = config.projects ?? {};
    config.projects[options.name] = config.projects[options.name] ?? {};
    // 判断用户参数是否存在
    if (options.user) {
        let [mode, user] = options.user.split(":");
        if (!["rw", "r", "w"].includes(mode)) {
            console.log("invalid mode")
            process.exit(1)
        }
        if (user === undefined || user === "") {
            // 随机产生一个用户
            user = randomString(16);
        }
        config.projects[options.name][mode] = config.projects[options.name][mode] ?? [];
        if (config.projects[options.name][mode].includes(user)) {
            console.log("user already exist")
            process.exit(1)
        }
        config.projects[options.name][mode].push(user);
        console.log(`add user ${user} to project ${options.name} with mode ${mode}`)
    } else {
        console.log(`add project ${options.name}`)
    }
    // 写入配置文件
    fs.writeFileSync(options.cfg, JSON.stringify(config, null, 4));
}

// mrms remove --name test --user rw:test --cfg mrms-server.json
export const removeProject = (options) => {
    // 如果文件不存在
    if (!fs.existsSync(options.cfg)) {
        console.log("config file not exist")
        process.exit(1)
    }
    // 初始化配置文件
    const config = JSON.parse(fs.readFileSync(options.cfg));
    config.projects = config.projects ?? {};
    config.projects[options.name] = config.projects[options.name] ?? {};
    // 判断用户参数是否存在,如果不存在则删除项目,如果存在则删除用户
    if (options.user) {
        let [mode, user] = options.user.split(":");
        if (!["rw", "r", "w"].includes(mode)) {
            console.log("invalid mode")
            process.exit(1)
        }
        if (user === undefined || user === "") {
            console.log("invalid user")
            process.exit(1)
        }
        config.projects[options.name][mode] = config.projects[options.name][mode] ?? [];
        if (!config.projects[options.name][mode].includes(user)) {
            console.log("user not exist")
            process.exit(1)
        }
        config.projects[options.name][mode] = config.projects[options.name][mode].filter(u => u !== user);
        console.log(`remove user ${user} from project ${options.name} with mode ${mode}`)
    } else {
        delete config.projects[options.name];
        console.log(`remove project ${options.name}`)
    }
    // 写入配置文件
    fs.writeFileSync(options.cfg, JSON.stringify(config, null, 4));
}