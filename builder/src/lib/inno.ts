import type { BuildConfig } from './types';
import { generatePillCode } from './pillWizard';

function dirOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i === -1 ? '.' : p.slice(0, i);
}

function fileNameOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i === -1 ? p : p.slice(i + 1);
}

function safeName(v: string): string {
  return v.replace(/[^\w\u4e00-\u9fa5.-]/g, '');
}

function norm(p: string): string {
  return p.replace(/\//g, '\\');
}

/** 将 NSIS 风格默认目录转为 Inno {autopf} 风格 */
function toInnoDir(dir: string, appName: string): string {
  const d = (dir || '').trim();
  if (d.toLowerCase().includes('programfiles64')) return `{autopf}\\${appName}`;
  if (d.toLowerCase().includes('programfiles')) return `{autopf}\\${appName}`;
  if (d.toLowerCase().includes('localappdata')) return `{localappdata}\\${appName}`;
  if (d.toLowerCase().includes('appdata')) return `{userappdata}\\${appName}`;
  return d || `{autopf}\\${appName}`;
}

function langLines(cfg: BuildConfig): string[] {
  const zh = 'Name: "chinesesimplified"; MessagesFile: "compiler:Languages\\ChineseSimplified.isl"';
  const en = 'Name: "english"; MessagesFile: "compiler:Default.isl"';
  if (cfg.language === 'both') return [zh, en];
  if (cfg.language === 'en') return [en];
  return [zh];
}

/**
 * 生成 Inno Setup 安装脚本（.iss）
 * 支持命令行参数：
 *   /SILENT、/VERYSILENT、/SUPPRESSMSGBOXES     静默安装
 *   /DIR="x:\path"                             指定安装目录
 *   /TASKS="desktopicon"                       指定任务
 *   /LANG=chinesesimplified|english            指定语言
 */
export function generateInno(cfg: BuildConfig): string {
  const appName = cfg.appName || 'MyApp';
  const appVersion = cfg.version || '1.0.0';
  const publisher = cfg.publisher || 'Unknown';
  const exeRel = norm(cfg.exeRelPath);
  const exeName = fileNameOf(exeRel);
  const startMenu = cfg.startMenuName || appName;
  const regRoot = 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\' + safeName(appName);
  const defaultDir = toInnoDir(cfg.defaultInstallDir, appName);

  const files: string[] = [];
  const seen = new Set<string>([exeRel.toUpperCase()]);
  files.push(`Source: "${exeRel}"; DestDir: "{app}\\${dirOf(exeRel) === '.' ? '' : dirOf(exeRel)}"; Flags: ignoreversion`);
  for (const f of cfg.files) {
    const rel = norm(f.relPath);
    if (seen.has(rel.toUpperCase())) continue;
    seen.add(rel.toUpperCase());
    const d = dirOf(rel) === '.' ? '' : dirOf(rel);
    files.push(`Source: "${rel}"; DestDir: "{app}\\${d}"; Flags: ignoreversion`);
  }

  const icons: string[] = [];
  if (cfg.createStartMenu) {
    icons.push(`Name: "{group}\\${appName}"; Filename: "{app}\\${exeName}"`);
    icons.push(`Name: "{group}\\卸载 ${appName}"; Filename: "{uninstallexe}"`);
  }
  if (cfg.createDesktop) {
    icons.push(`Name: "{autodesktop}\\${appName}"; Filename: "{app}\\${exeName}"; Tasks: desktopicon`);
  }

  const runStep = cfg.runAfterInstall
    ? `[Run]
Filename: "{app}\\${exeName}"; Description: "启动 \\"${appName}\\""; Flags: nowait postinstall skipifsilent`
    : '';

  const languageBlock = `[Languages]\n${langLines(cfg).join('\n')}`;

  const regSection = cfg.writeRegistry
    ? `[Registry]
; 卸载项（控制面板"程序和功能"）
Root: HKLM; Subkey: "${regRoot}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "DisplayName"; ValueData: "${appName}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "${appVersion}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "Publisher"; ValueData: "${publisher}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "DisplayIcon"; ValueData: "{app}\\${exeName}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "UninstallString"; ValueData: "{uninstallexe}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: string; ValueName: "InstallLocation"; ValueData: "{app}"
Root: HKLM; Subkey: "${regRoot}"; ValueType: DWORD; ValueName: "NoModify"; ValueData: "1"
Root: HKLM; Subkey: "${regRoot}"; ValueType: DWORD; ValueName: "NoRepair"; ValueData: "1"

; 自定义应用键（按需放开）
; Root: HKLM; Subkey: "Software\\${safeName(appName)}"; ValueType: string; ValueName: "InstallDir"; ValueData: "{app}"; Flags: uninsdeletekey

`
    : '';

  const tasksBlock = cfg.createDesktop
    ? `[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:"; Flags: unchecked`
    : '';

  const codeSection = cfg.uiStyle === 'pill' ? '\n' + generatePillCode(cfg) : '';

  return `; ============================================================
;  ${appName} ${appVersion} 安装程序
;  由 Pill Installer Builder 生成
;  编译：ISCC.exe 本脚本.iss
;  命令行参数：
;    /SILENT             静默安装（不反馈）
;    /VERYSILENT         静默安装（连进度都不显示）
;    /SUPPRESSMSGBOXES   抑制消息框
;    /DIR="x:\\path"     指定安装目录
;    /TASKS="desktopicon" 指定任务
;    /LANG=chinesesimplified|english 指定语言
; ============================================================
[Setup]
AppId={{PILLBUILDER-${safeName(appName)}-${appVersion}}
AppName=${appName}
AppVersion=${appVersion}
AppPublisher=${publisher}
AppPublisherURL=https://example.com
DefaultDirName=${defaultDir}
DefaultGroupName=${startMenu}
OutputBaseFilename=Install-${safeName(appName)}-${appVersion}
Compression=lzma2
SolidCompression=yes
${cfg.logoName ? `SetupIconFile=${cfg.logoName}
` : ''}${cfg.includeLicense ? `LicenseFile=license.txt
` : ''}DisableProgramGroupPage=yes
PrivilegesRequired=admin
UsePreviousAppDir=yes
ArchitecturesInstallIn64BitMode=x64compatible
${cfg.uiStyle === 'pill' ? `WizardStyle=modern
WizardResizable=no
` : ''}

${languageBlock}
${tasksBlock}
[Files]
${files.join('\n')}
${icons.length ? `[Icons]
${icons.join('\n')}
` : ''}${runStep}
${regSection}${codeSection}`;
}
