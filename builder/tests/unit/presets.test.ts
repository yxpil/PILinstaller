import { describe, it, expect } from 'vitest';
import { fillTemplate, LICENSE_PRESETS } from '../../src/lib/presets';

describe('fillTemplate 许可模板', () => {
  it('替换作者占位符', () => {
    expect(fillTemplate('Copyright (c) 2026 <PACKAGE_AUTHOR>', 'Yxpil')).toBe('Copyright (c) 2026 Yxpil');
  });
  it('作者为空时回退默认', () => {
    expect(fillTemplate('<PACKAGE_AUTHOR>', '')).toContain('作者');
  });
  it('内置预设齐全', () => {
    expect(LICENSE_PRESETS.map((p) => p.id)).toEqual(expect.arrayContaining(['mit', 'apache2', 'gpl3', 'bsd3']));
  });
});
