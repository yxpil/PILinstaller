import type { BuildConfig } from './types';

/** 去掉路径中的文件名，只保留目录部分；无目录时返回 '.' */
function dirOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i === -1 ? '.' : p.slice(0, i);
}

function fileNameOf(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i === -1 ? p : p.slice(i + 1);
}

function safeDefine(v: string): string {
  return v.replace(/[^\w\u4e00-\u9fa5.-]/g, '');
}

function winPath(p: string): string {
  return p.replace(/\//g, '\\');
}

function langInsert(cfg: BuildConfig): string {
  if (cfg.language === 'both') {
    return '!insertmacro MUI_LANGUAGE "SimpChinese"\n!insertmacro MUI_LANGUAGE "English"';
  }
  if (cfg.language === 'en') {
    return '!insertmacro MUI_LANGUAGE "English"';
  }
  return '!insertmacro MUI_LANGUAGE "SimpChinese"';
}

/**
 * 生成 NSIS 安装脚本（.nsi）
 * 支持命令行参数：/S（静默安装）、/D=<路径>（自定义安装目录）
 */
export function generateNsis(cfg: BuildConfig): string {
  const appName = cfg.appName || 'MyApp';
  const appVersion = cfg.version || '1.0.0';
  const publisher = cfg.publisher || 'Unknown';
  const exeRel = winPath(cfg.exeRelPath);
  const exeName = fileNameOf(exeRel);
  const exeDir = winPath(dirOf(exeRel));
  const startMenu = cfg.startMenuName || appName;
  let regKey = (cfg.registryKey || '').trim() || safeDefine(appName);
  if (!/^software\\/i.test(regKey)) regKey = 'Software\\' + regKey;
  const uninstKey = regKey.split('\\').pop() || safeDefine(appName);
  const defaultDir = cfg.defaultInstallDir || '$PROGRAMFILES64\\' + appName;

  const licenseBlock = cfg.includeLicense ? '!insertmacro MUI_PAGE_LICENSE "license.txt"\n' : '';
  const dirBlock = cfg.allowChangeDir ? '!insertmacro MUI_PAGE_DIRECTORY\n' : '';

  // 除主程序外的打包文件清单
  const fileLines: string[] = [];
  const seen = new Set<string>([exeRel.toUpperCase()]);
  for (const f of cfg.files) {
    const rel = winPath(f.relPath);
    if (seen.has(rel.toUpperCase())) continue;
    seen.add(rel.toUpperCase());
    const d = winPath(dirOf(rel));
    fileLines.push(`  SetOutPath "$INSTDIR\\${d === '.' ? '' : d}"`);
    fileLines.push(`  File "${rel}"`);
  }

  // 快捷方式
  const shortcutLines: string[] = [];
  if (cfg.createStartMenu) {
    shortcutLines.push(`  CreateDirectory "$SMPROGRAMS\\${startMenu}"`);
    shortcutLines.push(`  CreateShortCut "$SMPROGRAMS\\${startMenu}\\${appName}.lnk" "$INSTDIR\\${exeName}"`);
    shortcutLines.push(`  CreateShortCut "$SMPROGRAMS\\${startMenu}\\卸载 ${appName}.lnk" "$INSTDIR\\uninstall.exe"`);
  }
  if (cfg.createDesktop) {
    shortcutLines.push(`  CreateShortCut "$DESKTOP\\${appName}.lnk" "$INSTDIR\\${exeName}"`);
  }

  // 注册表
  let regLines = '';
  if (cfg.writeRegistry) {
    regLines = `
  ; ---- 注册表 ----
  WriteRegStr HKLM "${regKey}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "${regKey}" "DisplayName" "${appName}"
  WriteRegStr HKLM "${regKey}" "DisplayVersion" "${appVersion}"
  WriteRegStr HKLM "${regKey}" "Publisher" "${publisher}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "DisplayName" "${appName}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "DisplayVersion" "${appVersion}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "Publisher" "${publisher}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "DisplayIcon" "$INSTDIR\\${exeName}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "UninstallString" '"$INSTDIR\\uninstall.exe"'
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "NoModify" 1
  WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}" "NoRepair" 1`;
  }

  const runAfter = cfg.runAfterInstall
    ? `\n  ; ---- 运行安装后的程序 ----\n  ExecShell "open" "$INSTDIR\\${exeName}"`
    : '';

  return `; ============================================================
;  ${appName} ${appVersion} 安装程序
;  由 Pill Installer Builder 生成
;  编译：makensis 本脚本.nsi
;  命令行参数：
;    /S            静默安装（无界面）
;    /D=<路径>      指定安装目录（必须放在参数最后，且不加引号）
; ============================================================
Unicode true
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!define APP_NAME      "${appName}"
!define APP_VERSION   "${appVersion}"
!define APP_PUBLISHER "${publisher}"
!define APP_EXE       "${exeName}"
!define APP_REG_KEY   "${regKey}"
${cfg.logoName ? `!define MUI_ICON "${cfg.logoName}"
` : ''}!define MUI_ABORTWARNING

Name "${appName} ${appVersion}"
OutFile "Install-${safeDefine(appName)}-${appVersion}.exe"
InstallDir "${defaultDir}"
InstallDirRegKey HKLM "${regKey}" "InstallDir"
${cfg.uiStyle === 'pill' ? `
; ---- Pill 主题（纯黑白） ----
!define MUI_BGCOLOR "FFFFFF"
!define MUI_TEXTCOLOR "18181B"
BrandingText "${appName} ${appVersion}"
` : ''}; ---- 静默安装 ----
; 支持 NSIS 内置参数：/S 直接静默，/D=<目录> 指定安装位置
SilentInstall normal
; 若希望安装包"始终静默"，可改为： SilentInstall silent

${cfg.runAfterInstall ? `!define MUI_FINISHPAGE_RUN "$INSTDIR\\${exeName}"
!define MUI_FINISHPAGE_RUN_TEXT "运行 ${appName}"
` : ''}!insertmacro MUI_PAGE_WELCOME
${licenseBlock}${dirBlock}!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
${langInsert(cfg)}

; ============================================================
;  安装主段
; ============================================================
Section "核心组件"
  SetOutPath "$INSTDIR\\${exeDir === '.' ? '' : exeDir}"
  File "${exeRel}"
${fileLines.join('\n')}
  WriteUninstaller "$INSTDIR\\uninstall.exe"
${shortcutLines.join('\n')}${regLines}${runAfter}
SectionEnd

; ============================================================
;  卸载段
; ============================================================
Section "Uninstall"
  Delete "$INSTDIR\\uninstall.exe"
${cfg.createStartMenu ? `  Delete "$SMPROGRAMS\\${startMenu}\\${appName}.lnk"
  Delete "$SMPROGRAMS\\${startMenu}\\卸载 ${appName}.lnk"
  RMDir "$SMPROGRAMS\\${startMenu}"
` : ''}${cfg.createDesktop ? `  Delete "$DESKTOP\\${appName}.lnk"
` : ''}  ; ---- 删除已安装文件 ----
  Delete "$INSTDIR\\${exeName}"
${cfg.files.map((f) => `  Delete "$INSTDIR\\${winPath(f.relPath)}"`).join('\n')}
  RMDir /r "$INSTDIR"
${cfg.writeRegistry ? `
  ; ---- 清理注册表 ----
  DeleteRegKey HKLM "${regKey}"
  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${uninstKey}"
` : ''}SectionEnd
`;
}
