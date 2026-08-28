import React, { useState } from 'react';
import Icon from '@icons/index';
import PillCard from '@components/ui/PillCard';
import PillInput from '@components/ui/PillInput';
import PillButton from '@components/ui/PillButton';
import PillBadge from '@components/ui/PillBadge';
import { FilePicker } from '@components/FilePicker';
import type { BuildConfig } from '@lib/types';

interface Props {
  config: BuildConfig;
  patch: (p: Partial<BuildConfig>) => void;
  notify: (m: string) => void;
}

export const BrandStep: React.FC<Props> = ({ config, patch, notify }) => {
  const [preview, setPreview] = useState<string | null>(config.logoDataUrl);

  const handleLogo = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      patch({ logoName: f.name, logoDataUrl: String(reader.result) });
      notify(`Logo 已加载：${f.name}`);
    };
    reader.readAsDataURL(f);
  };

  const clearLogo = () => {
    setPreview(null);
    patch({ logoName: '', logoDataUrl: null });
    notify('已移除 Logo');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 品牌信息 */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="info" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">品牌信息</h3>
        </div>
        <div className="space-y-4">
          <PillInput
            label="应用名称"
            placeholder="例如：我的应用"
            value={config.appName}
            onChange={(e) => patch({ appName: e.target.value })}
            leftIcon={<Icon name="edit-3" size={15}/>}
          />
          <div className="grid grid-cols-2 gap-4">
            <PillInput
              label="版本号"
              placeholder="1.0.0"
              value={config.version}
              onChange={(e) => patch({ version: e.target.value })}
              leftIcon={<Icon name="hash" size={15}/>}
            />
            <PillInput
              label="发布者"
              placeholder="您的公司"
              value={config.publisher}
              onChange={(e) => patch({ publisher: e.target.value })}
              leftIcon={<Icon name="user" size={15}/>}
            />
          </div>
        </div>
      </PillCard>

      {/* Logo */}
      <PillCard>
        <div className="flex items-center gap-2 mb-4">
          <Icon name="globe" size={18}/>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">Logo / 图标</h3>
          <span className="ml-auto"><PillBadge variant="muted">.ico 最佳</PillBadge></span>
        </div>

        {!preview ? (
          <FilePicker
            title="上传安装程序图标 / Logo"
            hint="推荐 256×256 或 512×512 的 .ico / .png"
            icon="upload"
            accept="image/*"
            onFiles={handleLogo}
          />
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-soft border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center shrink-0">
              <img src={preview} alt="logo" className="max-w-full max-h-full object-contain"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <PillBadge variant="pass" dot>已加载</PillBadge>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-200 mt-2 truncate">{config.logoName}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                NSIS / Inno Setup 的安装图标需为 .ico 文件，若为 .png 请先转换。
              </p>
            </div>
            <div className="shrink-0">
              <PillButton variant="danger" size="sm" leftIcon={<Icon name="trash-2" size={14}/>} onClick={clearLogo}>移除</PillButton>
            </div>
          </div>
        )}
      </PillCard>
    </div>
  );
};

export default BrandStep;
