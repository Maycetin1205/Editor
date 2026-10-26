import { css, html, nothing, type TemplateResult } from 'lit'
import type { NoticeState } from '../../runtime/notice'
import { icon } from '../parts/icons'

export function noticeSignTpl(state: NoticeState): TemplateResult | typeof nothing {
  if (state === 'writing') {
    return html`<svg class="ff-ring" aria-hidden="true"><circle pathLength="100"></circle></svg>`
  }
  if (state === 'saved') return html`<span class="ff-tick" aria-hidden="true">${icon('check')}</span>`
  if (state === 'sent') return html`<span class="ff-tick ff-tick-sent" aria-hidden="true">${icon('check')}</span>`
  return nothing
}

export function busyLineTpl(state: NoticeState): TemplateResult | typeof nothing {
  if (state !== 'loading' && state !== 'writing') return nothing
  const label = state === 'loading' ? 'Lädt' : 'Schreibt'
  return html`<div class="ff-busy" role="progressbar" aria-label=${label}><span class="ff-busy-run"></span></div>`
}

/* The ring of the ProgressRing of Windows: an arc that grows and shrinks while
   it turns, in the accent, or in the ink of a full button (--notice-ink). The
   tick stands in its place for 2 s after a confirmed write; grey after a write
   SoftEngine took without confirming it.

   The line of the indeterminate ProgressBar: a part of the accent runs from
   left to right at the upper inner edge of the card, inside its hairline and
   cut by its round corners, over the head of a list. It lies over the block,
   so nothing moves. */
export const noticeStyle = css`
  .ff-ring,
  .ff-tick {
    flex: none;
    width: var(--se-notice-ring);
    height: var(--se-notice-ring);
  }
  .ff-ring {
    display: block;
    color: var(--notice-ink, var(--se-accent));
    animation: ff-ring-turn var(--se-notice-turn) linear infinite;
  }
  .ff-ring circle {
    cx: 50%;
    cy: 50%;
    r: calc(50% - var(--se-notice-ring-line) / 2);
    fill: none;
    stroke: currentColor;
    stroke-width: var(--se-notice-ring-line);
    stroke-linecap: round;
    animation: ff-ring-arc var(--se-notice-turn) ease-in-out infinite;
  }
  @keyframes ff-ring-turn {
    to { transform: rotate(1turn); }
  }
  @keyframes ff-ring-arc {
    0% { stroke-dasharray: 1 100; stroke-dashoffset: 0; }
    50% { stroke-dasharray: 60 100; stroke-dashoffset: -20; }
    100% { stroke-dasharray: 1 100; stroke-dashoffset: -99; }
  }
  .ff-tick {
    display: grid;
    color: var(--notice-ink, var(--se-success));
  }
  .ff-tick .icon { width: 100%; height: 100%; }
  .ff-tick-sent { color: var(--notice-ink, var(--se-ink-2)); }

  .ff-notice-room { display: contents; }
  :host([data-ff-notice='loading']),
  :host([data-ff-notice='writing']) { position: relative; }
  .ff-busy {
    position: absolute;
    inset: var(--se-border) var(--se-border) auto;
    z-index: 3;
    height: calc(var(--se-radius-card) - var(--se-border));
    border-radius: calc(var(--se-radius-card) - var(--se-border)) calc(var(--se-radius-card) - var(--se-border)) 0 0;
    overflow: hidden;
    pointer-events: none;
  }
  .ff-busy-run {
    position: absolute;
    top: 0;
    left: calc(-1 * var(--se-notice-segment));
    width: var(--se-notice-segment);
    height: var(--se-notice-bar);
    border-radius: var(--se-notice-bar);
    background: var(--se-accent);
    animation: ff-busy-run var(--se-notice-pace) cubic-bezier(.4, 0, .6, 1) infinite;
  }
  @keyframes ff-busy-run {
    from { left: calc(-1 * var(--se-notice-segment)); }
    to { left: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ff-ring,
    .ff-ring circle,
    .ff-busy-run { animation: none; }
    .ff-ring circle { stroke-dasharray: 75 100; }
    .ff-busy-run { left: calc((100% - var(--se-notice-segment)) / 2); }
  }
`
