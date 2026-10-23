/** @type {import('tailwindcss').Config} */
// The colors are the roles of src/design/editor.css, each a token of
// src/design/mask.css; mixed with transparent for Tailwind's opacity, so
// bg-selection/[.08] works on a token as it did on hsl channels.
const role = (name) => `color-mix(in srgb, var(--wb-${name}) calc(<alpha-value> * 100%), transparent)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      fontFamily: {
        // --se-font: the type of Windows and SoftEngine.
        sans: ['"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['"Consolas"', 'monospace'], // .num
      },
      colors: {
        ground: role('ground'),
        panel: role('panel'),
        control: role('control'),
        line: role('line'),
        'line-soft': role('line-soft'),
        'box-line': role('box-line'),
        hover: role('hover'),
        ink: role('ink'),
        'ink-2': role('ink-2'),
        muted: role('muted'),
        accent: role('accent'),
        'accent-soft': role('accent-soft'),
        'accent-ink': role('accent-ink'),
        error: role('error'),
        'error-soft': role('error-soft'),
        pending: role('pending'),
        'pending-soft': role('pending-soft'),
        selection: role('selection'),
        canvas: role('canvas'),
      },
      // Pixels, not rem, with the line height of html, body.
      fontSize: {
        ui: ['13px', { lineHeight: '1.45' }], // .kinput
        dense: ['12px', { lineHeight: '1.45' }], // .vkarte-meta
        // Tailwind's own xs and sm land on the same two steps.
        xs: ['12px', { lineHeight: '1.45' }],
        sm: ['13px', { lineHeight: '1.45' }],
        'ui-title': ['13px', { lineHeight: '1.45' }],
        label: ['11.5px', { lineHeight: '1.45' }], // .vfeld-label
        title: ['15px', { lineHeight: '1.45' }], // the head of a window
        // The size of a label of the mask: a head of a column of the editor, a tab of it.
        rubric: ['var(--se-fs-sm)', { lineHeight: '1.45', fontWeight: '700' }],
      },
      spacing: {
        control: '32px', // .tog of the sample
      },
      borderRadius: {
        // Every radius name resolves to the one editor radius, whichever a file writes.
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      boxShadow: {
        // What floats, popover and dialog: the hairline, no shadow.
        overlay: '0 0 0 1px var(--wb-line)', // --se-shadow-pop
        focus: '0 0 0 3px color-mix(in srgb, var(--wb-accent) 20%, transparent)', // --se-focus
        // The marked line of a list: a stroke on its left edge.
        mark: 'inset 3px 0 0 var(--wb-accent)',
        // A cell being typed in: a fine edge inside it.
        cell: 'inset 0 0 0 1px var(--wb-accent)',
        // The open tab: a line of the accent under it.
        tab: 'inset 0 -2px 0 var(--wb-accent)',
      },
      transitionDuration: {
        DEFAULT: '120ms', // --se-move
      },
    },
  },
  plugins: [],
}
