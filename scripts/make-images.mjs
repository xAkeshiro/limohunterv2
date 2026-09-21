/**
 * Generates original vehicle illustrations — four views per body style
 * (side profile, front three-quarter, rear, interior). These are our own
 * generic drawings of vehicle classes, carrying no manufacturer badging, so
 * they are safe to ship while real photography is being collected.
 *
 * Replace them by uploading photos in the admin, or run `npm run import-photos`.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'img');
fs.mkdirSync(OUT, { recursive: true });

const W = 1000;
const H = 620;

/* ------------------------------------------------------------------ pieces */

const wheel = (cx, cy, r) => `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0d12"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.97}" fill="none" stroke="#1d242f" stroke-width="${r * 0.08}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="url(#rim)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="#5c6878" stroke-width="1.5"/>
    ${Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI * 2) / 8;
      return `<line x1="${cx + Math.cos(a) * r * 0.16}" y1="${cy + Math.sin(a) * r * 0.16}"
                    x2="${cx + Math.cos(a) * r * 0.54}" y2="${cy + Math.sin(a) * r * 0.54}"
                    stroke="#8b97a8" stroke-width="${r * 0.075}" stroke-linecap="round"/>`;
    }).join('')}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#aab6c6"/>
  </g>`;

const lamp = (x, y, w, h, color, o = 0.95) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${color}" opacity="${o}"/>`;

const glass = (d) => `<path d="${d}" fill="url(#glass)"/>`;

/** Repeated side windows for the long vehicles. */
function windowBand(x, y, w, h, count, gap = 9) {
  const each = (w - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) =>
    `<rect x="${x + i * (each + gap)}" y="${y}" width="${each}" height="${h}" rx="5" fill="url(#glass)"/>`,
  ).join('');
}

/* ------------------------------------------------------------- side profiles
   Each returns a drawing on a 1000x620 canvas with the ground line at y=430. */

