export type InstallEngine = 'nsis' | 'inno' | 'csharp';
export type InstallLang = 'zh' | 'en' | 'both';
export type UiStyle = 'default' | 'pill';

/** 被打包的单个文件/目录项 */
export interface BuildFile {
  /** 相对脚本目录的路径，例如 "release\\app.exe" 或 "release\\lib\\foo.dll" */
  relPath: string;
  /** 文件名（不含目录） */
  name: string;
  /** 字节大小（仅用于展示） */
  size: number;
}

export interface BuildConfig {
  engine: InstallEngine;

  /* 品牌信息 */
  appName: string;
  version: string;
  publisher: string;

  /* 程序文件 */
  exeRelPath: string;      // 主程序相对路径，例如 "release\\app.exe"
  files: BuildFile[];      // 除主程序外的相关文件

  /* 许可协议 */
  includeLicense: boolean;
  licenseText: string;

  /* Logo */
  logoName: string;        // 图标文件名，例如 "logo.ico"
  logoDataUrl: string | null;

  /* 安装选项 */
  defaultInstallDir: string;  // 例如 "$PROGRAMFILES64\\我的应用"
  allowChangeDir: boolean;
  createStartMenu: boolean;
  startMenuName: string;
  createDesktop: boolean;
  runAfterInstall: boolean;
  writeRegistry: boolean;
  registryKey: string;        // 例如 "Software\\我的应用"

  /* 静默安装 */
  silentMode: boolean;

  /* 界面风格 */
  uiStyle: UiStyle;

  /* 语言 */
  language: InstallLang;
}
