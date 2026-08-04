import {describe, expect, it} from 'vitest';
import {parseTatting, serializeRing} from './ringLanguage.js';

describe('Ring language', () => {
  it('parses the long form and methods', () => {
    const result = parseTatting(`ring r1\nr1.totalNodes = 16\nr1.position = point(100, 200)\nr1.rotate(15)\nr1.move(5, -10)`);
    expect(result.valid).toBe(true);
    expect(result.rings.r1).toMatchObject({totalNodes: 16, position: {x: 105, y: 190}, rotation: 15});
  });

  it('parses the compact named initializer', () => {
    const result = parseTatting(`ring centro(\n totalNodes: 12,\n attachments: composition("3-3-3-3"),\n position: point(300, 220),\n roundness: 48,\n style.stroke: "#111111",\n style.strokeWidth: 3px\n)`);
    expect(result.valid).toBe(true);
    expect(result.rings.centro.attachments).toEqual([3, 6, 9, 12]);
    expect(result.rings.centro.style).toEqual({stroke: '#111111', strokeWidth: 3});
  });

  it('reports semantic errors without accepting the model', () => {
    const result = parseTatting('ring bad(totalNodes: 0, roundness: 120, unknown: 2)');
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toHaveLength(3);
  });

  it('serializes a ring to the compact syntax', () => {
    const source = serializeRing(parseTatting('ring r1').rings.r1);
    expect(source).toContain('ring r1(');
    expect(parseTatting(source).valid).toBe(true);
  });
});
