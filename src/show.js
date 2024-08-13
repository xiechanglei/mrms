import fs from "fs";
import chalk from "chalk";

export const showProject = (options) => {
    // 如果文件不存在
    if (!fs.existsSync(options.cfg)) {
        console.log("config file not exist")
        process.exit(1)
    }
    // 读取配置文件
    const config = JSON.parse(fs.readFileSync(options.cfg));
    config.projects = config.projects ?? {};

    // 如果name参数不存在,则打印所有的项目名称
    if (options.name === undefined) {
        const allProjects = []
        for (let project in config.projects) {
            allProjects.push(project)
        }
        console.log("All projects:", allProjects)
        return
    }

    // 判断项目是否存在
    if (config.projects[options.name] === undefined) {
        console.log("project not exist")
        process.exit(1)
    }

    // 打印所有的用户
    console.log("Project:", chalk.green(options.name))
    console.log("=====================", chalk.blue("USER"), "=================================")
    console.log("All permission user  [rw]:", config.projects[options.name].rw ?? [])
    console.log("Readonly user         [r]:", config.projects[options.name].r ?? [])
    console.log("Writeable user        [w]:", config.projects[options.name].w ?? [])

    //打印所有的版本
    console.log("=====================", chalk.blue("VERSION"), "==============================")
    const baseDir = config.dir ?? ".";
    const projectDir = `${baseDir}/${options.name}`;
    if (!fs.existsSync(projectDir)) {
        return
    }
    const versions = fs.readdirSync(projectDir);
    // 按照文件夹修改时间降序排序
    versions.sort((a, b) => {
        return fs.statSync(`${projectDir}/${b}`).mtime - fs.statSync(`${projectDir}/${a}`).mtime
    });
    versions.forEach(version => {
        // 读取所有的profile
        const profiles = fs.readdirSync(`${projectDir}/${version}`);
        console.log("version:", chalk.green(version), "profiles:", profiles)
    })


}