const SIDE = {
  sedan: () => `
    <path d="M148 400 L196 400 Q214 330 286 322 L470 318 Q556 322 604 400 L700 400
             Q742 402 742 418 L742 424 L148 424 Z" fill="url(#body)"/>
    <path d="M196 400 Q214 330 286 322 L470 318 Q556 322 604 400 Z" fill="url(#roof)" opacity="0.5"/>
    ${glass('M244 396 Q258 346 300 340 L392 337 L392 396 Z')}
    ${glass('M406 337 L462 336 Q520 340 556 396 L406 396 Z')}
    <path d="M398 336 L398 398" stroke="#0c1016" stroke-width="4"/>
    <path d="M300 424 L300 402" stroke="#0c1016" stroke-width="3" opacity="0.6"/>
    <path d="M470 424 L470 402" stroke="#0c1016" stroke-width="3" opacity="0.6"/>
    <path d="M160 402 Q400 392 730 402" stroke="#c9d3e0" stroke-width="2" opacity="0.28" fill="none"/>
    ${lamp(716, 384, 26, 13, '#fff6d8')}
    ${lamp(150, 384, 20, 12, '#ff5a4a', 0.85)}
    ${wheel(292, 424, 52)} ${wheel(596, 424, 52)}`,

  stretch: () => `
    <path d="M72 400 L112 400 Q128 332 198 324 L700 320 Q790 324 836 400 L900 400
             Q938 402 938 418 L938 424 L72 424 Z" fill="url(#body)"/>
    <path d="M112 400 Q128 332 198 324 L700 320 Q790 324 836 400 Z" fill="url(#roof)" opacity="0.5"/>
    ${glass('M158 396 Q170 348 210 342 L286 340 L286 396 Z')}
    ${windowBand(302, 340, 384, 54, 5)}
    ${glass('M700 340 L742 340 Q792 346 820 396 L700 396 Z')}
    <path d="M292 338 L292 398" stroke="#0c1016" stroke-width="4"/>
    <path d="M694 338 L694 398" stroke="#0c1016" stroke-width="4"/>
    <path d="M84 402 Q500 390 928 402" stroke="#c9d3e0" stroke-width="2" opacity="0.3" fill="none"/>
    ${lamp(912, 384, 26, 13, '#fff6d8')}
    ${lamp(74, 384, 20, 12, '#ff5a4a', 0.85)}
    ${wheel(214, 424, 52)} ${wheel(828, 424, 52)}`,

  suv: () => `
    <path d="M150 400 L188 400 Q196 284 268 278 L586 276 Q664 282 676 400 L724 400
             Q760 402 760 418 L760 424 L150 424 Z" fill="url(#body)"/>
    <path d="M188 400 Q196 284 268 278 L586 276 Q664 282 676 400 Z" fill="url(#roof)" opacity="0.45"/>
    ${glass('M238 372 Q246 300 292 296 L370 294 L370 372 Z')}
    ${glass('M384 294 L472 293 L472 372 L384 372 Z')}
    ${glass('M486 294 L576 294 Q634 300 650 372 L486 372 Z')}
    <path d="M377 292 L377 374 M479 292 L479 374" stroke="#0c1016" stroke-width="4"/>
    <path d="M162 386 Q440 376 750 386" stroke="#c9d3e0" stroke-width="2" opacity="0.28" fill="none"/>
    ${lamp(730, 356, 28, 15, '#fff6d8')}
    ${lamp(152, 356, 22, 14, '#ff5a4a', 0.85)}
    ${wheel(282, 424, 58)} ${wheel(650, 424, 58)}`,

  suvStretch: () => `
    <path d="M70 400 L108 400 Q116 282 188 276 L780 274 Q860 280 872 400 L926 400
             Q958 402 958 418 L958 424 L70 424 Z" fill="url(#body)"/>
    <path d="M108 400 Q116 282 188 276 L780 274 Q860 280 872 400 Z" fill="url(#roof)" opacity="0.45"/>
    ${glass('M156 372 Q164 300 210 296 L286 294 L286 372 Z')}
    ${windowBand(302, 294, 468, 78, 5)}
    ${glass('M786 294 L800 294 Q852 300 866 372 L786 372 Z')}
    <path d="M294 292 L294 374 M778 292 L778 374" stroke="#0c1016" stroke-width="4"/>
    <path d="M82 386 Q500 376 950 386" stroke="#c9d3e0" stroke-width="2" opacity="0.3" fill="none"/>
    ${lamp(930, 356, 28, 15, '#fff6d8')}
    ${lamp(72, 356, 22, 14, '#ff5a4a', 0.85)}
    ${wheel(202, 424, 58)} ${wheel(846, 424, 58)}`,

  van: () => `
    <path d="M140 400 Q140 238 228 232 L664 230 Q744 236 758 316 L774 400
             Q806 402 806 418 L806 424 L140 424 Z" fill="url(#body)"/>
    <path d="M140 300 Q140 238 228 232 L664 230 Q744 236 758 316 Z" fill="url(#roof)" opacity="0.4"/>
    ${glass('M214 356 Q220 264 268 260 L366 258 L366 356 Z')}
    ${glass('M380 258 L484 258 L484 356 L380 356 Z')}
    ${glass('M498 258 L646 258 Q716 266 734 356 L498 356 Z')}
    <path d="M373 256 L373 358 M491 256 L491 358" stroke="#0c1016" stroke-width="4"/>
    <path d="M152 372 Q470 362 796 372" stroke="#c9d3e0" stroke-width="2" opacity="0.26" fill="none"/>
    ${lamp(776, 338, 28, 16, '#fff6d8')}
    ${lamp(142, 338, 22, 15, '#ff5a4a', 0.85)}
    ${wheel(248, 424, 56)} ${wheel(700, 424, 56)}`,

  bus: () => `
    <path d="M64 400 Q64 196 156 190 L858 188 Q944 194 948 282 L948 400
             Q948 416 934 416 L78 416 Q64 416 64 400 Z" fill="url(#body)"/>
    <path d="M64 268 Q64 196 156 190 L858 188 Q944 194 948 282 Z" fill="url(#roof)" opacity="0.4"/>
    ${glass('M112 330 Q116 230 176 226 L262 224 L262 330 Z')}
    ${windowBand(280, 224, 560, 106, 6)}
    ${glass('M856 224 L878 224 Q930 230 934 330 L856 330 Z')}
    <path d="M78 352 Q500 342 938 352" stroke="#c9d3e0" stroke-width="2.5" opacity="0.3" fill="none"/>
    <rect x="270" y="352" width="4" height="64" fill="#0c1016" opacity="0.7"/>
    ${lamp(910, 372, 30, 16, '#fff6d8')}
    ${lamp(66, 372, 24, 15, '#ff5a4a', 0.85)}
    ${wheel(190, 416, 54)} ${wheel(806, 416, 54)}`,

  antique: () => `
    <path d="M150 404 Q150 388 172 386 L206 384 Q214 328 246 322 L300 258 L520 254
             Q572 260 590 318 L648 326 Q716 336 726 386 L756 388 Q776 390 776 406
             L776 424 L150 424 Z" fill="url(#body)"/>
    ${glass('M322 300 L442 298 L442 348 L322 348 Z')}
    ${glass('M456 298 L512 298 Q556 304 570 348 L456 348 Z')}
    <path d="M449 296 L449 350" stroke="#0c1016" stroke-width="4"/>
    <path d="M206 384 Q260 340 316 332" stroke="#d8c184" stroke-width="3" fill="none" opacity="0.55"/>
    <circle cx="730" cy="352" r="19" fill="#f2e2ad" opacity="0.9"/>
    <circle cx="730" cy="352" r="19" fill="none" stroke="#d8c184" stroke-width="2.5"/>
    <path d="M642 330 Q690 326 724 340" stroke="#d8c184" stroke-width="3" fill="none" opacity="0.5"/>
    ${wheel(268, 424, 62)} ${wheel(646, 424, 62)}`,
};

