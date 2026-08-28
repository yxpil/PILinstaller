import type { BuildConfig } from './types';
import { generateNsis } from './nsis';
import { generateInno } from './inno';
import { fillTemplate } from './presets';

export interface GeneratedBundle {
  engine: 'nsis' | 'inno';
  scriptName: string;
  script: string;
  license: string | null;
  buildBat: string;
  buildPs1: string;
  readme: string;
}

function buildHelper(cfg: BuildConfig): { bat: string; ps1: string } {
  if (cfg.engine === 'inno') {
    return {
      bat: `@echo off
setlocal
set "ISCC=%ProgramFiles(x86)%\\Inno Setup 6\\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\\Inno Setup 6\\ISCC.exe"
if not exist "%ISCC%" (
  echo [ERROR] 未找到 Inno Setup 6，请安装后重试（https://jrsoftware.org/isdl.php）
  exit /b 1
)
echo [i] 正在编译 Inno Setup 安装包 ...
"%ISCC%" "%INNO_SCRIPT%"
if errorlevel 1 (
  echo [ERROR] 编译失败
  exit /b 1
)
echo [OK] 安装包已生成到 Output 目录
endlocal
`,
      ps1: `# PowerShell 编译脚本
$iscc = @(
  "\${env:ProgramFiles(x86)}\\Inno Setup 6\\ISCC.exe",
  "\${env:ProgramFiles}\\Inno Setup 6\\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { Write-Host "[ERROR] 未找到 Inno Setup 6" -ForegroundColor Red; exit 1 }
Write-Host "[i] 正在编译 Inno Setup 安装包 ..."
& $iscc "install.iss"
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] 编译失败" -ForegroundColor Red; exit 1 }
Write-Host "[OK] 安装包已生成到 Output 目录" -ForegroundColor Green
`,
    };
  }
  return {
    bat: `@echo off
setlocal
where makensis >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 makensis，请安装 NSIS 并加入 PATH（https://nsis.sourceforge.io/Download）
  exit /b 1
)
echo [i] 正在编译 NSIS 安装包 ...
makensis "install.nsi"
if errorlevel 1 (
  echo [ERROR] 编译失败
  exit /b 1
)
echo [OK] 安装包已生成
endlocal
`,
    ps1: `# PowerShell 编译脚本
if (-not (Get-Command makensis -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] 未找到 makensis，请安装 NSIS 并加入 PATH" -ForegroundColor Red
  exit 1
}
Write-Host "[i] 正在编译 NSIS 安装包 ..."
makensis "install.nsi"
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] 编译失败" -ForegroundColor Red; exit 1 }
Write-Host "[OK] 安装包已生成" -ForegroundColor Green
`,
  };
}

function buildReadme(cfg: BuildConfig): string {
  const engine = cfg.engine;
  const silentParams = engine === 'inno'
    ? `安装包     /SILENT /VERYSILENT /SUPPRESSMSGBOXES
指定目录   /DIR="D:\\MyFolder"
指定任务   /TASKS="desktopicon"
指定语言   /LANG=chinesesimplified /LANG=english
静默卸载   unins000.exe /VERYSILENT`
    : `静默安装   /S
指定目录   /D=D:\\MyFolder   （放在参数末尾，不加引号）
静默卸载   uninstall.exe /S`;

  return `# ${cfg.appName} 安装包使用说明

## 1. 目录结构
把以下文件放在同一目录，并确保 ${engine === 'nsis' ? '程序文件' : '程序文件'} 位于脚本引用的相对路径（如 ${cfg.exeRelPath}）：

  install.${engine === 'nsis' ? 'nsi' : 'iss'}       生成好的安装脚本
${cfg.includeLicense ? `  license.txt              许可协议（由构建器生成）\n` : ''}${cfg.logoName ? `  ${cfg.logoName}            安装程序图标\n` : ''}  <你的程序文件>         主程序与相关文件

## 2. 编译
方式一：双击 build.bat（Windows）
方式二：命令行
  ${engine === 'inno' ? 'ISCC.exe install.iss' : 'makensis install.nsi'}

## 3. 静默安装与命令行参数
${engine === 'inno' ? '（Inno Setup 6）' : '（NSIS 3.0）'} 安装程序支持以下参数：

${silentParams}

## 4. 静默部署示例
${engine === 'inno'
  ? `Install-${cfg.appName}-${cfg.version}.exe /VERYSILENT /SUPPRESSMSGBOXES /DIR="%ProgramFiles%\\${cfg.appName}"`
  : `Install-${cfg.appName}-${cfg.version}.exe /S /D=%ProgramFiles%\\${cfg.appName}`}

## 5. 注意
- ${engine === 'inno' ? 'LicneseFile 引用的 license.txt 需与 .iss 同目录。' : 'MUI_PAGE_LICENSE 引用的 license.txt 需与 .nsi 同目录。'}
- 安装程序默认写入注册表卸载项，便于"程序和功能"卸载。
`;
}

export function generateBundle(cfg: BuildConfig): GeneratedBundle {
  const { bat, ps1 } = buildHelper(cfg);
  const script = cfg.engine === 'inno' ? generateInno(cfg) : generateNsis(cfg);
  const license = cfg.includeLicense
    ? fillTemplate(
        (cfg.licenseText || '').trim()
          || '本软件按"现状"提供，不提供任何明示或暗示的担保。\n安装并使用本软件即表示您已阅读并接受本许可协议。',
        cfg.publisher,
      )
    : null;

  const scriptName = cfg.engine === 'inno' ? 'install.iss' : 'install.nsi';

  return {
    engine: cfg.engine,
    scriptName,
    script,
    license,
    buildBat: bat.replace('%INNO_SCRIPT%', scriptName),
    buildPs1: ps1,
    readme: buildReadme(cfg),
  };
}

export function defaultConfig(): BuildConfig {
  return {
    engine: 'nsis',
    appName: '我的应用',
    version: '1.0.0',
    publisher: '我的公司',
    exeRelPath: 'release\\app.exe',
    files: [],
    includeLicense: true,
    licenseText: '',
    logoName: '',
    logoDataUrl: null,
    defaultInstallDir: '$PROGRAMFILES64\\我的应用',
    allowChangeDir: true,
    createStartMenu: true,
    startMenuName: '我的应用',
    createDesktop: true,
    runAfterInstall: false,
    writeRegistry: true,
    registryKey: 'Software\\我的应用',
    silentMode: true,
    uiStyle: 'pill',
    language: 'zh',
  };
}
