#!/usr/bin/env node

import {program} from "commander";
import {startServer, stopServer, initServer} from "./src/server.js";
import {push, initPushClient} from "./src/push.js";
import {pull, initPullClient} from "./src/pull.js";
import {addProject, removeProject} from "./src/server-config.js";
import {showProject} from "./src/show.js";

program.name("mrms");
program.description("A tool for publishing version");

// mrms init --server
// mrms init --client
program.command('init [options]')
    .description("init a server or client")
    .option('--server', 'init a server')
    .option('--push', 'init a push client')
    .option('--pull', 'init a pull client')
    .action((_, options) => {
        if (options.server) {
            initServer()
        } else if (options.push) {
            initPushClient()
        } else if (options.pull) {
            initPullClient()
        } else {
            console.log("missing options,please use mrms init --help to get help")
            process.exit(1)
        }
    });

// 启动服务
program.command('start [options]')
    .description("start a server for publishing project")
    .option('--port <port>', 'server port')
    .option('--dir <dir>', 'project directory')
    .option('--maxVersions <maxVersions>', 'max versions', "10")
    .option('--cfg <file>', 'config file', "mrms-server.json")
    .action((_, options) => startServer(options));

// 停止服务
program.command('stop [options]')
    .description("stop a server for publishing project")
    .option('--port <port>', 'server port')
    .option('--cfg <file>', 'config file', "mrms-server.json")
    .action((_, options) => stopServer(options));

// 推送项目
program.command('push [options]')
    .description('push project to server')
    .option('--server <server>', 'server ip')
    .option('--port <port>', 'server port')
    .option('--dir <dir>', 'project directory')
    .option('--project <project>', 'project name')
    .option('--version <version>', 'project version')
    .option('--auth <auth>', 'server auth token')
    .option("--profile <profile>", "profile")
    .option('--cfg <file>', 'config file', "mrms-push.json")
    .action((_, options) => push(options));

// 拉取项目
program.command('pull [options]')
    .description('pull project from server')
    .option('--server <server>', 'server ip')
    .option('--port <port>', 'server port')
    .option('--dir <dir>', 'download project base directory')
    .option('--project <project>', 'project name')
    .option('--version <version>', 'project version')
    .option('--auth <auth>', 'server auth token')
    .option("--profile <profile>", "profile")
    .option('--cfg <file>', 'config file', "mrms-pull.json")
    .action((_, options) => pull(options));

// 创建项目 mrms add --name test --user rw:test
program.command('add [options]')
    .description('add project and users')
    .requiredOption('--name <name>', 'project name')
    .option('--user <user>', 'user,format is "rw:test"  "r:test"  "w:test"  "rw:"')
    .option('--cfg <file>', 'config file', "mrms-server.json")
    .action((_, options) => addProject(options));

// 删除项目 mrms remove --name test --user rw:test
program.command('remove [options]')
    .description('remove project and users')
    .requiredOption('--name <name>', 'project name')
    .option('--user <user>', 'user,format:  rw:test or r:test')
    .option('--cfg <file>', 'config file', "mrms-server.json")
    .action((_, options) => removeProject(options));

// 显示项目信息
program.command('show [options]')
    .description('list project and users')
    .option('--name <name>', 'project name')
    .option('--cfg <file>', 'config file', "mrms-server.json")
    .action((_, options) => showProject(options));
