# Pill Installer Builder · MCP Server

暴露两个工具，让 AI 客户端（Claude Desktop / Trae / Cursor 等）直接生成并（可选）一键编译 Windows 安装包。

## 启动方式

```powershell
cd C:\Users\yxpil\Desktop\PLinstaller\builder
npm run build:tools     # 重新打包 CLI / MCP（改代码后需执行）
node mcp/server.mjs     # 以 stdio 方式启动 MCP 服务
```

## 注册到客户端

编辑客户端配置，加入 `mcpServers`（`mcp.json` 已给出示例）：

```json
{
  "mcpServers": {
    "pill-installer-builder": {
      "command": "node",
      "args": ["C:\\Users\\yxpil\\Desktop\\PLinstaller\\builder\\mcp\\server.mjs"]
    }
  }
}
```

## 可用工具

| 工具 | 说明 |
|---|---|
| `generate_installer` | 根据 `config` 生成 NSIS/Inno 安装脚本与配套文件，返回脚本内容（不编译）。 |
| `build_installer` | 生成脚本并写入输出目录；`compile:true` 时自动调用本机 ISCC(Inno)/makensis(NSIS) 编译出 `.exe`。 |

## 参数示例（tools/call）

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "generate_installer",
    "arguments": {
      "config": {
        "engine": "inno",
        "uiStyle": "pill",
        "appName": "我的应用",
        "version": "1.0.0",
        "publisher": "我的公司",
        "exeRelPath": "release\\app.exe"
      }
    }
  }
}
```

## 常见 `config` 字段（BuildConfig）

`engine`(`nsis|inno`)、`uiStyle`(`default|pill`)、`appName`、`version`、`publisher`、
`exeRelPath`（主程序相对路径）、`files[]`（附加文件，`{relPath,name,size}`）、
`includeLicense`+`licenseText`、`logoName`、`defaultInstallDir`、
`createStartMenu`/`startMenuName`、`createDesktop`、`runAfterInstall`、
`writeRegistry`/`registryKey`、`silentMode`、`language`(`zh|en|both`)。
