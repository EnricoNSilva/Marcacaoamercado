import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isLightTheme, getChartColors, CHART_COLORS } from '../../src/ui/charts/theme.js';

describe('UI: Tema Claro / Escuro e Cores dos Gráficos', () => {
  let mockAttributes;

  beforeEach(() => {
    mockAttributes = new Map();
    globalThis.document = {
      documentElement: {
        getAttribute: (attr) => mockAttributes.get(attr) || null,
        setAttribute: (attr, val) => mockAttributes.set(attr, String(val)),
        removeAttribute: (attr) => mockAttributes.delete(attr)
      }
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  it('detecta tema escuro como padrão quando data-theme não está definido', () => {
    expect(isLightTheme()).toBe(false);
    expect(CHART_COLORS.borderGrid).toBe('#1e2c47');
    expect(CHART_COLORS.primary).toBe('#3b82f6');
  });

  it('detecta e atualiza dinamicamente as cores quando data-theme="light"', () => {
    globalThis.document.documentElement.setAttribute('data-theme', 'light');
    expect(isLightTheme()).toBe(true);

    const colors = getChartColors();
    expect(colors.borderGrid).toBe('#e2e8f0');
    expect(colors.primary).toBe('#2563eb');
    expect(CHART_COLORS.borderGrid).toBe('#e2e8f0');
    expect(CHART_COLORS.primary).toBe('#2563eb');
  });

  it('alterna de volta para tema escuro quando data-theme="dark"', () => {
    globalThis.document.documentElement.setAttribute('data-theme', 'light');
    expect(CHART_COLORS.borderGrid).toBe('#e2e8f0');

    globalThis.document.documentElement.setAttribute('data-theme', 'dark');
    expect(isLightTheme()).toBe(false);
    expect(CHART_COLORS.borderGrid).toBe('#1e2c47');
  });
});

