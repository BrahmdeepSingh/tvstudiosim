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

export type EmblemID = 'filmcamera' | 'clapperboard' | 'antenna' | 'directorchair' | 'mountain' | 'filmroll' | 'crown' | 'lightbulb' | 'star';

export const EMBLEMS: Record<EmblemID, string> = {
  filmcamera: `<svg width="649" height="574" viewBox="0 0 649 574" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M108 279H439L447 283L451 289V519L448 525L443 529L441 530H201L203 524L212 507L220 491L228 476L236 460L244 443V432L240 424L235 419L227 415H215L207 419L201 426L191 449L174 490L158 529L157 530H107L101 526L97 519V289L104 281L108 279Z" fill="white"/>
<path d="M585 292H643L648 296L649 298V468L646 473L642 475H585L576 469L562 456L551 447L540 437V328L555 315L566 306L579 295L585 292Z" fill="white"/>
<path d="M386 0H419L437 4L452 9L473 20L487 30L504 47L511 57L519 70L527 89L531 104L532 111V144L529 158L523 176L517 188L508 202L495 217L485 226L475 233L461 241L445 248L427 253L414 255H397L375 253L355 247L334 237L317 225L305 214L296 204L285 187L278 172L273 157L270 139V114L273 97L278 82L286 65L294 53L303 42L312 33L325 23L340 14L355 7L377 1L386 0ZM387 23L372 26L356 32L344 38L333 46L323 55L314 65L305 79L298 95L294 110V141L297 156L303 171L309 182L319 195L330 206L344 216L360 224L375 229L384 231H416L434 227L450 221L465 212L478 201L488 190L497 176L503 163L507 151L509 139V115L505 97L499 82L490 67L479 55L470 46L455 36L437 28L422 24L414 23H387Z" fill="white"/>
<path d="M113 0H147L162 3L179 8L196 16L211 26L221 35L228 41L239 55L247 68L255 85L260 103L262 116V140L257 163L251 179L243 194L233 207L224 217L214 226L201 235L182 245L165 251L140 255H121L100 252L79 245L63 237L49 227L37 217V215L34 214L25 203L15 188L9 176L1 152L0 142V112L2 100L5 88L13 69L23 53L33 42L39 35L53 24L66 16L85 7L106 1L113 0ZM116 23L101 26L85 32L70 40L60 48L49 58L39 71L32 83L26 99L23 113V139L26 155L31 168L36 178L44 190L56 203L69 213L83 221L97 227L108 230L115 231H146L163 227L176 222L188 216L202 206L216 192L226 177L232 164L237 147L238 141V113L234 96L228 81L219 67L211 57L204 50L191 40L174 31L157 25L143 23H116Z" fill="white"/>
<path d="M265 165H267L275 185L284 201L294 214L299 219V221L303 223L310 230L324 240L342 250L357 256L373 260L383 262L394 263V270H155V261L171 257L190 250L205 242L218 233L228 224L233 220L240 212L250 198L260 179L265 165Z" fill="white"/>
<path d="M460 331H531V435H460V331Z" fill="white"/>
<path d="M216 423H227L233 428L236 434V441L213 487L203 506L193 526L183 545L173 564L167 568L125 569L120 573L117 574H109L101 569L97 561V554L102 546L108 542H117L123 545L125 547L160 548L161 543L177 504L197 456L207 432L211 426L216 423Z" fill="white"/>
<path d="M213 539H418V553L415 558L407 563H223L216 559L213 553V539Z" fill="white"/>
<path d="M125 93H136L147 97L155 103L161 111L165 121V132L161 143L155 151L149 156L140 160L136 161H124L114 157L108 153L102 146L97 136V118L102 108L108 101L118 95L125 93Z" fill="white"/>
<path d="M392 94H410L420 98L427 104L433 113L435 118V136L429 148L420 156L411 160L407 161H396L386 158L378 152L372 145L368 136L367 132V121L371 111L378 102L387 96L392 94Z" fill="white"/>
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

  mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your mountain.svg content here (delete this comment line) -->
<polygon points="300,80 540,480 60,480" fill="white"/>
</svg>`,

  filmroll: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your filmroll.svg content here (delete this comment line) -->
<circle cx="300" cy="300" r="200" stroke="white" stroke-width="40" fill="none"/>
<circle cx="300" cy="300" r="60" fill="white"/>
</svg>`,

  crown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your crown.svg content here (delete this comment line) -->
<polygon points="300,80 540,480 60,480" fill="white"/>
</svg>`,

  lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your lightbulb.svg content here (delete this comment line) -->
<circle cx="300" cy="240" r="160" fill="white"/>
</svg>`,

  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
<!-- PASTE your star.svg content here (delete this comment line) -->
<polygon points="300,60 370,220 540,240 415,360 450,530 300,450 150,530 185,360 60,240 230,220" fill="white"/>
</svg>`,
};

// Convenience: all valid emblem IDs for the logo builder picker
export const EMBLEM_IDS: EmblemID[] = ['filmcamera', 'clapperboard', 'antenna', 'directorchair', 'mountain', 'filmroll', 'crown', 'lightbulb', 'star'];
