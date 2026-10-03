import { describe, it, expect } from 'vitest';
import { generateInno } from '../../src/lib/inno';
import type { BuildConfig } from '../../src/lib/types';

function cfg(over: Partial<BuildConfig> = {}): BuildConfig {
  return {
    engine: 'inno',
    appName: 'DemoApp',
    version: '1.2.3',
    publisher: 'Acme',
    exeRelPath: 'release\\app.exe',
    files: [
      { relPath: 'release\\lib\\foo.dll', name: 'foo.dll', size: 100 },
    ],
    includeLicense: false,
    licenseText: '',
    logoName: '',
    logoDataUrl: null,
    defaultInstallDir: '$PROGRAMFILES64',
    allowChangeDir: true,
    createStartMenu: true,
    startMenuName: 'DemoApp',
    createDesktop: true,
    runAfterInstall: false,
    writeRegistry: true,
    registryKey: '',
    silentMode: false,
    uiStyle: 'default',
    language: 'zh',
    ...over,
  };
}

describe('generateInno 脚本生成', () => {
  it('生成包含核心段与主文件', () => {
    const out = generateInno(cfg());
    expect(out).toContain('[Setup]');
    expect(out).toContain('[Files]');
    expect(out).toContain('release\\app.exe');
    expect(out).toContain('release\\lib\\foo.dll');
  });

  it('programfiles64 默认目录映射到 {autopf}', () => {
    const out = generateInno(cfg({ defaultInstallDir: '$PROGRAMFILES64\\DemoApp' }));
    expect(out).toContain('DefaultDirName={autopf}');
  });

  it('主程序文件去重（不重复列入）', () => {
    const out = generateInno(cfg({ files: [{ relPath: 'release\\app.exe', name: 'app.exe', size: 1 }] }));
    expect(out.match(/app\.exe/g)?.length).toBeGreaterThanOrEqual(1);
    // [Files] 段里 app.exe 只出现一次
    const filesSec = out.split('[Files]')[1];
    expect(filesSec.split('release\\app.exe').length - 1).toBe(1);
  });

  it('双语言生成两条 Languages', () => {
    const out = generateInno(cfg({ language: 'both' }));
    expect(out).toContain('chinesesimplified');
    expect(out).toContain('english');
  });
});

describe('generateInno 注入防护', () => {
  it('safeName 清洗后 AppId/卸载键不含危险字符', () => {
    const evil = 'Evil"; Run: "cmd';
    const out = generateInno(cfg({ appName: evil }));
    // AppId / OutputBaseFilename / regRoot 都走 safeName，应剔除引号/冒号/分号
    const appId = out.match(/AppId=\{PILLBUILDER-(.+?)-/)?.[1] ?? '';
    expect(appId).not.toMatch(/["';:\\]/);
    expect(out).toContain('Uninstall\\EvilRuncmd');
  });

  it('文件相对路径被原样保留进 Source 行（路径透传行为有据可查）', () => {
    const out = generateInno(cfg({ files: [{ relPath: '..\\..\\windows\\system32\\x.dll', name: 'x.dll', size: 1 }] }));
    // relPath 原样进入 Source 与 DestDir
    expect(out).toContain('Source: "..\\..\\windows\\system32\\x.dll"');
    expect(out).toContain('{app}\\..\\..\\windows\\system32');
  });
});
