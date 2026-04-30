import { describe, it, expect } from 'vitest';
import { splitSummaryText } from './splitMessage';

describe('splitSummaryText', () => {
    it('returns empty array for empty input', () => {
        expect(splitSummaryText('')).toEqual([]);
        expect(splitSummaryText('   ')).toEqual([]);
    });

    it('returns single chunk with signature for short text', () => {
        const result = splitSummaryText('Hello world');
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('Hello world');
        expect(result[0]).toContain('_by Octo 智能总结_');
    });

    it('splits by ## headings when text exceeds maxLen', () => {
        const section1 = '## Section 1\n' + 'a'.repeat(100);
        const section2 = '## Section 2\n' + 'b'.repeat(100);
        const input = section1 + '\n' + section2;
        const result = splitSummaryText(input, 200);
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('merges small adjacent sections', () => {
        const input = '## A\nshort\n## B\nalso short';
        const result = splitSummaryText(input, 4500);
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('## A');
        expect(result[0]).toContain('## B');
    });

    it('appends signature to last chunk', () => {
        const input = 'Some summary content';
        const result = splitSummaryText(input);
        const last = result[result.length - 1];
        expect(last).toMatch(/---\n_by Octo 智能总结_$/);
    });

    it('puts signature in separate chunk when last chunk is at capacity', () => {
        const input = 'x'.repeat(4490);
        const result = splitSummaryText(input, 4500);
        expect(result.length).toBeGreaterThanOrEqual(1);
        const last = result[result.length - 1];
        expect(last).toContain('_by Octo 智能总结_');
    });

    it('hard cuts oversized sections without headings or paragraph breaks', () => {
        const input = 'x'.repeat(10000);
        const result = splitSummaryText(input, 4500);
        expect(result.length).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < result.length - 1; i++) {
            if (!result[i].includes('_by Octo')) {
                expect(result[i].length).toBeLessThanOrEqual(4500);
            }
        }
    });

    it('handles surrogate pairs correctly in hardCut', () => {
        const emoji = '😀';
        const input = emoji.repeat(3000);
        const result = splitSummaryText(input, 50);
        for (const chunk of result) {
            if (chunk.includes('_by Octo')) continue;
            expect(chunk.length).toBeLessThanOrEqual(50);
            // No broken surrogate pairs
            expect(chunk).not.toMatch(/[\uD800-\uDBFF]$/);
            expect(chunk).not.toMatch(/^[\uDC00-\uDFFF]/);
        }
    });

    it('splits by double newlines when single section exceeds maxLen', () => {
        const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraph ${i}: ${'word '.repeat(200)}`);
        const input = paragraphs.join('\n\n');
        const result = splitSummaryText(input, 500);
        expect(result.length).toBeGreaterThan(1);
    });

    it('respects custom maxLen parameter', () => {
        const input = 'a'.repeat(200);
        const result = splitSummaryText(input, 100);
        expect(result.length).toBeGreaterThanOrEqual(2);
        for (const chunk of result) {
            if (chunk.includes('_by Octo')) continue;
            expect(chunk.length).toBeLessThanOrEqual(100);
        }
    });
});
