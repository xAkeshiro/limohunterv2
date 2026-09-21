/**
 * Generates original placeholder artwork (simple side-profile silhouettes) for
 * each body style, so the marketplace renders completely before real
 * photography is dropped in. Swap these files for real photos when available.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'img');
fs.mkdirSync(OUT, { recursive: true });

const wheel = (cx, cy, r) => `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0e13" stroke="#3a4454" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#2a323f"/>`;

/** Each builder returns the body outline for one vehicle family. */
const SHAPES = {
  sedan: () => `
    <path d="M150 300 L190 300 Q210 248 260 244 L470 244 Q520 248 552 300 L620 300 Q650 302 650 326 L650 352 Q650 362 638 362 L162 362 Q150 362 150 352 Z" fill="url(#body)"/>
    <path d="M228 296 Q244 262 276 260 L386 260 L386 296 Z" fill="#16202e" opacity="0.85"/>
    <path d="M402 260 L468 260 Q504 264 528 296 L402 296 Z" fill="#16202e" opacity="0.85"/>
    ${wheel(262, 362, 40)} ${wheel(556, 362, 40)}`,

  stretch: () => `
    <path d="M90 302 L128 302 Q146 252 196 248 L604 248 Q662 252 694 302 L742 302 Q772 304 772 328 L772 354 Q772 364 760 364 L102 364 Q90 364 90 354 Z" fill="url(#body)"/>
    <path d="M168 298 Q182 266 214 264 L300 264 L300 298 Z" fill="#16202e" opacity="0.85"/>
    <rect x="318" y="266" width="84" height="32" rx="6" fill="#16202e" opacity="0.7"/>
    <rect x="420" y="266" width="84" height="32" rx="6" fill="#16202e" opacity="0.7"/>
    <path d="M522 264 L598 264 Q640 268 668 298 L522 298 Z" fill="#16202e" opacity="0.85"/>
    ${wheel(200, 364, 40)} ${wheel(690, 364, 40)}`,

  suv: () => `
    <path d="M150 300 L178 300 Q188 226 250 222 L500 222 Q566 226 578 300 L636 300 Q664 302 664 326 L664 352 Q664 362 652 362 L162 362 Q150 362 150 352 Z" fill="url(#body)"/>
    <rect x="214" y="240" width="112" height="56" rx="8" fill="#16202e" opacity="0.85"/>
    <rect x="342" y="240" width="108" height="56" rx="8" fill="#16202e" opacity="0.85"/>
    <path d="M466 240 L502 240 Q544 246 556 296 L466 296 Z" fill="#16202e" opacity="0.85"/>
    ${wheel(252, 362, 44)} ${wheel(572, 362, 44)}`,

  suvStretch: () => `
    <path d="M86 300 L114 300 Q124 224 186 220 L622 220 Q690 224 702 300 L746 300 Q774 302 774 326 L774 352 Q774 362 762 362 L98 362 Q86 362 86 352 Z" fill="url(#body)"/>
    <rect x="150" y="238" width="104" height="58" rx="8" fill="#16202e" opacity="0.85"/>
    <rect x="270" y="238" width="96" height="58" rx="8" fill="#16202e" opacity="0.7"/>
    <rect x="382" y="238" width="96" height="58" rx="8" fill="#16202e" opacity="0.7"/>
    <rect x="494" y="238" width="96" height="58" rx="8" fill="#16202e" opacity="0.7"/>
    <path d="M606 238 L626 238 Q672 244 684 296 L606 296 Z" fill="#16202e" opacity="0.85"/>
    ${wheel(190, 362, 44)} ${wheel(688, 362, 44)}`,

  van: () => `
    <path d="M140 300 Q140 200 214 196 L560 196 Q642 200 650 264 L664 300 Q688 304 688 328 L688 352 Q688 362 676 362 L152 362 Q140 362 140 352 Z" fill="url(#body)"/>
    <rect x="196" y="218" width="120" height="62" rx="8" fill="#16202e" opacity="0.85"/>
    <rect x="332" y="218" width="120" height="62" rx="8" fill="#16202e" opacity="0.75"/>
    <path d="M468 218 L556 218 Q612 224 626 280 L468 280 Z" fill="#16202e" opacity="0.85"/>
    ${wheel(232, 362, 42)} ${wheel(596, 362, 42)}`,

  bus: () => `
    <path d="M72 316 Q72 180 158 176 L706 176 Q782 180 786 260 L786 344 Q786 356 772 356 L86 356 Q72 356 72 344 Z" fill="url(#body)"/>
    <rect x="118" y="204" width="118" height="70" rx="8" fill="#16202e" opacity="0.8"/>
    <rect x="252" y="204" width="118" height="70" rx="8" fill="#16202e" opacity="0.8"/>
    <rect x="386" y="204" width="118" height="70" rx="8" fill="#16202e" opacity="0.8"/>
    <rect x="520" y="204" width="118" height="70" rx="8" fill="#16202e" opacity="0.8"/>
    <rect x="654" y="204" width="102" height="70" rx="8" fill="#16202e" opacity="0.9"/>
    ${wheel(180, 356, 44)} ${wheel(664, 356, 44)}`,

  antique: () => `
    <path d="M160 316 L196 316 Q206 252 252 248 L300 210 L470 210 Q516 214 534 250 L580 258 Q634 266 640 316 L648 316 Q672 318 672 338 L672 356 Q672 366 660 366 L172 366 Q160 366 160 356 Z" fill="url(#body)"/>
    <path d="M318 226 L456 226 Q492 230 506 256 L318 256 Z" fill="#16202e" opacity="0.85"/>
    <circle cx="646" cy="292" r="14" fill="#e6bf57" opacity="0.75"/>
    ${wheel(262, 366, 48)} ${wheel(584, 366, 48)}`,
};

