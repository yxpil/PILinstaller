import React from 'react';
import Icon from '@icons/index';
import PillCard from '@components/ui/PillCard';
import PillBadge from '@components/ui/PillBadge';
import { FilePicker } from '@components/FilePicker';
import { formatSize } from '@lib/files';
import type { BuildConfig, BuildFile } from '@lib/types';

interface Props {
  config: BuildConfig;
  patch: (p: Partial<BuildConfig>) => void;
  notify: (m: string) => void;
}

const relOf = (f: File): string => (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;

export const ProgramFilesStep: React.FC<Props> = ({ config, patch, notify }) => {
  const handleExe = (files: File[]) => {
    if (!files.length) return;
    const f = files[0];
    const rel = relOf(f);
    // 去重：若已在相关文件列表，移除
    const filesCleaned = config.files.filter((x) => x.relPath !== rel);
    patch({ exeRelPath: rel, files: filesCleaned });
    notify(`已设置主程序：${rel}`);
  };

  const handleFiles = (files: File[]) => {
    if (!files.length) return;
    const exeRel = config.exeRelPath.toUpperCase();
    const existing = new Set(config.files.map((x) => x.relPath.toUpperCase()));
    const add: BuildFile[] = [];
    for (const f of files) {
      const rel = relOf(f);
      if (!rel) continue;
      const key = rel.toUpperCase();
      if (key === exeRel || existing.has(key)) continue;
      existing.add(key);
      add.push({ relPath: rel, name: rel.split(/[\\/]/).pop() || rel, size: f.size });
    }
    if (add.length) {
      patch({ files: [...config.files, ...add] });
      notify(`已添加 ${add.length} 个文件/目录项`);
    } else {
      notify('未添加新文件（可能与主程序或已有项重复）');
    }
  };

  const removeFile = (rel: string) => patch({ files: config.files.filter((x) => x.relPath !== rel) });

  const totalSize = config.files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 主程序 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="play" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">主程序</h3>
          <span className="ml-auto"><PillBadge variant="pass" dot>exe / 入口</PillBadge></span>
        </div>
        <FilePicker
          title="选择主程序（.exe）"
          hint="安装后会在这里生成启动入口 & 卸载入口"
          icon="terminal"
          onFiles={handleExe}
        />
        {config.exeRelPath && (
          <div className="mt-4 flex items-center gap-2 rounded-pill bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-2.5">
            <Icon name="file-text" size={15} className="text-neutral-500"/>
            <span className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100 font-medium">{config.exeRelPath}</span>
            <button
              type="button"
              onClick={() => { patch({ exeRelPath: '' }); notify('已移除主程序'); }}
              className="rounded-full p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <Icon name="x" size={14}/>
            </button>
          </div>
        )}
      </PillCard>

      {/* 相关文件 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="layers" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">相关文件 / 目录</h3>
          <span className="ml-auto">
            <PillBadge variant="muted">{config.files.length} 项</PillBadge>
          </span>
        </div>
        <FilePicker
          title="选择相关文件或整个文件夹"
          hint="支持拖拽文件夹（自动保留相对目录结构）"
          icon="folder"
          multiple
          directory
          onFiles={handleFiles}
        />
        <div className="mt-4 space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {config.files.length === 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">暂未添加相关文件</p>
          )}
          {config.files.map((f) => (
            <div key={f.relPath} className="flex items-center gap-2 rounded-pill bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800 px-3 py-2">
              <Icon name="file-text" size={14} className="text-neutral-500 shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm text-neutral-900 dark:text-neutral-100">{f.name}</div>
                <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{f.relPath} · {formatSize(f.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.relPath)}
                className="rounded-full p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors shrink-0"
              >
                <Icon name="x" size={13}/>
              </button>
            </div>
          ))}
        </div>
        {config.files.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>合计 {formatSize(totalSize)}（不含主程序）</span>
            <button type="button" onClick={() => patch({ files: [] })} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">清空列表</button>
          </div>
        )}
      </PillCard>
    </div>
  );
};

export default ProgramFilesStep;
