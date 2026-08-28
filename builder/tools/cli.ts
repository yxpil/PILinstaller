#!/usr/bin/env node
/**
 * Pill Installer Builder —— CLI
 * 用法：
 *   node dist/cli.mjs --app "我的应用" --version 1.0.0 --exe release/app.exe --engine inno --compile
 *   node dist/cli.mjs --config build.json --out ./dist-installer
 * 说明：
 *   --app --version --publisher --exe --files --dir ... 直接指定打包参数
 *   --compile  自动检测本机 makensis(NSIS) / ISCC(Inno Setup) 并直接编译出安装包
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateBundle, defaultConfig } from '../src/lib/generator';
import type { BuildConfig, BuildFile, InstallEngine, InstallLang, UiStyle } from '../src/lib/types';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const HELP = `Pill Installer Builder CLI
================================
用法:
  node cli.mjs [options]

常用选项:
  --app <name>                 应用名称
  --version <v>                版本号
  --publisher <p>              发布者
  --exe <relPath>              主程序相对路径, 例如 release/app.exe
  --files <a|b|c>              相关文件(用 | 分隔), 可含子目录
  --engine [nsis|inno|csharp]   安装引擎(默认 nsis; csharp=自研 C# WPF Pill 安装器)
  --ui [pill|default]          安装界面风格(默认 pill)
  --lang [zh|en|both]          界面语言(默认 zh)
  --dir <dir>                  默认安装目录
  --license <file>             读取文本文件作为许可协议
  --no-license                 不显示许可协议
  --logo <name>                安装程序图标文件名
  --registry-key <key>         注册表键
  --[no-]start-menu            开始菜单快捷方式
  --start-menu-name <name>     开始菜单文件夹名
  --[no-]desktop               桌面快捷方式
  --[no-]run-after             安装后运行
  --[no-]registry              写入注册表卸载项
  --[no-]silent                静默安装支持
  --out <dir>                  输出目录(默认 ./out)
  --compile                    自动调用 makensis/ISCC 编译出包
  --config <json>              从 JSON 配置文件读取全部参数
  --help                       显示本帮助
`;

interface CliResult {
  config: BuildConfig;
  outDir: string;
  compile: boolean;
}

function parseArgs(argv: string[]): { result?: CliResult; configFile?: string; help: boolean } {
  const cfg = defaultConfig();
  let outDir = './out';
  let compile = false;
  let configFile: string | undefined;
  let licenseFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    const val = (name: string) => {
      const v = next();
      if (v === undefined || v.startsWith('--')) throw new Error(`选项 ${name} 需要一个值`);
      return v;
    };
    switch (a) {
      case '--help': case '-h': return { help: true };
      case '--app': case '--name': cfg.appName = val(a); break;
      case '--version': cfg.version = val(a); break;
      case '--publisher': case '--author': cfg.publisher = val(a); break;
      case '--exe': cfg.exeRelPath = val(a).replace(/\//g, '\\'); break;
      case '--files': {
        const list = next();
        if (!list) throw new Error('--files 需要一个值');
        cfg.files = list.split(/[|,]/).map((x) => {
          const rel = x.trim().replace(/\//g, '\\');
          return { relPath: rel, name: rel.split(/[\\/]/).pop() || rel, size: 0 } as BuildFile;
        });
        break;
      }
      case '--engine': cfg.engine = next() as InstallEngine; break;
      case '--ui': cfg.uiStyle = next() as UiStyle; break;
      case '--lang': cfg.language = next() as InstallLang; break;
      case '--dir': cfg.defaultInstallDir = next(); break;
      case '--registry-key': cfg.registryKey = next(); break;
      case '--start-menu-name': cfg.startMenuName = next(); break;
      case '--logo': cfg.logoName = next(); break;
      case '--license': licenseFile = next(); break;
      case '--license-text': cfg.licenseText = next(); break;
      case '--no-license': cfg.includeLicense = false; break;
      case '--start-menu': cfg.createStartMenu = true; break;
      case '--no-start-menu': cfg.createStartMenu = false; break;
      case '--desktop': cfg.createDesktop = true; break;
      case '--no-desktop': cfg.createDesktop = false; break;
      case '--run-after': cfg.runAfterInstall = true; break;
      case '--no-run-after': cfg.runAfterInstall = false; break;
      case '--registry': cfg.writeRegistry = true; break;
      case '--no-registry': cfg.writeRegistry = false; break;
      case '--silent': cfg.silentMode = true; break;
      case '--no-silent': cfg.silentMode = false; break;
      case '--out': outDir = next(); break;
      case '--compile': compile = true; break;
      case '--config': configFile = next(); break;
      default: throw new Error(`未知参数: ${a}`);
    }
  }

  // 从 JSON 配置合并（JSON 优先，之后 flag 覆盖已在上面应用，这里把 JSON 作为基底覆盖）
  if (configFile) {
    if (!fs.existsSync(configFile)) throw new Error(`找不到配置文件: ${configFile}`);
    const raw = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const base = defaultConfig();
    // 只需覆盖用户显式传入的字段
    const merged: BuildConfig = { ...base, ...raw, files: raw.files ? raw.files.map((f: BuildFile) => ({ ...f, relPath: String(f.relPath).replace(/\//g, '\\') })) : base.files };
    // 让显式 flag 覆盖 JSON —— 简单起见：把 JSON 作为最终，但 engine/ui/app 等已在上面改过，这里允许 JSON 覆盖，符合"配置即真相"
    return { result: { config: merged, outDir: raw.outDir || outDir, compile: raw.compile ?? compile }, help: false };
  }

  if (licenseFile) {
    if (!fs.existsSync(licenseFile)) throw new Error(`找不到许可协议文件: ${licenseFile}`);
    cfg.licenseText = fs.readFileSync(licenseFile, 'utf8');
    cfg.includeLicense = true;
  }

  return { result: { config: cfg, outDir, compile }, help: false };
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

function writeBundle(config: BuildConfig, outDir: string): string[] {
  const bundle = generateBundle(config);
  fs.mkdirSync(outDir, { recursive: true });
  const files: Record<string, string> = {};
  files[bundle.scriptName] = bundle.script;
  if (bundle.license) files['license.txt'] = bundle.license;
  files['build.bat'] = bundle.buildBat;
  files['build.ps1'] = bundle.buildPs1;
  files['README.md'] = bundle.readme;
  const written: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(outDir, name);
    fs.writeFileSync(p, content, 'utf8');
    written.push(p);
  }
  return written;
}

function compile(config: BuildConfig, outDir: string): void {
  const tool = findCompiler(config.engine);
  if (!tool) {
    console.error(`[ERROR] 未找到编译工具：${config.engine === 'inno' ? '请在 Program Files 安装 Inno Setup 6 (ISCC.exe)' : '请把 makensis 加入 PATH（NSIS）'}`);
    process.exit(1);
  }
  const scriptName = config.engine === 'inno' ? 'install.iss' : 'install.nsi';
  console.log(`[i] 使用 ${tool.name} 编译 ${scriptName} ...`);
  const r = spawnSync(tool.cmd, [scriptName], { cwd: outDir, stdio: 'inherit', shell: false });
  if (r.error || r.status !== 0) {
    console.error('[ERROR] 编译失败，请检查上方错误信息。');
    process.exit(1);
  }
  const outName = `Install-${config.appName.replace(/[^\w\u4e00-\u9fa5.-]/g, '_')}-${config.version}.exe`;
  const exePath = config.engine === 'inno'
    ? path.join(outDir, 'Output', outName)
    : path.join(outDir, outName);
  if (fs.existsSync(exePath)) {
    console.log(`[OK] 安装包已生成：${exePath}`);
  } else {
    console.log(`[OK] 编译完成。请到 ${outDir} 查看生成的安装包。`);
  }
}

function sh(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (r.error || r.status !== 0) {
    console.error(`[ERROR] 命令失败：${cmd} ${args.join(' ')}\n${(r.stdout || '') + (r.stderr || '')}`);
    process.exit(1);
  }
}

function rmrf(p: string): void { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }

function copyTree(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src)) copyTree(path.join(src, e), path.join(dest, e));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function ensureSampleApp(): string {
  const sampleDir = path.resolve(HERE, '../samples/SampleApp');
  const pub = path.join(sampleDir, '_pub');
  rmrf(pub);
  rmrf(path.join(sampleDir, 'obj'));
  rmrf(path.join(sampleDir, 'bin'));
  sh('dotnet', ['publish', sampleDir, '-c', 'Release', '-o', pub], sampleDir);
  return path.join(pub, 'SampleApp.exe');
}

function runPowerShell(args: string[], cwd: string): void {
  sh('powershell', ['-NoProfile', '-Command', args.join(' ')], cwd);
}

// 生成 Pill 风格黑白图标（圆角黑底 + 白色首字母），写为 icon.ico / icon.png
function generateIcon(projDir: string, appName: string): void {
  const ch = (appName || '').charAt(0);
  const letter = /[\w\u4e00-\u9fa5]/.test(ch) ? ch.toUpperCase() : 'P';
  const font = /[\u4e00-\u9fa5]/.test(letter) ? 'Microsoft YaHei' : 'Segoe UI';
  const ico = path.join(projDir, 'icon.ico');
  const png = path.join(projDir, 'icon.png');
  const script = [
    "Add-Type -AssemblyName System.Drawing",
    "$size=256; $bmp=New-Object System.Drawing.Bitmap($size,$size)",
    "$g=[System.Drawing.Graphics]::FromImage($bmp)",
    "$g.SmoothingMode='AntiAlias'; $g.TextRenderingHint='AntiAliasGridFit'",
    "$g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))",
    "$r=58; $p=New-Object System.Drawing.Drawing2D.GraphicsPath",
    "$p.AddArc(0,0,$r,$r,180,90); $p.AddArc($size-$r,0,$r,$r,270,90); $p.AddArc($size-$r,$size-$r,$r,$r,0,90); $p.AddArc(0,$size-$r,$r,$r,90,90); $p.CloseFigure()",
    "$b=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,10,10,10)); $g.FillPath($b,$p)",
    "$f=New-Object System.Drawing.Font('" + font + "',140,[System.Drawing.FontStyle]::Bold)",
    "$sf=New-Object System.Drawing.StringFormat; $sf.Alignment='Center'; $sf.LineAlignment='Center'",
    "$w=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)",
    "$rect=New-Object System.Drawing.RectangleF(0,20,$size,$size)",
    "$g.DrawString('" + letter + "',$f,$w,$rect,$sf)",
    "$g.Dispose()",
    "$bmp.Save('" + png + "',[System.Drawing.Imaging.ImageFormat]::Png)",
    "$ico=[System.Drawing.Icon]::FromHandle($bmp.GetHicon())",
    "$fs=[System.IO.File]::Create('" + ico + "'); $ico.Save($fs); $fs.Close(); $ico.Dispose(); $bmp.Dispose()",
  ].join('; ');
  runPowerShell([script], projDir);
}

function buildCSharp(config: BuildConfig, outDir: string): void {
  const projDir = path.resolve(HERE, '../installer');
  const payloadDir = path.join(projDir, 'payload');
  const staging = path.join(projDir, '_stage');

  // 1) manifest
  const manifest = {
    appName: config.appName, version: config.version, publisher: config.publisher,
    exeRelPath: config.exeRelPath.replace(/\//g, '\\'),
    defaultInstallDir: config.defaultInstallDir,
    allowChangeDir: config.allowChangeDir,
    createStartMenu: config.createStartMenu, startMenuName: config.startMenuName,
    createDesktop: config.createDesktop, runAfterInstall: config.runAfterInstall,
    writeRegistry: config.writeRegistry, registryKey: config.registryKey,
    includeLicense: config.includeLicense, licenseText: config.licenseText,
    language: config.language,
  };
  fs.mkdirSync(payloadDir, { recursive: true });
  fs.writeFileSync(path.join(payloadDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // 2) 组装 payload
  rmrf(staging);
  fs.mkdirSync(staging, { recursive: true });

  const exeRel = config.exeRelPath.replace(/[\\/]/g, '/');
  const srcExe = fs.existsSync(config.exeRelPath) ? config.exeRelPath : null;
  const exeSource = srcExe ?? ensureSampleApp();
  const exeDest = path.join(staging, exeRel);
  fs.mkdirSync(path.dirname(exeDest), { recursive: true });
  if (srcExe) fs.copyFileSync(srcExe, exeDest);
  else fs.copyFileSync(exeSource, exeDest);

  for (const f of config.files) {
    const rel = f.relPath.replace(/[\\/]/g, '/');
    if (fs.existsSync(f.relPath)) {
      const dest = path.join(staging, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(f.relPath, dest);
    } else {
      console.warn(`[warn] 跳过不存在的文件：${f.relPath}`);
    }
    if (rel === exeRel) continue;
  }

  // 3) 打包成 app.zip（用 PowerShell Compress-Archive）
  const zipPath = path.join(payloadDir, 'app.zip');
  rmrf(zipPath);
  runPowerShell([
    `Compress-Archive -Force -Path '${path.join(staging, '*')}' -DestinationPath '${zipPath}'`,
  ], projDir);

  // 4) 清理 staging
  rmrf(staging);

  // 5) 生成 Pill 风格图标（应用首字母）
  generateIcon(projDir, config.appName);

  // 6) dotnet publish 出单文件 exe
  const pub = path.join(projDir, '_pub');
  rmrf(pub);
  rmrf(path.join(projDir, 'bin'));
  rmrf(path.join(projDir, 'obj'));
  console.log('[i] 正在用 dotnet publish 编译自研安装器（首次较慢）…');
  sh('dotnet', ['publish', path.join(projDir, 'PillInstaller.csproj'), '-c', 'Release', '-o', pub], projDir);

  const built = path.join(pub, 'PillInstaller.exe');
  if (!fs.existsSync(built)) {
    console.error('[ERROR] 未找到生成的安装器：' + built);
    process.exit(1);
  }

  const outName = `Install-${config.appName.replace(/[^\w\u4e00-\u9fa5.-]/g, '_')}-${config.version}.exe`;
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, outName);
  fs.copyFileSync(built, dest);
  console.log(`[OK] 自研 Pill 安装器已生成：${dest}`);
  console.log('[i] 双击运行即可看到黑白药丸安装界面（需管理员权限）。');
  console.log('[i] 静默安装示例：' + dest + ' /S');
}

function main(): void {
  const args = process.argv.slice(2);
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs(args);
  } catch (e) {
    console.error('[ERROR]', (e as Error).message);
    console.log(HELP);
    process.exit(1);
  }
  if (parsed.help || !parsed.result) {
    console.log(HELP);
    return;
  }
  const { config, outDir, compile: doCompile } = parsed.result;
  console.log(`[i] 应用：${config.appName} ${config.version}（${config.engine} / ${config.uiStyle}）`);
  if (!config.exeRelPath) {
    console.error('[ERROR] 请用 --exe 指定主程序相对路径。');
    process.exit(1);
  }

  if (config.engine === 'csharp') {
    buildCSharp(config, outDir);
    return;
  }

  const files = writeBundle(config, outDir);
  console.log(`[i] 已生成文件到 ${outDir}：`);
  for (const f of files) console.log('    - ' + f);
  if (doCompile) compile(config, outDir);
}

main();
