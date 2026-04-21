<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://electerm.github.io/electerm">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

[English](README_cn.md)

# electerm-web [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Open%20sourced%20terminal%2Fssh%2Fsftp%20client(linux%2C%20mac%2C%20win)&url=https%3A%2F%2Fgithub.com%2Felecterm%2Felecterm-web&hashtags=electerm,ssh,terminal,sftp)

这是Electerm应用的Web版本，可以在浏览器中运行，几乎拥有与桌面版本相同的功能。

Powered by [manate](https://github.com/tylerlong/manate)

[![GitHub version](https://img.shields.io/github/release/electerm/electerm/all.svg)](https://github.com/electerm/electerm/releases)
[![license](https://img.shields.io/github/license/electerm/electerm.svg)](https://github.com/electerm/electerm-dev/blob/master/LICENSE)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Get it from the Snap Store](https://img.shields.io/badge/Snap-Store-green)](https://snapcraft.io/electerm)
[![Get it from the Microsoft Store](https://img.shields.io/badge/Microsoft-Store-blue)](https://www.microsoft.com/store/apps/9NCN7272GTFF)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/electerm?label=Sponsors)](https://github.com/sponsors/electerm)

开源终端/ssh/telnet/serialport/RDP/VNC/Spice/sftp/ftp客户端(linux, mac, win)。

<div align="center">
  <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.gif", alt="" />
</div>

## 功能

- 可作为终端/文件管理器或 ssh/telnet/serialport/RDP/VNC/Spice/sftp/ftp 客户端
- 可全局热键切换窗口可见性（类似于 guake，默认是 `ctrl + 2`）
- 支持多平台（Linux、Mac、Win）
- 🇺🇸 🇨🇳 🇧🇷 🇷🇺 🇪🇸 🇫🇷 🇹🇷 🇭🇰 🇯🇵 🇸🇦 🇩🇪 🇰🇷 支持多语言（[electerm-locales](https://github.com/electerm/electerm-locales)，欢迎贡献/修复）
- 双击即可直接编辑（小）远程文件
- 使用公钥 + 密码进行身份验证
- 支持 Zmodem（rz、sz）
- 支持 ssh 隧道
- 支持 [Trzsz](https://github.com/trzsz/trzsz)（trz/tsz），类似于 rz/sz，并与 tmux 兼容
- 支持透明窗口（Mac、win）
- 支持终端背景图片
- 支持全局/会话代理
- 支持快速命令
- 支持 UI/终端主题
- 将书签/主题/快速命令同步到 github/gitee 的 secret gist
- 支持快速输入到任意或所有终端
- 可从 URL 查询字符串进行初始化 [wiki](https://github.com/electerm/electerm-web/wiki/Init-from-url-query-string)
- 支持移动设备(响应式设计)
- AI助手集成（支持[DeepSeek](https://www.deepseek.com)、OpenAI等AI API），协助命令建议、脚本编写、以及解释所选终端内容

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

[![wechat donate](https://electerm.html5beta.com/electerm-wechat-donate.png)](https://github.com/electerm)

## 先决条件

- git
- Nodejs 24, npm，推荐使用 [fnm](https://github.com/Schniz/fnm) 安装 nodejs/npm
- python/make 工具，对于 Linux：`sudo apt install -y make python g++ build-essential`，对于 MacOS：安装 Xcode，对于 Windows，安装 `vs studio` 或 `npm install --global --production windows-build-tools`

## 一行脚本从源代码部署

对于 Linux 或 Mac

```sh
curl -o- https://electerm.html5beta.com/scripts/one-line-web.sh | bash
```
或

```sh
wget -qO- https://electerm.html5beta.com/scripts/one-line-web.sh | bash
```

对于 Windows

```powershell
Invoke-WebRequest -Uri "https://electerm.html5beta.com/scripts/one-line-web.bat" -OutFile "one-line-web.bat"
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
# 编辑 DB_PATH 设置数据库路径，默认路径 ./database
# 若要使用与桌面版 electerm 相同的数据库数据
# 对于 Mac OS，DB_PATH="/Users/<your-user-name>/Library/Application Support/electerm"
# 对于 Linux OS，DB_PATH="/home/<your-user-name>/.config/electerm"
# 对于 Windows OS，DB_PATH="C:\\Users\\<your-user-name>\\AppData\\Roaming\\electerm"

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
# 编辑 .env，设置以下参数：
ENABLE_AUTH=1 # 如果未启用，每个人都可以无需登录使用它。
SERVER_SECRET=some-server-secret
SERVER_PASS=some-login-pass-word

# 运行生产应用程序服务器脚本文件。
./run-electerm-web.sh

# 查看 examples/nginx.conf 和 examples/nginx-ssl.conf 以获取域名绑定的 nginx 配置示例。
```

## 许可证

MIT

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%202.svg)](https://www.digitalocean.com/?refcode=c10bcb28b846&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)
