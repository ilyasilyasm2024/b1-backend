const { sanitizeHtml } = require('../../src/modules/notes/notes.sanitize');

describe('sanitizeHtml', () => {
  it('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
    expect(sanitizeHtml({})).toBe('');
  });

  it('keeps allowed formatting tags', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
    expect(sanitizeHtml('<strong>x</strong>')).toBe('<strong>x</strong>');
    expect(sanitizeHtml('<em>y</em>')).toBe('<em>y</em>');
    expect(sanitizeHtml('<ul><li>a</li></ul>')).toBe('<ul><li>a</li></ul>');
  });

  it('strips script tags and their contents', () => {
    const out = sanitizeHtml('hello<script>alert(1)</script>world');
    expect(out).toBe('helloworld');
    expect(out).not.toContain('alert');
  });

  it('strips style blocks and their contents', () => {
    const out = sanitizeHtml('a<style>body{color:red}</style>b');
    expect(out).toBe('ab');
  });

  it('removes disallowed tags but keeps text', () => {
    expect(sanitizeHtml('<iframe>x</iframe>')).toBe('x');
    expect(sanitizeHtml('<img src="x">text')).toBe('text');
  });

  it('drops event-handler attributes', () => {
    const out = sanitizeHtml('<p onclick="evil()">hi</p>');
    expect(out).toBe('<p>hi</p>');
    expect(out).not.toContain('onclick');
  });

  it('keeps allowed style properties only', () => {
    const out = sanitizeHtml('<span style="color: red; position: absolute;">x</span>');
    expect(out).toContain('color: red');
    expect(out).not.toContain('position');
  });

  it('rejects style values with url() or expression', () => {
    const out = sanitizeHtml('<span style="background-color: url(javascript:alert(1))">x</span>');
    expect(out).toBe('<span>x</span>');
  });

  it('allows http, https and mailto links', () => {
    expect(sanitizeHtml('<a href="https://example.com">l</a>')).toContain('href="https://example.com"');
    expect(sanitizeHtml('<a href="http://example.com">l</a>')).toContain('href="http://example.com"');
    expect(sanitizeHtml('<a href="mailto:a@b.com">l</a>')).toContain('href="mailto:a@b.com"');
  });

  it('drops javascript: and other dangerous hrefs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">l</a>');
    expect(out).toBe('<a>l</a>');
    expect(out).not.toContain('javascript');
  });

  it('handles closing tags for allowed elements', () => {
    expect(sanitizeHtml('<p>text</p>')).toBe('<p>text</p>');
  });

  it('drops closing tags for disallowed elements', () => {
    const out = sanitizeHtml('</iframe>');
    expect(out).toBe('');
  });

  it('preserves plain text without tags', () => {
    expect(sanitizeHtml('just some text')).toBe('just some text');
  });

  it('handles nested allowed formatting', () => {
    const out = sanitizeHtml('<p><b>bold</b> and <i>italic</i></p>');
    expect(out).toBe('<p><b>bold</b> and <i>italic</i></p>');
  });

  it('sanitizes style with single-quoted attributes', () => {
    const out = sanitizeHtml("<span style='color: blue'>x</span>");
    expect(out).toContain('color: blue');
  });
});
