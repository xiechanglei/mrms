**mrms** 是一个用来简单的管理项目发布的工具。纯手工化的发布流程中，我们有很多方式去将打包后的代码发布到服务器上，比如通过ftp，通过rsync等等,又或者在服务器上直接拉取源代码之后进行编译打包。

这里提供了一种新的方式，创建一个软件包管理服务，然后通过命令行的方式，将打包后的文件夹发布到软件包管理服务上，然后通过命令行的方式，将对应的软件包拉取到服务器上。

```shell
# 推送软件包
mrms push --version 20241901
# 拉取软件包
mrms pull --version 20241901
```

下面介绍一下具体的使用方式。

#### 1.安装

```bash
npm install -g mrms
```

#### 2. 创建软件包管理服务

所有的版本相关文件都需要上传到一个中心服务器上，所以我们需要在服务器上创建一个软件包管理服务。首先我们需要在服务器上创建一个目录，比如`/home/xie/code-work-space/js/mrms`
，然后在这个目录下创建一个软件包管理服务：

```bash
mrms start
```

这个命令表示在当前目录下创建一个软件包管理服务，端口号为11111。

你会发现当前目录下多了一个文件`mrms-server.json`,文件内容如下:

```json
{
  "port": 11111,
  "dir": "/home/xie/code-work-space/js/mrms",
  "projects": {}
}
```

其中`port`表示服务的端口号，`dir`表示软件包管理服务的根目录，`projects`表示项目列表。

实际上start的命令的执行流程是这样的：

1. 从命令行中获取参数`port`和`dir`的值。
2. 从命令行中获取参数`cfg`的值（如果没有指定，则默认值为`mrms-server.json`），该值表示配置文件的路径,
   然后读取配置文件的内容，如果配置文件不存在，那么返回一个空的配置项目`{}`。
3. 将命令行中的参数的值与配置文件中的值合并，如果有冲突，以命令行中的参数为准。如果都没有配置`port` 和 `dir`
   ，那么使用默认值(`11111` 和 `.`)。
4. 将合并后的配置写入到指定的配置文件中。
5. 启动软件包管理服务。

所以直接使用`mrms start`命令，就可以创建一个默认的软件包管理服务，并生成了配置文件`mrms-server.json`。

当然你也可以指定配置去生成：

```bash
mrms start --port 22222 --dir /home/xie/code-work-space/js/mrms --cfg /home/xie/code-work-space/js/mrms/mrms-server.json
```

最终这些参数会写入到`/home/xie/code-work-space/js/mrms/mrms-server.json`中。并且下一次启动的时候，命令可以简化成:

```bash
mrms start --cfg /home/xie/code-work-space/js/mrms/mrms-server.json
```

或者，当你在`/home/xie/code-work-space/js/mrms`目录下的时候，命令可以精简到最后一步：

```bash
mrms start
```

如果需要停止服务，可以找到对应的进程，然后kill掉就可以了。当然我们也提供了一个停止服务的命令：

```bash
mrms stop
```

这个命令会寻找当前目录下的`mrms-server.json`文件，从中读取端口号，然后关闭对应的服务。

也可以使用`cfg`参数指定配置文件：

```bash
mrms stop --cfg /home/xie/code-work-space/js/mrms/mrms-server.json
```

或者使用`port`参数直接指定端口号，程序就不会去读取配置文件了：

```bash
mrms stop --port 11111
```

> 以上的流程，主要讲解操作原理，可以简化使用`mrms init --server` 来创建一个默认的配置文件，然后使用`mrms start`来启动服务。

#### 3. 创建项目

软件包管理服务不允许匿名用户上传不受管理的文件夹，所以我们需要在配置文件中进行相关的配置。打开对应的配置文件如`mrms-server.json`
，添加一个项目：

```json
{
  "port": 11111,
  "dir": "/home/xie/code-work-space/js/mrms",
  "projects": {
    "test-project": {
      "r": "test-user-1",
      "w": "test-user-2",
      "rw": "test-user-3"
    }
  }
}
```

