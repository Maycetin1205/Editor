import { describe, expect, it } from 'vitest'
import {
  cssRules,
  escapeHtmlAttr,
  escapeHtmlText,
  escapeNonAsciiJs,
  guardJsonScript,
  guardScriptContent,
  htmlAttr,
  stripCssComments,
} from '../src/export/serializer'

describe('escapeHtmlText', () => {
  it('escapes markup and non-ASCII', () => {
    expect(escapeHtmlText('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
    expect(escapeHtmlText('Müller')).toBe('M&#xFC;ller')
    expect(escapeHtmlText('a\u2028b')).toBe('a&#x2028;b')
  })
})

describe('htmlAttr', () => {
  it('never lets a quote close the attribute', () => {
    expect(htmlAttr('x', 'a"b')).toBe(` x='a"b'`)
    expect(htmlAttr('x', `a"b'c`)).toBe(` x='a"b&#39;c'`)
    expect(htmlAttr('x', "a'b")).toBe(` x="a'b"`)
    expect(htmlAttr('x', '"><script>alert(1)</script>')).not.toMatch(/<script/)
  })
  it('keeps the value readable by the browser', () => {
    const value = `Sa"ch' <lo&g> ß`
    const attr = htmlAttr('data-x', value)
    const div = document.createElement('div')
    div.innerHTML = `<i${attr}></i>`
    expect(div.firstElementChild?.getAttribute('data-x')).toBe(value)
    expect(escapeHtmlAttr('"')).toBe('&quot;')
  })
})

describe('script guards', () => {
  it('escapes non-ASCII and line separators inside inline JS', () => {
    expect(escapeNonAsciiJs('ä\u2028\u2029')).toBe('\\u00E4\\u2028\\u2029')
    expect(escapeNonAsciiJs('plain\n\t ok')).toBe('plain\n\t ok')
  })
  it('keeps </script> from closing the inline script', () => {
    expect(guardScriptContent('x="</script><script>"')).toBe('x="<\\/script><script>"')
    expect(guardJsonScript('{"a":"</script>"}')).toBe('{"a":"\\u003C/script>"}')
    const text = JSON.parse(guardJsonScript(JSON.stringify({ a: '</script>' })).replace('\\u003C', '<')) as {
      a: string
    }
    expect(text.a).toBe('</script>')
  })
})

describe('css helpers', () => {
  it('strips comments and splits rules by selector', () => {
    const css = `/* note */\nff-a, ff-b { color: red; }\n\n\n:root { --x: 1; }\n@media (x) { ff-c { a: b } }`
    const clean = stripCssComments(css)
    expect(clean).not.toContain('note')
    expect(clean).not.toMatch(/\n\n\n/)
    const rules = cssRules(clean)
    expect(rules.map((r) => r.selectors)).toEqual([['ff-a', 'ff-b'], [':root'], ['@media (x)']])
  })
})