/* --------------------------------------------------------- other viewpoints */

function frontThreeQuarter(tall) {
  const top = tall ? 210 : 288;
  const beltline = tall ? 330 : 360;
  return `
    <path d="M300 424 L300 ${top + 26} Q304 ${top} 352 ${top - 4} L690 ${top - 10}
             Q742 ${top - 4} 752 ${top + 30} L788 424 Z" fill="url(#body)"/>
    <path d="M318 ${beltline} Q324 ${top + 14} 366 ${top + 8} L680 ${top + 2}
             Q726 ${top + 8} 736 ${beltline} Z" fill="url(#glass)"/>
    <path d="M300 ${beltline + 18} L788 ${beltline + 12}" stroke="#c9d3e0" stroke-width="2" opacity="0.25"/>
    <rect x="316" y="${beltline + 34}" width="94" height="20" rx="9" fill="#fff6d8" opacity="0.92"/>
    <rect x="672" y="${beltline + 32}" width="94" height="20" rx="9" fill="#fff6d8" opacity="0.92"/>
    <rect x="410" y="${beltline + 52}" width="256" height="30" rx="8" fill="#0d1218" opacity="0.75"/>
    <rect x="410" y="${beltline + 52}" width="256" height="30" rx="8" fill="none" stroke="#5c6878" stroke-width="2" opacity="0.6"/>
    <rect x="352" y="398" width="372" height="18" rx="8" fill="#0d1218" opacity="0.6"/>
    ${wheel(330, 424, 40)} ${wheel(758, 424, 40)}`;
}

function rearView(tall) {
  const top = tall ? 214 : 292;
  const beltline = tall ? 334 : 362;
  return `
    <path d="M308 424 L308 ${top + 26} Q312 ${top} 358 ${top - 4} L684 ${top - 10}
             Q734 ${top - 4} 744 ${top + 30} L780 424 Z" fill="url(#body)"/>
    <path d="M330 ${beltline} Q336 ${top + 16} 374 ${top + 10} L672 ${top + 4}
             Q712 ${top + 10} 722 ${beltline} Z" fill="url(#glass)"/>
    <rect x="322" y="${beltline + 30}" width="82" height="26" rx="8" fill="#ff5a4a" opacity="0.88"/>
    <rect x="662" y="${beltline + 28}" width="82" height="26" rx="8" fill="#ff5a4a" opacity="0.88"/>
    <rect x="452" y="${beltline + 62}" width="168" height="26" rx="5" fill="#e7ecf3" opacity="0.9"/>
    <rect x="452" y="${beltline + 62}" width="168" height="26" rx="5" fill="none" stroke="#8b97a8" stroke-width="1.5"/>
    <path d="M330 ${beltline + 16} L742 ${beltline + 12}" stroke="#c9d3e0" stroke-width="2" opacity="0.22"/>
    ${wheel(340, 424, 40)} ${wheel(748, 424, 40)}`;
}