上面的配置表示创建了一个名字叫做`test-project`的项目，该项目有三个用户，分别是`test-user-1`，`test-user-2`和`test-user-3`
。其中`r`表示只能获取项目文件，`w`表示只能上传文件，`rw`表示既能上传文件，又能获取文件。

当想配置多个用户的时候，可以替换成数组格式：

```json
{
  "port": 11111,
  "dir": "/home/xie/code-work-space/js/mrms",
  "projects": {
    "test-project": {
      "r": [
        "test-user-1",
        "test-user-2"
      ],
      "w": [
        "test-user-3",
        "test-user-4"
      ],
      "rw": "test-user-5"
    }
  }
}
```

#### 4. 上传软件包

服务器的环境配置完成之后，我们就可以在其他的机器上上传打包后的软件包了。首先我们需要安装`mrms`到对应的机器上：

```bash
npm install -g mrms
```

然后将我们的软件包上传到服务器上，比如前端的项目文件夹一般是dist文件夹，我们可以将dist文件夹上传到服务器上：

```bash
mrms push --server 192.168.3.143 --port 11111 --dir dist --project test-project --version 20241901 --auth test-user-3
```

- `--server`表示服务器的ip地址
- `--port`表示服务器的端口号
- `--dir`表示要上传的文件夹
- `--project`表示要上传到的项目
- `--version`表示要上传的版本号
- `--profile`表示要上传的分支（版本下的细分，比如生产环境，开发环境，测试环境等）
- `--auth`表示上传的用户

与服务端的命令一致，都会将对应的参数自动写入到配置文件中，所以下次上传的时候，可以简化成：

```bash
mrms push
```

需要注意的是，不允许上传重复的版本号，如果上传的版本号已经存在，那么会提示错误。

> 以上的流程，主要讲解操作原理，可以简化使用`mrms init --push` 来创建一个默认的配置文件，然后使用`mrms push`来启动服务。
> 生成的mrms-push.json 在文件中可以使用include文件来过滤不需要上传的文件夹。

#### 5. 拉取软件包

当我们需要在服务器上拉取对应的软件包的时候，我们可以使用`mrms pull`命令：

```bash
mrms push --server 192.168.3.143 --port 11111 --dir . --project test-project --version 20241901 --auth test-user-4
```

- `--server`表示服务器的ip地址
- `--port`表示服务器的端口号
- `--dir`表示要拉取到的文件夹 ,如果文件夹不存在，那么会自动创建
- `--project`表示要拉取的项目
- `--version`表示要拉取的版本号 如果不指定版本号，那么会拉取最新的版本
- `--auth`表示拉取的用户

> 以上的流程，主要讲解操作原理，可以简化使用`mrms init --pull` 来创建一个默认的配置文件，然后使用`mrms pull`来启动服务。


#### 6. 辅助命令

- `mrms show` 服务端用来显示当前目录下的`mrms-server.json`中的配置的所有的项目,可以通过`--cfg` 来指定配置文件
- `mrms show --name project_name` 服务端用来显示对应项目的一些信息，包括项目的用户，项目的版本，分支等信息 
- `mrms add --name project_name` 服务端用来添加一个名字叫做`project_namne`的项目
- `mrms add --name project_name --user rw:user_a` 服务端给 `project_name`项目添加一个有用户，权限是`rw`，名称是`user_a`,权限分为`r` `w` `rw`,分别表示只读，只写，以及读写。当用户的参数值只有权限符的时候，比如`--name rw`,会自动生成一个随机的用户,更推荐使用这种方式去生成。
- `mrms remove --name project_name` 服务端用来删除一个项目
- `mrms remove --name project_name --user rw:user_a` 服务端用来删除一个项目中的指定用户


todo
1. 重复启动失败之后关闭对应的forever

