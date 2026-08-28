import React, { useMemo, useState } from 'react';
import Icon from '@icons/index';
import PillCard from '@components/ui/PillCard';
import PillTabs from '@components/ui/PillTabs';
import PillBadge from '@components/ui/PillBadge';
import { generateBundle } from '@lib/generator';
import { downloadText, escapeWinName } from '@lib/files';
import type { BuildConfig } from '@lib/types';

interface Props {
  config: BuildConfig;
  notify: (m: string) => void;
}

export const GenerateStep: React.FC<Props> = ({ config, notify }) => {
  const [view, setView] = useState<string | number>('script');
  const bundle = useMemo(() => generateBundle(config), [config]);

  const outName = `Install-${escapeWinName(config.appName)}-${config.version}`;

  const dl = (name: string, content: string) => {
    downloadText(name, content);
    notify(`已下载 ${name}`);
  };

  const files: { name: string; content: string; desc: string }[] = [
    { name: bundle.scriptName, content: bundle.script, desc: '安装脚本' },
  ];
  if (bundle.license) files.push({ name: 'license.txt', content: bundle.license, desc: '许可协议' });
  files.push(
    { name: 'build.bat', content: bundle.buildBat, desc: '一键编译 (CMD)' },
    { name: 'build.ps1', content: bundle.buildPs1, desc: '一键编译 (PowerShell)' },
    { name: 'README.md', content: bundle.readme, desc: '使用说明' },
  );

  return (
    <div className="space-y-6">
      <PillCard className="!p-0 overflow-hidden">
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/70 dark:border-neutral-800/70">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-pill bg-neutral-950 text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Icon name="check-circle" size={22}/>
            </span>
            <div>
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">生成完成</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {config.engine === 'nsis' ? 'NSIS' : 'Inno Setup'} · {config.appName} {config.version}
              </p>
            </div>
          </div>
          <PillBadge variant="pass" dot>{outName}.exe</PillBadge>
        </div>

        <div className="px-6 py-5">
          <PillTabs
            value={view}
            onChange={setView}
            size="md"
            items={[
              { key: 'script', label: '脚本预览' },
              { key: 'readme', label: '使用说明' },
            ]}
          />

          {view === 'script' ? (
            <pre className="mt-4 rounded-soft bg-neutral-950 dark:bg-black text-neutral-100 dark:text-neutral-100 
                            border border-neutral-800 p-4 text-xs leading-relaxed max-h-[52vh] overflow-auto font-mono">
{bundle.script}
            </pre>
          ) : (
            <pre className="mt-4 rounded-soft bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200
                            border border-neutral-200/70 dark:border-neutral-800 p-4 text-xs leading-relaxed max-h-[52vh] overflow-auto font-mono whitespace-pre-wrap">
{bundle.readme}
            </pre>
          )}
        </div>
      </PillCard>

      {/* 下载 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="download" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">下载打包文件</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => dl(f.name, f.content)}
              className="group flex items-center gap-3 rounded-soft border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-950
                         px-4 py-3 text-left hover:border-neutral-900 dark:hover:border-neutral-200 hover:shadow-card transition-all"
            >
              <span className="w-9 h-9 rounded-pill bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:bg-neutral-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                <Icon name="file-text" size={16}/>
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{f.name}</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{f.desc}</div>
              </div>
              <span className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                <Icon name="download" size={16}/>
              </span>
            </button>
          ))}
        </div>
      </PillCard>

      {/* 静默安装速查 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="terminal" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">静默部署速查</h3>
          <span className="ml-auto"><PillBadge variant="muted">静默安装</PillBadge></span>
        </div>
        <div className="rounded-soft bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 px-5 py-4 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
          {config.engine === 'inno' ? (
            <code>{outName}.exe /VERYSILENT /SUPPRESSMSGBOXES /DIR="{`%ProgramFiles%\\${config.appName}`}"</code>
          ) : (
            <code>{outName}.exe /S /D={`%ProgramFiles%\\${config.appName}`}</code>
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
          {config.engine === 'inno'
            ? '更多参数：/SILENT、/DIR=、/TASKS="desktopicon"、/LANG=english、卸载时 unins000.exe /VERYSILENT。'
            : '更多参数：/S 静默、/D=目录（放末尾、不加引号）、卸载时 uninstall.exe /S。'}
        </p>
      </PillCard>
    </div>
  );
};

export default GenerateStep;