function interior() {
  const seat = (x, y, w, h) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#leather)"/>
    <rect x="${x + 8}" y="${y + 10}" width="${w - 16}" height="${h - 20}" rx="10" fill="none"
          stroke="#2c3542" stroke-width="2" opacity="0.8"/>
    ${Array.from({ length: 3 }, (_, i) =>
      `<line x1="${x + 14}" y1="${y + 22 + i * ((h - 44) / 2)}" x2="${x + w - 14}" y2="${y + 22 + i * ((h - 44) / 2)}"
             stroke="#394453" stroke-width="2" opacity="0.7"/>`).join('')}`;

  return `
    <path d="M120 150 L880 150 L840 470 L160 470 Z" fill="#11161f"/>
    <path d="M120 150 L880 150 L864 218 L136 218 Z" fill="#161d28"/>
    ${Array.from({ length: 9 }, (_, i) =>
      `<circle cx="${168 + i * 84}" cy="184" r="5" fill="#e6bf57" opacity="0.85"/>`).join('')}
    <path d="M136 218 L864 218" stroke="#e6bf57" stroke-width="2" opacity="0.4"/>
    ${seat(150, 250, 200, 200)}
    ${seat(650, 250, 200, 200)}
    ${seat(388, 300, 224, 150)}
    <rect x="388" y="250" width="224" height="34" rx="8" fill="#1b2230"/>
    <rect x="404" y="258" width="46" height="18" rx="4" fill="#9fb0c8" opacity="0.5"/>
    <rect x="462" y="258" width="46" height="18" rx="4" fill="#9fb0c8" opacity="0.5"/>
    <rect x="520" y="258" width="46" height="18" rx="4" fill="#9fb0c8" opacity="0.5"/>
    <path d="M160 470 L840 470" stroke="#e6bf57" stroke-width="2.5" opacity="0.35"/>
    <ellipse cx="500" cy="200" rx="250" ry="40" fill="#e6bf57" opacity="0.06"/>`;
}

/* ------------------------------------------------------------------ assembly */

function frame(inner, label, tint, showGround = true) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#202838"/><stop offset="55%" stop-color="#151b26"/>
      <stop offset="100%" stop-color="#0b0e14"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tint}"/><stop offset="48%" stop-color="${tint}"/>
      <stop offset="100%" stop-color="#0c1016"/>
    </linearGradient>
    <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#7f93ad" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#1b2431" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7d8a9b"/><stop offset="100%" stop-color="#39434f"/>
    </linearGradient>
    <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#26303d"/><stop offset="100%" stop-color="#151c26"/>
    </linearGradient>
    <radialGradient id="pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e6bf57" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#e6bf57" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="500" cy="330" rx="430" ry="230" fill="url(#pool)"/>
  ${showGround ? `<ellipse cx="500" cy="436" rx="400" ry="30" fill="#05070a" opacity="0.55"/>` : ''}
  ${inner}
  <text x="500" y="560" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif"
        font-size="20" letter-spacing="4" fill="#8fa0b8" opacity="0.6">${label.toUpperCase()}</text>
</svg>
`;
}

const FAMILY = {
  'stretch-limousine': { side: 'stretch', tall: false },
  'suv-stretch': { side: 'suvStretch', tall: true },
  sedan: { side: 'sedan', tall: false },
  suv: { side: 'suv', tall: true },
  'shuttle-bus': { side: 'bus', tall: true },
  motorcoach: { side: 'bus', tall: true },
  'sprinter-van': { side: 'van', tall: true },
  'party-bus': { side: 'bus', tall: true },
  'ceo-mobile-office': { side: 'van', tall: true },
  antique: { side: 'antique', tall: false },
};

const TINT = '#2f3948';
let count = 0;

for (const [slug, cfg] of Object.entries(FAMILY)) {
  const label = slug.replace(/-/g, ' ');
  const views = [
    frame(SIDE[cfg.side](), label, TINT),
    frame(frontThreeQuarter(cfg.tall), `${label} front`, TINT),
    frame(rearView(cfg.tall), `${label} rear`, TINT),
    frame(interior(), `${label} interior`, TINT, false),
  ];
  views.forEach((svg, i) => {
    fs.writeFileSync(path.join(OUT, `${slug}-${i + 1}.svg`), svg);
    count += 1;
  });
}

fs.writeFileSync(path.join(OUT, 'placeholder.svg'), frame(SIDE.sedan(), 'vehicle', TINT));
console.log(`generated ${count + 1} vehicle illustrations in public/img`);
