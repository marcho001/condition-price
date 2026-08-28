// Demo 用的車輛照片：以 SVG data URI 產生，完全離線、不依賴任何外部圖床。
const JP_FONT = "Hiragino Sans, Noto Sans JP, Yu Gothic, sans-serif"

const PAINT = {
  パールホワイト: ['#eef0ef', '#cdd2d0'],
  ブラック: ['#2a2f36', '#14181d'],
  シルバー: ['#c6ccd0', '#9aa2a8'],
  ガンメタリック: ['#6b7278', '#454b51'],
  ダークブルー: ['#2b4a76', '#1c3050'],
  レッド: ['#b23a34', '#8a2721'],
  ベージュ: ['#ddceb6', '#bfae92']
}

function paint(color) {
  return PAINT[color] || ['#a9b0b4', '#7c8388']
}

function shell(inner, { bg1 = '#f4f6f4', bg2 = '#dfe4e0' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--c1)"/><stop offset="1" stop-color="var(--c2)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  ${inner}
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function bodyGrad(c) {
  const [a, b] = paint(c)
  return `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
}

function caption(text, sub) {
  return `<g font-family="${JP_FONT}">
    <text x="40" y="72" font-size="27" fill="#12151a" font-weight="600">${text}</text>
    ${sub ? `<text x="40" y="104" font-size="17" fill="#6e7873">${sub}</text>` : ''}
  </g>`
}

const wheel = (cx) =>
  `<circle cx="${cx}" cy="436" r="60" fill="#181c21"/><circle cx="${cx}" cy="436" r="27" fill="#b9c0bd"/><circle cx="${cx}" cy="436" r="12" fill="#7f8a86"/>`

function sideView(color) {
  return `<defs>${bodyGrad(color)}</defs>
  <ellipse cx="410" cy="504" rx="330" ry="20" fill="rgba(18,21,26,.10)"/>
  <path d="M92 428 L92 374 Q92 342 132 334 L248 312 Q320 232 432 230 Q550 228 618 308 L720 332 Q758 342 758 378 L758 428 Q758 440 746 440 L104 440 Q92 440 92 428 Z" fill="url(#g)"/>
  <path d="M272 308 Q332 252 424 250 L424 308 Z" fill="rgba(255,255,255,.5)"/>
  <path d="M446 250 Q534 252 590 306 L446 308 Z" fill="rgba(255,255,255,.5)"/>
  <rect x="428" y="250" width="9" height="58" fill="rgba(18,21,26,.22)"/>
  <rect x="120" y="386" width="46" height="14" rx="7" fill="rgba(255,255,255,.55)"/>
  <rect x="706" y="386" width="42" height="14" rx="7" fill="rgba(200,54,43,.6)"/>
  ${wheel(238)}${wheel(608)}`
}

function frontView(color, plate) {
  return `<defs>${bodyGrad(color)}</defs>
  <ellipse cx="400" cy="502" rx="270" ry="18" fill="rgba(18,21,26,.10)"/>
  <path d="M158 448 Q152 286 258 236 L542 236 Q648 286 642 448 Q642 462 626 462 L174 462 Q158 462 158 448 Z" fill="url(#g)"/>
  <path d="M276 252 L524 252 Q580 288 592 336 L208 336 Q220 288 276 252 Z" fill="rgba(255,255,255,.5)"/>
  <rect x="222" y="358" width="98" height="34" rx="17" fill="rgba(255,255,255,.72)"/>
  <rect x="480" y="358" width="98" height="34" rx="17" fill="rgba(255,255,255,.72)"/>
  <rect x="330" y="404" width="140" height="42" rx="8" fill="rgba(18,21,26,.34)"/>
  <rect x="352" y="414" width="96" height="22" rx="4" fill="#f3f5f2"/>
  <text x="400" y="431" text-anchor="middle" font-family="${JP_FONT}" font-size="15" fill="#12151a">${plate || ''}</text>`
}

function rearView(color) {
  return `<defs>${bodyGrad(color)}</defs>
  <ellipse cx="400" cy="502" rx="270" ry="18" fill="rgba(18,21,26,.10)"/>
  <path d="M162 448 Q158 292 262 244 L538 244 Q642 292 638 448 Q638 462 622 462 L178 462 Q162 462 162 448 Z" fill="url(#g)"/>
  <path d="M280 258 L520 258 Q570 292 582 334 L218 334 Q230 292 280 258 Z" fill="rgba(255,255,255,.42)"/>
  <rect x="196" y="356" width="118" height="36" rx="10" fill="rgba(200,54,43,.78)"/>
  <rect x="486" y="356" width="118" height="36" rx="10" fill="rgba(200,54,43,.78)"/>
  <rect x="336" y="402" width="128" height="40" rx="8" fill="rgba(18,21,26,.3)"/>`
}

function meterView(mileage) {
  const num = mileage ? Number(mileage).toLocaleString('en-US') : '— — —'
  return `<rect x="120" y="150" width="560" height="300" rx="26" fill="#171b20"/>
  <circle cx="300" cy="300" r="108" fill="none" stroke="#3a424a" stroke-width="3"/>
  <path d="M300 300 L228 236" stroke="#c8362b" stroke-width="7" stroke-linecap="round"/>
  <circle cx="300" cy="300" r="10" fill="#c8362b"/>
  <circle cx="530" cy="300" r="76" fill="none" stroke="#3a424a" stroke-width="3"/>
  <path d="M530 300 L578 252" stroke="#8f9aa2" stroke-width="5" stroke-linecap="round"/>
  <rect x="352" y="358" width="230" height="52" rx="8" fill="#0d1013"/>
  <text x="467" y="395" text-anchor="middle" font-family="Oswald, Hiragino Sans, sans-serif" font-size="34" letter-spacing="3" fill="#7ee0a5">${num}</text>
  <text x="592" y="395" font-family="${JP_FONT}" font-size="17" fill="#6d7a80">km</text>`
}

function seatView(color, label) {
  const [a] = paint(color)
  return `<rect x="150" y="170" width="500" height="290" rx="20" fill="#e8ebe7"/>
  <path d="M240 430 L240 250 Q240 214 280 214 L400 214 Q440 214 440 250 L440 430 Z" fill="${a}" opacity=".92"/>
  <path d="M240 430 L560 430 Q580 430 580 410 L580 366 Q580 346 560 346 L262 346 Z" fill="${a}" opacity=".7"/>
  <text x="180" y="212" font-family="${JP_FONT}" font-size="18" fill="#6e7873">${label}</text>`
}

function engineView() {
  return `<rect x="130" y="160" width="540" height="300" rx="20" fill="#dfe3df"/>
  <rect x="200" y="212" width="400" height="200" rx="14" fill="#5f6a70"/>
  ${[0, 1, 2, 3]
    .map((i) => `<rect x="${232 + i * 92}" y="236" width="60" height="60" rx="8" fill="#8b979d"/>`)
    .join('')}
  <rect x="232" y="322" width="336" height="18" rx="9" fill="#3f484e"/>
  <rect x="232" y="352" width="220" height="14" rx="7" fill="#3f484e"/>`
}

function sheetView(title, grade) {
  return `<rect x="112" y="70" width="576" height="470" rx="10" fill="#ffffff" stroke="#c9d0c7"/>
  <rect x="112" y="70" width="576" height="56" rx="10" fill="#12151a"/>
  <text x="140" y="106" font-family="${JP_FONT}" font-size="22" fill="#eef1ec">${title}</text>
  ${Array.from({ length: 8 })
    .map((_, i) => `<line x1="140" y1="${176 + i * 42}" x2="660" y2="${176 + i * 42}" stroke="#dfe4e0"/>`)
    .join('')}
  ${Array.from({ length: 8 })
    .map(
      (_, i) =>
        `<rect x="140" y="${160 + i * 42}" width="${120 + ((i * 47) % 210)}" height="10" rx="5" fill="#e6eae5"/>`
    )
    .join('')}
  <line x1="404" y1="150" x2="404" y2="512" stroke="#dfe4e0"/>
  ${
    grade
      ? `<circle cx="596" cy="222" r="52" fill="none" stroke="#c8362b" stroke-width="5"/>
         <text x="596" y="240" text-anchor="middle" font-family="Oswald, sans-serif" font-size="46" fill="#c8362b">${grade}</text>`
      : ''
  }`
}

function plateOf(v) {
  const p = v?.licensingPlateNumber || ''
  return p.split(' ').slice(0, 2).join(' ')
}

export function carPhoto(kind, vehicle) {
  const color = vehicle?.color
  const name = [vehicle?.makeName, vehicle?.seriesName].filter(Boolean).join(' ')
  switch (kind) {
    case 'side':
      return shell(sideView(color) + caption(name, `${vehicle?.color || ''}・サイド`))
    case 'front':
      return shell(frontView(color, plateOf(vehicle)) + caption(name, 'フロント'))
    case 'rear':
      return shell(rearView(color) + caption(name, 'リア'))
    case 'left':
      return shell(sideView(color) + caption(name, '左サイド'))
    case 'right':
      return shell(sideView(color) + caption(name, '右サイド'))
    case 'meter':
      return shell(meterView(vehicle?.mileage) + caption('走行距離メーター'), { bg1: '#e9ece9', bg2: '#cfd5d0' })
    case 'seat1':
      return shell(seatView(color, '1列目シート') + caption('1列目シート'))
    case 'seat2':
      return shell(seatView(color, '2列目シート') + caption('2列目シート'))
    case 'engine':
      return shell(engineView() + caption('エンジンルーム'))
    case 'checkFront':
      return shell(sheetView('車両チェックシート（前）', 'A'))
    case 'checkRear':
      return shell(sheetView('車両チェックシート（後）', 'A'))
    case 'checkLeft':
      return shell(sheetView('車両チェックシート（左）', 'B'))
    case 'checkRight':
      return shell(sheetView('車両チェックシート（右）', 'B'))
    case 'rating':
      return shell(sheetView('評価シート', '4.5'), { bg1: '#eef1ec', bg2: '#dbe1dc' })
    case 'condition':
      return shell(sideView(color) + caption('引取後の現況写真', '入庫時に撮影'))
    default:
      return shell(sideView(color) + caption(name, ''))
  }
}

export function placeholderPhoto() {
  return shell(
    `<g font-family="${JP_FONT}" text-anchor="middle">
      <rect x="286" y="238" width="228" height="126" rx="14" fill="none" stroke="#b9c1ba" stroke-width="3" stroke-dasharray="9 8"/>
      <text x="400" y="312" font-size="22" fill="#8e988f">画像なし</text>
    </g>`
  )
}
