# PILinstaller 测试说明

- 测试完成：是（2026-10-04）
- 测试日期：2026-10-04
- 测试内容：单元：formatSize、escapeWinName、generateInno 脚本生成、fillTemplate；注入：appName/文件名危险字符清洗、路径透传
- 运行命令：cd builder && npm test
- 测试框架：Vitest
- 模型：豆包（Doubao）生成


安装器生成器（React+TS GUI，核心逻辑在 `builder/src/lib/`）。测试用 **Vitest**，覆盖纯逻辑层。

## 运行方式

```bash
cd builder
npm install   # 首次，会装 vitest
npm test
```

## 测了什么

测试目录：`builder/tests/unit/`
- `files.test.ts` —— `formatSize` 字节换算、`escapeWinName` 非法字符清洗（注入：`\ / * ? " < >` 被中和为 `_`）。
- `inno.test.ts` —— `generateInno` 集成：生成 `[Setup]/[Files]/[Languages]` 段、programfiles64 目录映射、主文件去重、双语言；
  - **注入防护**：`appName` 含 `" ; :` 等危险字符时，经 `safeName` 清洗后的 AppId / 卸载注册表键剔除危险字符（引号/分号/反斜杠不进入安全键）。
- `presets.test.ts` —— `fillTemplate` 作者占位符替换、空作者回退、内置许可预设齐全。

## 原有测试覆盖
- 原仓库无自动化测试（0）。

## 预期结果

```
Test Files  3 passed (3)
     Tests  11 passed (11)
```

> 前端交互组件（React steps）未起浏览器自动化；纯逻辑已抽取到 lib 并直接单测。
