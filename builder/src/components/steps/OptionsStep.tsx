import React from 'react';
import Icon from '@icons/index';
import PillCard from '@components/ui/PillCard';
import PillTabs from '@components/ui/PillTabs';
import PillInput from '@components/ui/PillInput';
import PillSwitch from '@components/ui/PillSwitch';
import PillBadge from '@components/ui/PillBadge';
import type { BuildConfig, InstallEngine, InstallLang, UiStyle } from '@lib/types';

interface Props {
  config: BuildConfig;
  patch: (p: Partial<BuildConfig>) => void;
  notify: (m: string) => void;
}

export const OptionsStep: React.FC<Props> = ({ config, patch, notify }) => {
  const changeEngine = (v: string | number) => {
    const eng = v as InstallEngine;
    let dir = config.defaultInstallDir;
    if (eng === 'inno' && dir.includes('$PROGRAMFILES64')) dir = `{autopf}\\${config.appName}`;
    if (eng === 'nsis' && dir.startsWith('{autopf}')) dir = `$PROGRAMFILES64\\${config.appName}`;
    patch({ engine: eng, defaultInstallDir: dir });
    notify(`切换为 ${eng === 'inno' ? 'Inno Setup' : 'NSIS'} 引擎`);
  };

  const changeStyle = (v: string | number) => patch({ uiStyle: v as UiStyle });

  const changeLang = (v: string | number) => patch({ language: v as InstallLang });

  return (
    <div className="space-y-6">
      {/* 引擎 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="zap" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">安装引擎</h3>
        </div>
        <PillTabs
          value={config.engine}
          onChange={changeEngine}
          size="lg"
          items={[
            { key: 'nsis', label: 'NSIS', badge: '/S 静默' },
            { key: 'inno', label: 'Inno Setup', badge: '/SILENT' },
          ]}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
          {config.engine === 'nsis'
            ? '轻量、单一 .exe，兼容 NSIS 命令参数（/S、/D=目录）。需安装 NSIS + makensis。'
            : '功能全、标准卸载、通用企业部署，兼容 Inno 命令参数（/SILENT、/DIR=、/TASKS=）。需安装 Inno Setup 6。'}
        </p>
      </PillCard>

      {/* 界面风格 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="moon" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">安装界面风格</h3>
          <span className="ml-auto"><PillBadge variant="muted">延续 Pill 设计</PillBadge></span>
        </div>
        <PillTabs
          value={config.uiStyle}
          onChange={changeStyle}
          size="lg"
          items={[
            { key: 'pill', label: 'Pill 黑白向导' },
            { key: 'default', label: '系统默认' },
          ]}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
          {config.uiStyle === 'pill'
            ? '完全重做安装向导：无边框圆角窗口 + 黑色品牌栏 + 药丸按钮 + 纯黑白。完整自定义基于 Inno Setup；若选 NSIS 则仅注入黑白配色。'
            : '使用安装引擎的向导界面（NSIS 默认 / Inno 默认）。'}
        </p>
      </PillCard>

      {/* 安装目录 */}
      <PillCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="folder" size={18}/>
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">安装位置</h3>
          </div>
          <PillSwitch
            label="允许用户更改目录"
            checked={config.allowChangeDir}
            onChange={(v) => patch({ allowChangeDir: v })}
          />
        </div>
        <PillInput
          label="默认安装目录"
          value={config.defaultInstallDir}
          onChange={(e) => patch({ defaultInstallDir: e.target.value })}
          leftIcon={<Icon name="folder" size={15}/>}
        />
        <span className="p-hint">
          {config.engine === 'nsis'
            ? 'NSIS 写法：$PROGRAMFILES64\\应用名（可用 $LOCALAPPDATA、$APPDATA 等）。'
            : 'Inno 写法：{autopf}\\应用名（可用 {localappdata}、{userappdata} 等）。'}
        </span>
      </PillCard>

      {/* 快捷方式 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="list" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">快捷方式</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <PillSwitch
              label="开始菜单快捷方式"
              checked={config.createStartMenu}
              onChange={(v) => patch({ createStartMenu: v })}
            />
            {config.createStartMenu && (
              <PillInput
                label="开始菜单文件夹名"
                value={config.startMenuName}
                onChange={(e) => patch({ startMenuName: e.target.value })}
                leftIcon={<Icon name="menu" size={15}/>}
              />
            )}
          </div>
          <div className="space-y-4">
            <PillSwitch
              label="桌面快捷方式"
              description="安装后创建桌面图标"
              checked={config.createDesktop}
              onChange={(v) => patch({ createDesktop: v })}
            />
            <PillSwitch
              label="安装完成后运行"
              checked={config.runAfterInstall}
              onChange={(v) => patch({ runAfterInstall: v })}
            />
          </div>
        </div>
      </PillCard>

      {/* 高级 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="settings" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">高级选项</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <PillSwitch
              label="写入注册表（卸载项）"
              description={'在"程序和功能"中可见并支持卸载'}
              checked={config.writeRegistry}
              onChange={(v) => patch({ writeRegistry: v })}
            />
            {config.writeRegistry && (
              <PillInput
                label="注册表键名"
                value={config.registryKey}
                onChange={(e) => patch({ registryKey: e.target.value })}
                leftIcon={<Icon name="key" size={15}/>}
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">安装界面语言</span>
              <span className="ml-auto"><PillBadge variant="muted">UI 语言</PillBadge></span>
            </div>
            <PillTabs
              value={config.language}
              onChange={changeLang}
              size="md"
              items={[
                { key: 'zh', label: '简体中文' },
                { key: 'en', label: 'English' },
                { key: 'both', label: '中 / 英' },
              ]}
            />
            <div className="rounded-soft bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon name="shield-alert" size={15} className="text-neutral-500"/>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">静默安装支持</span>
                <span className="ml-auto"><PillBadge variant="pass">{config.engine === 'nsis' ? '/S' : '/SILENT'} 已启用</PillBadge></span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                {config.engine === 'nsis'
                  ? '安装时追加 /S 即可静默，/D=目录 指定安装位置；卸载时 use uninstall.exe /S。'
                  : '安装时追加 /VERYSILENT 即可完全静默，支持 /DIR=、/TASKS=、/LANG= 等参数。'}
              </p>
            </div>
          </div>
        </div>
      </PillCard>
    </div>
  );
};

export default OptionsStep;
