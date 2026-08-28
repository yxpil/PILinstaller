import React from 'react';
import Icon from '@icons/index';
import PillCard from '@components/ui/PillCard';
import PillSwitch from '@components/ui/PillSwitch';
import PillSelect from '@components/ui/PillSelect';
import PillButton from '@components/ui/PillButton';
import PillBadge from '@components/ui/PillBadge';
import { LICENSE_PRESETS } from '@lib/presets';
import type { BuildConfig } from '@lib/types';

interface Props {
  config: BuildConfig;
  patch: (p: Partial<BuildConfig>) => void;
  notify: (m: string) => void;
}

export const LicenseStep: React.FC<Props> = ({ config, patch, notify }) => {
  const selectPreset = (id: string | number) => {
    const preset = LICENSE_PRESETS.find((p) => p.id === id);
    if (preset) {
      patch({ licenseText: preset.text });
      notify(`已套用「${preset.title}」模板`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PillCard>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon name="shield" size={18}/>
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">许可协议（License）</h3>
            <PillBadge variant={config.includeLicense ? 'pass' : 'muted'} dot>
              {config.includeLicense ? '已启用' : '未启用'}
            </PillBadge>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          安装过程中会展示许可协议，用户须"我同意"才能继续。可套用常用模板或自定义文本。
        </p>
        <div className="mt-4">
          <PillSwitch
            label="在安装界面显示许可协议"
            description="关闭则安装时跳过协议页"
            checked={config.includeLicense}
            onChange={(v) => { patch({ includeLicense: v }); notify(v ? '已启用许可协议' : '已跳过许可协议'); }}
          />
        </div>
      </PillCard>

      {config.includeLicense && (
        <PillCard>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Icon name="book" size={18}/>
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">协议内容</h3>
          </div>

          <div className="mb-4">
            <PillSelect
              label="快速套用模板"
              placeholder="选择一个许可协议模板"
              options={LICENSE_PRESETS.map((p) => ({ value: p.id, label: p.title }))}
              onChange={selectPreset}
            />
          </div>

          <div className="p-field">
            <label className="p-label">协议正文（支持占位符 &lt;PACKAGE_AUTHOR&gt; 自动填充为发布者）</label>
            <textarea
              value={config.licenseText}
              onChange={(e) => patch({ licenseText: e.target.value })}
              spellCheck={false}
              className="w-full min-h-[260px] resize-y rounded-soft border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950
                         px-4 py-3 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 font-mono
                         focus:border-neutral-900 dark:focus:border-neutral-200 focus:ring-4 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/15
                         focus:outline-none transition-all"
              placeholder="粘贴或输入完整的许可协议文本…"
            />
            <span className="p-hint">
              生成时会输出为 license.txt，并与主脚本放在同一目录。当前 {config.licenseText.length} 字符。
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <PillButton
              variant="soft" size="sm"
              leftIcon={<Icon name="check-circle" size={15}/>}
              onClick={() => notify('协议内容已保存')}
            >
              确认保存
            </PillButton>
          </div>
        </PillCard>
      )}
    </div>
  );
};

export default LicenseStep;
