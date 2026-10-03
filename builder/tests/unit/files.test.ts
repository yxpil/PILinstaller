import { describe, it, expect } from 'vitest';
import { formatSize, escapeWinName } from '../../src/lib/files';

describe('files 工具', () => {
  it('formatSize 字节换算', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 KB');
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('escapeWinName 把非法字符替换为下划线（注入清洗）', () => {
    expect(escapeWinName('正常名字')).toBe('正常名字');
    // 路径穿越/特殊符号被中和
    expect(escapeWinName('..\\..\\evil')).not.toContain('\\');
    expect(escapeWinName('a/b*c?d"e<f>')).not.toMatch(/[\/\*\?"<>]/);
    expect(escapeWinName('has space')).toBe('has_space');
  });
});
