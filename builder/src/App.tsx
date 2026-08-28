import { useEffect, useMemo, useState } from 'react';
import { cn } from '@utils/cn';
import Icon, { type IconName } from '@icons/index';
import PillButton from '@components/ui/PillButton';
import PillTabs from '@components/ui/PillTabs';
import PillToast from '@components/ui/PillToast';
import { ProgramFilesStep } from '@components/steps/ProgramFilesStep';
import { LicenseStep } from '@components/steps/LicenseStep';
import { BrandStep } from '@components/steps/BrandStep';
import { OptionsStep } from '@components/steps/OptionsStep';
import { GenerateStep } from '@components/steps/GenerateStep';
import { defaultConfig } from '@lib/generator';
import type { BuildConfig } from '@lib/types';

interface StepMeta { key: string; title: string; desc: string; icon: IconName; }

const STEPS: StepMeta[] = [
  { key: 'files',    title: '程序文件',   desc: '主程序 + 相关文件',   icon: 'layers' },
  { key: 'license',  title: '许可协议',   desc: 'License / EULA',      icon: 'book' },
  { key: 'brand',    title: '品牌与 Logo', desc: '名称·版本·发布者·图标', icon: 'globe' },
  { key: 'options',  title: '安装选项',   desc: '引擎·目录·快捷方式',    icon: 'settings' },
  { key: 'generate', title: '生成安装包',  desc: '脚本·编译·静默参数',   icon: 'zap' },
];

export default function App() {
  const [config, setConfig] = useState<BuildConfig>(defaultConfig());
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('pill-installer-theme') as 'light' | 'dark') || 'light',
  );
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: '', show: false });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pill-installer-theme', theme);
  }, [theme]);

  const patch = (p: Partial<BuildConfig>) => setConfig((c) => ({ ...c, ...p }));
  const notify = (text: string) => {
    setToast({ text, show: true });
    window.setTimeout(() => setToast({ text, show: false }), 2600);
  };

  const current = STEPS[step];

  const canNext = () => {
    if (step === 0 && !config.exeRelPath) {
      notify('请先选择主程序（.exe）');
      return false;
    }
    if (step === 2 && (!config.appName || !config.version)) {
      notify('请填写应用名称与版本号');
      return false;
    }
    return true;
  };

  const next = () => { if (canNext() && step < STEPS.length - 1) setStep((s) => s + 1); };
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => { setConfig(defaultConfig()); setStep(0); notify('已重置为默认配置'); };

  const stepProps = { config, patch, notify };

  const mark = useMemo(() => {
    const done = new Set<number>();
    if (config.exeRelPath) done.add(0);
    if (config.appName && config.version) done.add(2);
    return done;
  }, [config.exeRelPath, config.appName, config.version]);

  return (
    <div className="p-shell">
      {/* ===== 侧边栏（桌面） ===== */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-neutral-200/70 dark:border-neutral-800/70">
          <span className="w-9 h-9 rounded-pill bg-neutral-950 text-white dark:bg-white dark:text-black flex items-center justify-center">
            <Icon name="save" size={18}/>
          </span>
          <div>
            <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-tight">Installer Builder</div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Pill 设计 · 打包向导</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = mark.has(i);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-pill px-4 py-2.5 text-left transition-all duration-PILL ease-PILL',
                  active ? 'bg-neutral-950 text-white shadow-pill dark:bg-white dark:text-black' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900',
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0',
                  active ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : done ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
                )}>
                  {done && !active ? <Icon name="check" size={13}/> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{s.title}</span>
                  <span className={cn('block text-[11px] leading-tight', active ? 'opacity-70' : 'text-neutral-500 dark:text-neutral-400')}>{s.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-neutral-200/70 dark:border-neutral-800/70 text-[11px] text-neutral-400 dark:text-neutral-500">
          NSIS · Inno Setup 安装脚本生成器
        </div>
      </aside>

      {/* ===== 主区 ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 px-6 h-16 border-b border-neutral-200/70 dark:border-neutral-800/70 shrink-0">
          <div className="lg:hidden flex items-center gap-2">
            <span className="w-8 h-8 rounded-pill bg-neutral-950 text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Icon name="save" size={16}/>
            </span>
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Installer Builder</span>
          </div>
          <div className="hidden lg:flex flex-col">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">{current.title}</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{current.desc}</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="w-10 h-10 rounded-pill border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              aria-label="切换主题"
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17}/>
            </button>
          </div>
        </header>

        {/* 移动端步骤条 */}
        <div className="lg:hidden px-4 pt-4">
          <PillTabs
            value={step}
            onChange={(v) => setStep(Number(v))}
            size="sm"
            variant="solid"
            items={STEPS.map((s, i) => ({ key: i, label: s.title }))}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {step === 0 && <ProgramFilesStep {...stepProps} />}
          {step === 1 && <LicenseStep {...stepProps} />}
          {step === 2 && <BrandStep {...stepProps} />}
          {step === 3 && <OptionsStep {...stepProps} />}
          {step === 4 && <GenerateStep config={config} notify={notify} />}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-neutral-200/70 dark:border-neutral-800/70 shrink-0">
          <div className="text-xs text-neutral-400 dark:text-neutral-500">
            第 {step + 1} / {STEPS.length} 步
          </div>
          <div className="flex items-center gap-2">
            {step === STEPS.length - 1 ? (
              <PillButton variant="soft" size="md" leftIcon={<Icon name="rotate-ccw" size={15}/>} onClick={reset}>
                重置
              </PillButton>
            ) : (
              <PillButton variant="ghost" size="md" leftIcon={<Icon name="chevron-left" size={15}/>} onClick={prev} disabled={step === 0}>
                上一步
              </PillButton>
            )}
            {step < STEPS.length - 1 && (
              <PillButton variant="primary" size="md" rightIcon={<Icon name="chevron-right" size={15}/>} onClick={next}>
                下一步
              </PillButton>
            )}
          </div>
        </footer>
      </main>

      {/* Toast */}
      <PillToast
        show={toast.show}
        type="info"
        title="提示"
        message={toast.text}
        onClose={() => setToast({ text: '', show: false })}
        className="fixed bottom-6 right-6 z-[60]"
      />
    </div>
  );
}
