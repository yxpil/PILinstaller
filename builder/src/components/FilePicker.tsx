import React, { useRef, useState } from 'react';
import { cn } from '@utils/cn';
import Icon, { type IconName } from '@icons/index';

export interface FilePickerProps {
  title: string;
  hint?: string;
  multiple?: boolean;
  directory?: boolean;      // 允许选择整个文件夹（webkitdirectory）
  accept?: string;
  icon?: IconName;
  className?: string;
  onFiles: (files: File[]) => void;
}

/**
 * 药丸风格拖拽/点击选择文件区
 */
export const FilePicker: React.FC<FilePickerProps> = ({
  title, hint, multiple, directory, accept, icon = 'upload', className, onFiles,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); emit(e.dataTransfer.files); }}
      className={cn(
        'w-full rounded-softer border border-dashed px-6 py-10 flex flex-col items-center justify-center gap-3',
        'text-center transition-all duration-300 ease-PILL cursor-pointer',
        drag
          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900'
          : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
        className,
      )}
    >
      <span className={cn(
        'rounded-full p-3 inline-flex',
        drag ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
      )}>
        <Icon name={icon} size={22}/>
      </span>
      <div>
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</div>
        {hint && <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{hint}</div>}
      </div>
      <span className="text-xs text-neutral-400 dark:text-neutral-500">点击选择或拖拽到此处</span>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={accept}
        {...(directory ? { webkitdirectory: '' } : {})}
        onChange={(e) => { emit(e.target.files); e.target.value = ''; }}
      />
    </button>
  );
};

export default FilePicker;