const FAMILY = {
  'stretch-limousine': 'stretch',
  'suv-stretch': 'suvStretch',
  sedan: 'sedan',
  suv: 'suv',
  'shuttle-bus': 'bus',
  motorcoach: 'bus',
  'sprinter-van': 'van',
  'party-bus': 'bus',
  'ceo-mobile-office': 'van',
  antique: 'antique',
};

function svg(family, label, tint) {
  const shape = SHAPES[family] ?? SHAPES.sedan;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 520" width="860" height="520" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2130"/>
      <stop offset="100%" stop-color="#0c1017"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tint}"/>
      <stop offset="100%" stop-color="#11161f"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="72%" r="55%">
      <stop offset="0%" stop-color="#e6bf57" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#e6bf57" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="860" height="520" fill="url(#bg)"/>
  <rect width="860" height="520" fill="url(#glow)"/>
  <g opacity="0.07" stroke="#9fb0c8" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 52}" x2="860" y2="${i * 52}"/>`).join('')}
  </g>
  <ellipse cx="430" cy="404" rx="300" ry="26" fill="#000" opacity="0.4"/>
  <g transform="translate(0,28)">${shape()}</g>
  <text x="430" y="474" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif"
        font-size="21" letter-spacing="3.5" fill="#8fa0b8" opacity="0.72">${label.toUpperCase()}</text>
</svg>
`;
}

const TINTS = ['#2d3646', '#333d4f', '#28313f', '#3a4557'];
let count = 0;

for (const [slug, family] of Object.entries(FAMILY)) {
  const label = slug.replace(/-/g, ' ');
  TINTS.forEach((tint, i) => {
    fs.writeFileSync(path.join(OUT, `${slug}-${i + 1}.svg`), svg(family, label, tint));
    count += 1;
  });
}

fs.writeFileSync(
  path.join(OUT, 'placeholder.svg'),
  svg('sedan', 'limohunter', '#2d3646'),
);

console.log(`generated ${count + 1} placeholder images in public/img`);
