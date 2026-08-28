#!/usr/bin/env node
/**
 * Pill Installer Builder —— MCP Server（stdio 传输）
 * 暴露工具：
 *   generate_installer  根据配置生成 NSIS/Inno 安装脚本与配套文件
 *   build_installer     生成脚本并写入输出目录，可选自动编译出安装包 .exe
 *
 * 注册方式（Claude Desktop / Trae 等 MCP 客户端）：
 *   {
 *     "mcpServers": {
 *       "pill-installer-builder": {
 *         "command": "node",
 *         "args": ["<本文件路径>"]
 *       }
 *     }
 *   }
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { generateBundle, defaultConfig } from '../src/lib/generator';
import type { BuildConfig, InstallEngine } from '../src/lib/types';

interface Rpc {
  jsonrpc: '2.0';
  id: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

function send(msg: unknown): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function findCompiler(engine: InstallEngine): { cmd: string; name: string } | null {
  if (engine === 'nsis') {
    const r = spawnSync('makensis', ['-VERSION'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return { cmd: 'makensis', name: 'NSIS makensis' };
    return null;
  }
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const cands = [
    path.join(pf86, 'Inno Setup 6', 'ISCC.exe'),
    path.join(pf, 'Inno Setup 6', 'ISCC.exe'),
  ];
  const iscc = cands.find((p) => fs.existsSync(p));
  if (iscc) return { cmd: iscc, name: 'Inno Setup 6 ISCC' };
  return null;
}

function toConfig(p: Record<string, unknown> | undefined): BuildConfig {
  const base = defaultConfig();
  const merged = { ...base, ...(p || {}) } as BuildConfig;
  if (Array.isArray(merged.files)) {
    merged.files = merged.files.map((f) => ({
      relPath: String((f as { relPath?: string }).relPath || '').replace(/\//g, '\\'),
      name: (f as { name?: string }).name || '',
      size: (f as { size?: number }).size || 0,
    }));
  }
  return merged;
}

function handleTool(name: string, args: Record<string, unknown>): { content: { type: 'text'; text: string }[]; isError?: boolean } {
  try {
    if (name === 'generate_installer') {
      const cfg = toConfig(args?.config as Record<string, unknown>);
      const b = generateBundle(cfg);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(
            { scriptName: b.scriptName, script: b.script, license: b.license, buildBat: b.buildBat, buildPs1: b.buildPs1, readme: b.readme },
            null, 2,
          ),
        }],
      };
    }

    if (name === 'build_installer') {
      const cfg = toConfig(args?.config as Record<string, unknown>);
      const outDir = (args?.outDir as string) || './mcp-out';
      const doCompile = Boolean(args?.compile);
      const bundle = generateBundle(cfg);

      fs.mkdirSync(outDir, { recursive: true });
      const entries: [string, string][] = [[bundle.scriptName, bundle.script]];
      if (bundle.license) entries.push(['license.txt', bundle.license]);
      entries.push(['build.bat', bundle.buildBat], ['build.ps1', bundle.buildPs1], ['README.md', bundle.readme]);

      const written: string[] = [];
      for (const [n, c] of entries) {
        const p = path.join(outDir, n);
        fs.writeFileSync(p, c, 'utf8');
        written.push(p);
      }

      let compileLog = '（未编译，仅生成脚本；传 compile:true 可一键编译）';
      if (doCompile) {
        const tool = findCompiler(cfg.engine);
        if (!tool) {
          compileLog = `未找到编译工具(${cfg.engine})。请在: ${cfg.engine === 'inno' ? 'Program Files 安装 Inno Setup 6' : '把 makensis 加入 PATH'}`;
        } else {
          const scriptName = cfg.engine === 'inno' ? 'install.iss' : 'install.nsi';
          const r = spawnSync(tool.cmd, [scriptName], { cwd: outDir, encoding: 'utf8' });
          compileLog = `编译工具：${tool.name}\n` + (r.error
            ? `出错：${r.error.message}`
            : `退出码：${r.status ?? 0}\n${(r.stdout || '') + (r.stderr || '')}`.trim());
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ outDir, files: written, compile: compileLog }, null, 2),
        }],
      };
    }

    return { content: [{ type: 'text', text: `未知工具：${name}` }], isError: true };
  } catch (e) {
    return { content: [{ type: 'text', text: `错误：${(e as Error).message}` }], isError: true };
  }
}

const TOOLS = [
  {
    name: 'generate_installer',
    description: '根据配置生成 NSIS/Inno 安装脚本与配套文件（license/build.bat/build.ps1/README），不执行编译。',
    inputSchema: {
      type: 'object',
      properties: {
        config: { type: 'object', description: '打包配置，字段见 BuildConfig：engine/appName/version/exeRelPath/files/defaultInstallDir/uiStyle 等' },
      },
      required: [],
    },
  },
  {
    name: 'build_installer',
    description: '生成安装脚本并写入输出目录；设置 compile:true 时自动调用本机 makensis(NSIS)/ISCC(Inno) 编译出安装包 .exe。',
    inputSchema: {
      type: 'object',
      properties: {
        config: { type: 'object', description: '打包配置' },
        outDir: { type: 'string', description: '输出目录，默认 ./mcp-out' },
        compile: { type: 'boolean', description: '是否自动编译' },
      },
      required: [],
    },
  },
];

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg: Rpc;
  try {
    msg = JSON.parse(trimmed) as Rpc;
  } catch {
    return;
  }
  const { method, id, params } = msg;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'pill-installer-builder', version: '1.0.0' },
      },
    });
    return;
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }
  if (method === 'tools/list') { send({ jsonrpc: '2.0', id, result: { tools: TOOLS } }); return; }
  if (method === 'tools/call') {
    const p = (params || {}) as { name: string; arguments?: Record<string, unknown> };
    const res = handleTool(p.name, p.arguments);
    send({ jsonrpc: '2.0', id, result: res });
    return;
  }
  send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
});
