// Original, lightweight repeating screen wallpaper. No external images or logos.
const TILE = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <pattern id="confetti" width="64" height="64" patternUnits="userSpaceOnUse">
      <circle cx="13" cy="18" r="2" fill="#f0cc79" opacity=".38"/>
      <circle cx="43" cy="49" r="2.5" fill="#9ccbe2" opacity=".36"/>
      <path d="M45 13l4 4m0-4l-4 4" stroke="#d9a2ad" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>
    </pattern>
    <g id="happy-face" stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx="0" cy="42" rx="54" ry="52" fill="#fff" stroke="#eed9ac" stroke-width="3"/>
      <path d="M-39 79q39-24 78 0l11 21H-50z" fill="#e95b56" stroke="#7b4d42" stroke-width="2.5"/>
      <path d="M-17 69l17 13 17-13" fill="none" stroke="#ffdcc5" stroke-width="4"/>
      <path d="M-40 28q-3-38 21-49Q5-43 27-28q19 10 14 56l-9 3-2-27q-8-6-12-19-22 18-51 13l2 29z" fill="#242c35" stroke="#242c35" stroke-width="3"/>
      <path d="M-28-16q19-21 35-17l-10 21q-12 9-27 8z" fill="#e7bc55"/>
      <path d="M-14-30Q0-36 10-28L-2-10l-16 5z" fill="#f5dc7b"/>
      <ellipse cx="0" cy="31" rx="34" ry="37" fill="#ffdbba" stroke="#9c6b55" stroke-width="2.3"/>
      <ellipse cx="-34" cy="34" rx="6" ry="10" fill="#ffdbba" stroke="#9c6b55" stroke-width="2"/>
      <ellipse cx="34" cy="34" rx="6" ry="10" fill="#ffdbba" stroke="#9c6b55" stroke-width="2"/>
      <path d="M-23 26q9-8 17 0M6 26q8-8 17 0" fill="none" stroke="#322c2b" stroke-width="3.5"/>
      <ellipse cx="-24" cy="43" rx="8" ry="5" fill="#ff9f9d" opacity=".58"/>
      <ellipse cx="24" cy="43" rx="8" ry="5" fill="#ff9f9d" opacity=".58"/>
      <path d="M-17 48q17 26 34 0q-17 7-34 0" fill="#762d38" stroke="#5b3435" stroke-width="2"/>
      <path d="M-13 49q13 9 26 0" fill="none" stroke="#fff" stroke-width="4"/>
      <path d="M-48 24Q-56 40-45 53M48 24Q56 40 45 53" stroke="#6db9d9" stroke-width="6" fill="none"/>
    </g>
    <g id="spark" fill="#f3c652" stroke="#df9c3b" stroke-width="1.8">
      <path d="M0-13L4-4L13 0L4 4L0 13L-4 4L-13 0L-4-4Z"/>
    </g>
  </defs>
  <rect width="320" height="320" fill="#fff7e5"/>
  <rect width="320" height="320" fill="url(#confetti)"/>
  <g transform="translate(76 81) rotate(-8)">
    <circle r="70" fill="#e0f1fd" stroke="#b1d7ed" stroke-width="3"/>
    <use href="#happy-face" transform="translate(0 -11) scale(.90)"/>
  </g>
  <g transform="translate(240 242) rotate(11)">
    <circle r="67" fill="#ffe6df" stroke="#efc4bd" stroke-width="3"/>
    <use href="#happy-face" transform="translate(0 -9) scale(.85)"/>
  </g>
  <g transform="translate(222 74) rotate(10)">
    <rect x="-56" y="-25" width="112" height="48" rx="16" fill="#fff" stroke="#ebc86f" stroke-width="3"/>
    <text x="0" y="5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="900" fill="#b97c39">ヒカキン!</text>
    <path d="M-24 23L-11 38L-7 22" fill="#fff" stroke="#ebc86f" stroke-width="3"/>
  </g>
  <g transform="translate(82 245) rotate(-12)">
    <rect x="-43" y="-22" width="86" height="43" rx="15" fill="#fff" stroke="#a7d5dd" stroke-width="3"/>
    <text x="0" y="6" text-anchor="middle" font-family="system-ui,sans-serif" font-size="21" font-weight="900" fill="#4295b1">HEY!</text>
  </g>
  <use href="#spark" x="160" y="177"/>
  <use href="#spark" x="302" y="158" transform="rotate(13 302 158)"/>
  <use href="#spark" x="18" y="177" transform="scale(.7) translate(8 76)"/>
  <g fill="none" stroke="#74b7d4" stroke-width="4" stroke-linecap="round" opacity=".65">
    <path d="M169 32l-5-12M182 34l4-13M174 52l11 5"/>
    <path d="M134 270l-7 9M148 284l-1 11"/>
  </g>
</svg>`;
export const HIKAKIN_SCREEN_THEME = Object.freeze({
  pattern:'url("data:image/svg+xml,' + encodeURIComponent(TILE.trim()) + '")',
  patternSize:'320px 320px',
  patternRepeat:'repeat',
  patternPosition:'center center'
});
