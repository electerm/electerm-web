<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://electerm.github.io/electerm">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

[English](README.md) | [中文](README_cn.md)

# electerm-web [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Open%20sourced%20terminal%2Fssh%2Fsftp%20client(linux%2C%20mac%2C%20win)&url=https%3A%2F%2Fgithub.com%2Felecterm%2Felecterm-web&hashtags=electerm,ssh,terminal,sftp)

这是Electerm应用的Web版本，可以在浏览器中运行，几乎拥有与桌面版本相同的功能。

Powered by [manate](https://github.com/tylerlong/manate)

[![GitHub version](https://img.shields.io/github/release/electerm/electerm/all.svg)](https://github.com/electerm/electerm/releases)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/electerm/electerm-dev/blob/master/LICENSE)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/electerm?label=Sponsors)](https://github.com/sponsors/electerm)
[![X](https://img.shields.io/badge/X-@zxdong-black?logo=x)](https://x.com/zxdong)

开源终端/ssh/telnet/serialport/RDP/VNC/Spice/sftp/ftp客户端(Linux, Mac, Windows, Android, HarmonyOS, iOS)。

除了主流的 Windows/macOS/Linux/Android，electerm 还支持鸿蒙(HarmonyOS)、iOS，以及老旧系统——如 Ubuntu 18、Windows 7、macOS 10+，以及国产特殊 Linux 发行版如 UOS、麒麟(Kylin)、龙芯(LoongArch，含旧世界与新世界)，同时还支持 RISC-V (riscv64) 与 PowerPC 64位小端 (ppc64le) Linux。

<p align="center">
  <a href="https://electerm.org">主页 / 下载</a> ·
  <a href="https://theme.electerm.org">主题</a> ·
  <a href="https://github.com/electerm/electerm-web-docker">Docker</a> ·
  <a href="https://demo.electerm.org">在线演示</a> ·
  <a href="https://github.com/electerm/electerm-android">Android</a> ·
  <a href="https://play.google.com/store/apps/details?id=org.electerm.electerm">Google Play</a> ·
  <a href="https://github.com/electerm/electerm-harmony">鸿蒙</a> ·
  <a href="https://apps.apple.com/us/app/electerm/id6792971552">苹果应用商店</a> ·
  <a href="https://appgallery.huawei.com/app/detail?id=org.electerm.electerm">华为应用市场</a> ·
  <a href="https://www.microsoft.com/store/apps/9NCN7272GTFF">微软商店</a> ·
  <a href="https://snapcraft.io/electerm">Snap 商店</a> ·
  <a href="https://repos.electerm.org/deb">deb 仓库</a> ·
  <a href="https://repos.electerm.org/rpm">rpm 仓库</a>
</p>

- 🌐 **[electerm 在线版](https://cloud.electerm.org)** — 公共免费在线 electerm 应用
- 🤖 **[electerm AI](https://ai.electerm.org)** — 免费为 electerm 用户提供 AI
- 💻 **[electerm-web](https://github.com/electerm/electerm-web)** — 运行于浏览器(支持移动设备)的 web app 版本

<div align="center">
  <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.gif", alt="" />
</div>

## 功能

- 可作为终端/文件管理器，以及 ssh/sftp/ftp/telnet/serialport/RDP/VNC/Spice 客户端
- 🇺🇸 🇨🇳 🇧🇷 🇷🇺 🇪🇸 🇫🇷 🇹🇷 🇭🇰 🇯🇵 🇸🇦 🇩🇪 🇰🇷 支持多语言（[electerm-locales](https://github.com/electerm/electerm-locales)，欢迎贡献/修复）
- 双击即可直接编辑（小）远程文件
- 全类型认证方式: publicKey, password, ssh agent, 证书, otp, netbird 等
- 支持 Zmodem（rz、sz），以及 [Trzsz](https://github.com/trzsz/trzsz)（trz/tsz）
- 可从会话工具栏管理 SSH 隧道。通过跳板机连接时，可为每台主机配置凭据、使用 Web 服务器上的 SSH agent，或在登录提示中输入凭据。
- 可定制 UI: 主题, 背景图片
- 客户端小组件可以自定义界面样式、监听标签页打开和状态变化，并关闭标签页。
- 全局/会话级代理
- 快捷命令/触发器执行预设任务与自动化操作
- 同步数据(含书签)到 github/gitee 私人 gist, webdav/custom server/electerm cloud
- 支持快速输入/镜像输入到一个或多个终端
- AI助手集成（支持多种 LLM API 格式：OpenAI Chat Completions、OpenAI Responses、Anthropic Messages），协助命令建议、脚本编写、以及解释所选终端内容, 创建书签/主题，以及agent模式直接进行终端操作
- 可从 URL 查询字符串进行初始化 [wiki](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string)
- 支持移动设备(响应式设计)

## 从 v2 迁移到 v3

从 electerm-web v3 开始，应用程序使用 SQLite 而不是 NeDB 以获得更好的性能和稳定性。如果您正在从 v2 升级并且有现有数据，则需要迁移数据。

### 迁移步骤

1. **安装 electerm-data-tool**：

   ```bash
   npm install -g electerm-data-tool
   ```

2. **从 NeDB 导出数据**：

   ```bash
      # data folder should have a nedb-database child folder
      electerm-data-tool --data-path "/path/to/your/data-folder" --app-type web export data.json
   ```

3. **启动 electerm-web v3** 并进入 **数据同步** 面板

4. **导入数据**：在数据同步面板中上传 `data.json` 文件以恢复您的数据

## 下载

待完成

## 升级

待完成

## 支持

非常欢迎您与我联系，请告诉我您的想法，[提交问题](https://github.com/electerm/electerm-web/issues/new/choose)，[发起新的讨论](https://github.com/electerm/electerm-web/discussions/new)，[创建/修复语言文件](https://github.com/electerm/electerm-locales) 或创建 pull requests，都非常欢迎。

## 赞助此项目

github 赞助

[https://github.com/sponsors/electerm](https://github.com/sponsors/electerm)

kofi

[https://ko-fi.com/zhaoxudong](https://ko-fi.com/zhaoxudong)

微信捐赠

[![wechat donate](https://electerm.org/electerm-wechat-donate.png)](https://github.com/electerm)

## 先决条件

- git
- Nodejs 24, npm，推荐使用 [fnm](https://github.com/Schniz/fnm) 安装 nodejs/npm
- python/make 工具，对于 Linux：`sudo apt install -y make python g++ build-essential`，对于 MacOS：安装 Xcode，对于 Windows，安装 `vs studio` 或 `npm install --global --production windows-build-tools`

## 一行脚本从源代码部署

对于 Linux 或 Mac

```sh
curl -o- https://electerm.org/scripts/one-line-web.sh | bash
```
或

```sh
wget -qO- https://electerm.org/scripts/one-line-web.sh | bash
```

对于 Windows

```powershell
Invoke-WebRequest -Uri "https://electerm.org/scripts/one-line-web.bat" -OutFile "one-line-web.bat"
cmd.exe /c ".\one-line-web.bat"
```

## 从 docker 镜像部署

查看 [electerm-web-docker](https://github.com/electerm/electerm-web-docker)

## 开发

```bash
# 仅在 ubuntu16.04+/mac os 10.13+ 上测试过
# 需要 nodejs/npm，建议使用 nvm 安装 nodejs/npm
# https://github.com/creationix/nvm
# 使用 nodejs 22.x

git clone git@github.com:electerm/electerm-web.git
cd electerm-web
cp .sample.env .env
# 如需登录，在 .env 中设置 ENABLE_AUTH=1 和独立的 SERVER_PASS。
# 编辑 DB_PATH 设置数据库路径，默认路径 ./database
# 若要使用与桌面版 electerm 相同的数据库数据
# 对于 Mac OS，DB_PATH="/Users/<your-user-name>/Library/Application Support/electerm"
# 对于 Linux OS，DB_PATH="/home/<your-user-name>/.config/electerm"
# 对于 Windows OS，DB_PATH="C:\\Users\\<your-user-name>\\AppData\\Roaming\\electerm"
# 编辑 DB_TYPE 选择数据库实现，默认 sqlite
# DB_TYPE=custom 使用 config.js 中自定义的数据库，参见 config.sample.js

npm install

# 启动 webpack 开发服务器
npm start

# 在另一个终端会话中运行应用程序
npm run dev

# 然后访问 http://127.0.0.1:5580 在浏览器中查看

# 代码格式检查
npm run lint

# 代码格式修复
npm run fix
```

## 构建 && 在生产环境中运行

```sh
npm run build

# 在生产环境中运行应用程序服务器
npm run prod

# 或者 ./build/bin/run-prod.sh

# 然后访问 http://127.0.0.1:5577 在浏览器中查看
```

## 在服务器上运行

```sh
# 在 .env 中将 SERVER_PASS 设置为独立密码
ENABLE_AUTH=1
# PUBLIC_ORIGIN=https://electerm.example.org
DISABLE_LOCAL_TERMINAL=1
# 让整个应用运行在子路径下，例如 https://host/electerm/
# BASE_PATH=electerm

# 运行生产应用程序服务器脚本文件。
./run-electerm-web.sh

# 查看 examples/nginx.conf 和 examples/nginx-ssl.conf 以获取域名绑定的 nginx 配置示例。
# 上面 BASE_PATH 的配置参考 examples/nginx-subpath.conf。
```

浏览器会话在空闲 30 分钟或累计 12 小时后过期。退出登录或重启服务器会使会话失效，并断开对应的 WebSocket。已启用登录的用户升级后，刷新页面并使用原有 SERVER_PASS 重新登录。保留原有数据目录和配置即可，旧的 SERVER_SECRET 和 TOKEN_EXPIRED_TIME 可以留在配置中。使用旧 JWT 接口的客户端需要改用 Cookie 会话。不设置 ENABLE_AUTH 或留空时，任何能访问应用的人都可以直接使用。任何非空值（包括 0 和 false）均启用密码登录，与旧版本一致。远程使用时，在反向代理启用 TLS，并限制后端访问。默认按请求的 Host 校验浏览器来源。请让代理保留外部主机名和端口，或通过可选的 `PUBLIC_ORIGIN` 指定浏览器使用的 HTTPS 来源。

## 许可证

MIT
