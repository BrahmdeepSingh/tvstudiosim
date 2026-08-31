// ─── Emblem SVG strings ───────────────────────────────────────────────────────
//
// Each value is the raw SVG markup exported from Figma.
//
// HOW TO UPDATE:
//   1. Open the matching .svg file from assets/emblems/ in a text editor.
//   2. Copy the entire file contents.
//   3. Paste it as the template-literal string below.
//
// COLOR CONVENTION:
//   Every path/shape that should follow the player's text-color selection
//   must use fill="#FFFFFF" (or stroke="#FFFFFF") in the Figma export.
//   The renderer replaces all occurrences of #FFFFFF with the chosen color
//   at display time, so nothing else needs to change.
//
// BACKGROUND:
//   SVGs must have NO background rectangle — the badge background color is
//   applied by LogoBadge. Delete any <rect fill="white"/> or similar.

export type EmblemID = 'filmcamera' | 'clapperboard' | 'antenna' | 'directorchair';

export const EMBLEMS: Record<EmblemID, string> = {
  filmcamera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your filmcamera.svg content here (delete this comment line) -->
<rect x="80" y="180" width="300" height="240" rx="30" fill="#FFFFFF"/>
<rect x="380" y="230" width="140" height="60" rx="8" fill="#FFFFFF"/>
<rect x="380" y="310" width="140" height="60" rx="8" fill="#FFFFFF"/>
<circle cx="200" cy="300" r="60" fill="#FFFFFF" opacity="0.15"/>
<circle cx="200" cy="300" r="35" fill="#FFFFFF"/>
</svg>`,

  clapperboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your clapperboard.svg content here (delete this comment line) -->
<rect x="80" y="220" width="440" height="300" rx="20" fill="#FFFFFF"/>
<rect x="80" y="140" width="440" height="90" rx="10" fill="#FFFFFF"/>
<line x1="140" y1="140" x2="200" y2="230" stroke="#FFFFFF" stroke-width="28"/>
<line x1="240" y1="140" x2="300" y2="230" stroke="#FFFFFF" stroke-width="28"/>
<line x1="340" y1="140" x2="400" y2="230" stroke="#FFFFFF" stroke-width="28"/>
<line x1="440" y1="140" x2="500" y2="230" stroke="#FFFFFF" stroke-width="28"/>
</svg>`,

  antenna: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your antenna.svg content here (delete this comment line) -->
<rect x="280" y="180" width="40" height="300" rx="8" fill="#FFFFFF"/>
<rect x="180" y="400" width="240" height="36" rx="8" fill="#FFFFFF"/>
<line x1="300" y1="200" x2="140" y2="300" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round"/>
<line x1="300" y1="200" x2="460" y2="300" stroke="#FFFFFF" stroke-width="28" stroke-linecap="round"/>
<circle cx="300" cy="180" r="30" fill="#FFFFFF"/>
</svg>`,

  directorchair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your directorchair.svg content here (delete this comment line) -->
<line x1="140" y1="120" x2="200" y2="480" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round"/>
<line x1="460" y1="120" x2="400" y2="480" stroke="#FFFFFF" stroke-width="36" stroke-linecap="round"/>
<rect x="140" y="280" width="320" height="48" rx="12" fill="#FFFFFF"/>
<rect x="100" y="120" width="160" height="100" rx="12" fill="#FFFFFF"/>
<rect x="340" y="120" width="160" height="100" rx="12" fill="#FFFFFF"/>
</svg>`,
};

// Convenience: all valid emblem IDs for the logo builder picker
export const EMBLEM_IDS: EmblemID[] = ['filmcamera', 'clapperboard', 'antenna', 'directorchair'];
