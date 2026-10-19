import dayjs from 'dayjs'
import { VEHICLE_STATUS, ROUND_STATUS, NOTICE_TYPE } from './constants.js'
import { noticeText } from './noticeText.js'

export const SEED_VERSION = 3

const d = (n) => dayjs().add(n, 'day').format('YYYY-MM-DD')
const ts = (n, h = 10, m = 20) => dayjs().add(n, 'day').hour(h).minute(m).second(0).millisecond(0).valueOf()
// 今天的時間點若還沒到，改用「現在」，避免通知時間落在未來
const tsToday = (h, m) => Math.min(ts(0, h, m), Date.now() - 60000)

// 內部收車後上傳的照片（外觀前／後／左／右、走行距離メーター、座席・エンジン等部位照片）
const UPLOADED_PHOTOS = [
  ['side', '車両写真_サイド.jpg'],
  ['front', '車両写真_フロント.jpg'],
  ['rear', '車両写真_リア.jpg'],
  ['left', '車両写真_左.jpg'],
  ['right', '車両写真_右.jpg'],
  ['meter', '走行距離メーター.jpg'],
  ['seat1', '1列目シート.jpg'],
  ['seat2', '2列目シート.jpg'],
  ['engine', 'エンジン写真.jpg'],
  ['checkFront', '車両チェックシート_前.jpg'],
  ['checkRear', '車両チェックシート_後.jpg']
]

// 附件不從進件資料帶入 —— 全部附件一律由內部於「車輛詳細」彈窗自行上傳。
// 上傳順序即對外站的照片順序，第一張同時為對外列表卡片的封面照。
// 不給 files 代表一張都沒上傳：對外卡片顯示車輛示意圖、詳細頁以 empty component 呈現「尚無照片」
function attachments(id, { condition = false, rating = false } = {}) {
  const list = UPLOADED_PHOTOS.map(([kind, name], i) => ({
    id: `${id}-a${i}`,
    name,
    kind,
    mime: 'image/jpeg',
    uploader: '田中 健一',
    uploadedAt: ts(-8, 10, i)
  }))
  if (condition) {
    list.push({
      id: `${id}-c1`,
      name: '引取後現況_外装.jpg',
      kind: 'condition',
      mime: 'image/jpeg',
      uploader: '田中 健一',
      uploadedAt: ts(-6, 14, 12)
    })
  }
  if (rating) {
    list.push({
      id: `${id}-r1`,
      name: '評価シート.pdf',
      kind: 'rating',
      mime: 'application/pdf',
      uploader: '田中 健一',
      uploadedAt: ts(-5, 11, 30)
    })
  }
  return list
}

// 車輛：[id, orderNo, ナンバー, メーカー, 車系, モデル, グレード, 年式, 色, 燃料, 排気量, 車台番号, 移転回数]
function mk(row, o = {}) {
  const [id, orderNo, plate, make, series, yearName, grade, carYear, color, fuel, disp, vin, transfer] = row
  return {
    id,
    orderNo,
    // 進件資料（唯讀，不寫回 order）
    intake: {
      makeName: make,
      seriesName: series,
      yearName,
      modelName: grade,
      carYear,
      color,
      fuelType: fuel,
      displacement: disp,
      vin,
      licensingPlateNumber: plate,
      productDate: `${carYear}-04-18`,
      registeDate: `${carYear}-05`,
      vehicleUsageType: '自家用',
      transferCount: transfer
    },
    // 收車後現況（走行距離・備考），另存於本模組
    current: o.current || {},
    receivedAt: o.receivedAt,
    status: o.status,
    attachments: o.files ? attachments(id, o.files) : [],
    fieldLogs: o.fieldLogs || []
  }
}

const S = VEHICLE_STATUS

export function buildSeed() {
  const dealer = (id, name, contactName, phone, email, extra = {}) => ({
    id,
    name,
    contactName,
    phone,
    email,
    password: 'demo1234',
    status: 'ACTIVE',
    locked: false,
    loginFailCount: 0,
    remark: '',
    createdAt: ts(-180),
    ...extra
  })

  const dealers = [
    dealer('DL01', '山田商事株式会社', '山田 太郎', '090-1234-5678', 'yamada@example.co.jp', {
      remark: '関東エリア・年間 200 台規模'
    }),
    dealer('DL02', '鈴木自動車販売', '鈴木 一郎', '090-2345-6789', 'suzuki@example.co.jp'),
    dealer('DL03', '田中モータース', '田中 次郎', '080-3456-7890', 'tanaka@example.co.jp', {
      remark: '軽自動車を中心に仕入',
      createdAt: ts(-150)
    }),
    dealer('DL04', '佐藤オートセールス', '佐藤 花子', '080-4567-8901', 'sato@example.co.jp', { createdAt: ts(-90) }),
    dealer('DL05', '高橋カーズ', '高橋 健', '070-5678-9012', 'takahashi@example.co.jp', {
      status: 'INACTIVE',
      remark: '取引一時停止中（ログイン不可）',
      createdAt: ts(-200)
    }),
    // ログイン 5 回失敗でシステムが自動ロック（内部の「解鎖」でのみ復旧）
    dealer('DL06', '伊藤モーターサービス', '伊藤 大輔', '070-6789-0123', 'ito@example.co.jp', {
      locked: true,
      loginFailCount: 5,
      remark: 'ログイン連続失敗によりロック中',
      createdAt: ts(-120)
    })
  ]

  const vehicles = [
    // ── 待排定拍賣（車輛管理）─────────────────────
    mk(['V2601', '20260712430', '品川 300 あ 12-34', 'トヨタ', 'プリウス', 'ZVW51', 'S ツーリングセレクション', '2019', 'パールホワイト', 'ハイブリッド', '1,797 cc', 'ZVW51-8031452', '1'], {
      receivedAt: d(-6),
      status: S.PENDING_SCHEDULE,
      current: { mileage: 52300, remark: '左フロントフェンダーに 5cm 程度の擦り傷あり。内装は良好。' },
      files: { condition: true, rating: true },
      fieldLogs: [
        { field: 'mileage', before: '', after: 52300, operator: '田中 健一', at: ts(-6, 14, 10) },
        { field: 'remark', before: '', after: '左フロントフェンダーに 5cm 程度の擦り傷あり。内装は良好。', operator: '田中 健一', at: ts(-6, 14, 12) }
      ]
    }),
    mk(['V2602', '20260714743', '横浜 500 さ 56-78', 'ホンダ', 'フィット', 'GR3', 'e:HEV HOME', '2021', 'ブラック', 'ハイブリッド', '1,496 cc', 'GR3-1104822', '0'], {
      receivedAt: d(-4),
      status: S.PENDING_SCHEDULE
    }),
    mk(['V2603', '20260716318', '足立 300 な 90-12', '日産', 'セレナ', 'C27', 'ハイウェイスター V', '2018', 'ガンメタリック', 'ガソリン', '1,997 cc', 'C27-0448120', '2'], {
      receivedAt: d(-3),
      status: S.PENDING_SCHEDULE,
      current: { mileage: 78400 },
      files: { condition: true }
    }),
    mk(['V2604', '20260718205', '大宮 300 ほ 34-56', 'マツダ', 'CX-5', 'KF2P', 'XD プロアクティブ', '2020', 'レッド', 'ディーゼル', '2,188 cc', 'KF2P-2201884', '1'], {
      receivedAt: d(-2),
      status: S.PENDING_SCHEDULE,
      current: { mileage: 44120, remark: 'リアバンパー右側に補修跡。スペアキー 1 本欠品。' },
      files: { condition: true, rating: true }
    }),
    mk(['V2605', '20260720228', '所沢 300 め 78-90', 'スバル', 'フォレスター', 'SK9', 'Premium', '2019', 'ダークブルー', 'ガソリン', '2,498 cc', 'SK9-0093311', '1'], {
      receivedAt: d(-1),
      status: S.PENDING_SCHEDULE
    }),

    // ── 待開始 ───────────────────────────────
    mk(['V2595', '20260704117', '品川 330 ほ 41-07', 'トヨタ', 'ノア', 'ZWR90W', 'S-Z', '2022', 'シルバー', 'ハイブリッド', '1,797 cc', 'ZWR90-0012845', '0'], {
      receivedAt: d(-9),
      status: S.NOT_STARTED,
      current: { mileage: 18700 },
      files: { condition: true }
    }),
    mk(['V2596', '20260705302', '練馬 300 え 62-15', 'ホンダ', 'ステップワゴン', 'RP6', 'スパーダ', '2022', 'ブラック', 'ガソリン', '1,496 cc', 'RP6-1033920', '0'], {
      receivedAt: d(-8),
      status: S.NOT_STARTED,
      current: { mileage: 24100 },
      files: {}
    }),
    mk(['V2597', '20260706458', '多摩 500 ち 88-31', 'トヨタ', 'ルーミー', 'M900A', 'カスタム G', '2021', 'パールホワイト', 'ガソリン', '996 cc', 'M900A-0551873', '1'], {
      receivedAt: d(-7),
      status: S.NOT_STARTED,
      current: { mileage: 30550 }
    }),
    mk(['V2589', '20260616742', '杉並 300 そ 27-91', 'ホンダ', 'シビック', 'FL1', 'EX', '2022', 'ダークブルー', 'ガソリン', '1,496 cc', 'FL1-1006512', '0'], {
      receivedAt: d(-25),
      status: S.NOT_STARTED,
      current: { mileage: 15800, remark: '第 1 ラウンドは価格が想定を下回ったため、追加ラウンドを予定。' },
      files: { condition: true }
    }),

    // ── 拍賣進行中 ─────────────────────────────
    mk(['V2591', '20260628706', '練馬 300 ら 11-22', 'トヨタ', 'アルファード', 'AGH30W', '2.5S C パッケージ', '2019', 'ブラック', 'ガソリン', '2,493 cc', 'AGH30-0331207', '1'], {
      receivedAt: d(-14),
      status: S.IN_AUCTION,
      current: { mileage: 61800, remark: '禁煙車。純正ナビ・後席モニター付き。' },
      files: { condition: true, rating: true }
    }),
    mk(['V2592', '20260630431', '春日部 580 と 33-44', 'スズキ', 'ハスラー', 'MR52S', 'ハイブリッド X', '2020', 'ベージュ', 'ハイブリッド', '658 cc', 'MR52S-0182233', '0'], {
      receivedAt: d(-12),
      status: S.IN_AUCTION,
      current: { mileage: 23600 },
      files: { condition: true }
    }),
    mk(['V2593', '20260620290', '世田谷 300 は 55-66', 'レクサス', 'RX', 'AGL25W', 'RX300 F SPORT', '2020', 'シルバー', 'ガソリン', '1,998 cc', 'AGL25-0022917', '1'], {
      receivedAt: d(-22),
      status: S.IN_AUCTION,
      current: { mileage: 38900, remark: '第 1 ラウンドは価格が想定を下回ったため、追加ラウンドを実施。' },
      files: { condition: true, rating: true }
    }),
    mk(['V2594', '20260702336', '川口 580 ゆ 77-88', 'ダイハツ', 'タント', 'LA650S', 'カスタム RS', '2021', 'パールホワイト', 'ガソリン', '658 cc', 'LA650S-0311455', '0'], {
      receivedAt: d(-10),
      status: S.IN_AUCTION,
      current: { mileage: 18200 }
    }),
    mk(['V2598', '20260708633', '多摩 580 ま 78-90', 'スズキ', 'ジムニー', 'JB64W', 'XC', '2022', 'レッド', 'ガソリン', '658 cc', 'JB64W-2345678', '0'], {
      receivedAt: d(-6),
      status: S.IN_AUCTION,
      current: { mileage: 9800 },
      files: {}
    }),

    // ── 已結標 ─────────────────────────────────
    mk(['V2585', '20260610113', '横浜 300 ま 99-00', 'トヨタ', 'ハリアー', 'MXUA80', 'G レザーパッケージ', '2020', 'ガンメタリック', 'ガソリン', '1,986 cc', 'MXUA80-0047733', '1'], {
      receivedAt: d(-26),
      status: S.CLOSED,
      current: { mileage: 41500 },
      files: { condition: true, rating: true }
    }),
    mk(['V2586', '20260612989', '柏 300 き 21-43', 'ホンダ', 'ヴェゼル', 'RV5', 'e:HEV Z', '2021', 'ブラック', 'ハイブリッド', '1,496 cc', 'RV5-1029844', '0'], {
      receivedAt: d(-24),
      status: S.CLOSED,
      current: { mileage: 26700, remark: '最高額が同額。' },
      files: { condition: true }
    }),
    mk(['V2587', '20260614566', '習志野 300 の 65-87', '三菱', 'デリカ D:5', 'CV1W', 'P', '2019', 'ダークブルー', 'ディーゼル', '2,267 cc', 'CV1W-0300218', '2'], {
      receivedAt: d(-23),
      status: S.CLOSED,
      current: { mileage: 96300, remark: '走行距離が多く、第 1 ラウンドは応札なし。' }
    }),
    mk(['V2588', '20260615720', '大宮 500 と 44-55', 'スズキ', 'スイフト', 'ZC13S', 'RS', '2019', 'レッド', 'ガソリン', '996 cc', 'ZC13S-0105524', '1'], {
      receivedAt: d(-22),
      status: S.CLOSED,
      current: { mileage: 47300 },
      files: {}
    }),

    // ── 已決標 ─────────────────────────────────
    mk(['V2578', '20260528182', '八王子 500 ふ 10-08', '日産', 'ノート', 'E13', 'e-POWER X', '2021', 'シルバー', 'ハイブリッド', '1,198 cc', 'E13-0155922', '0'], {
      receivedAt: d(-40),
      status: S.AWARDED,
      current: { mileage: 21400 },
      files: { condition: true, rating: true }
    }),
    mk(['V2579', '20260530494', '千葉 500 む 32-10', 'トヨタ', 'ヤリス', 'MXPA10', 'X', '2020', 'パールホワイト', 'ガソリン', '1,490 cc', 'MXPA10-2011630', '1'], {
      receivedAt: d(-38),
      status: S.AWARDED,
      current: { mileage: 39800 },
      files: { condition: true }
    }),
    mk(['V2580', '20260520087', '世田谷 330 ふ 34-56', 'マツダ', 'CX-8', 'KG2P', 'XD L パッケージ', '2019', 'ガンメタリック', 'ディーゼル', '2,188 cc', 'KG2P-0219874', '1'], {
      receivedAt: d(-45),
      status: S.AWARDED,
      current: { mileage: 55200 },
      files: { rating: true }
    })
  ]

  // 開始日 00:00 時啟用中的廠商＝首輪的「全體廠商」。高橋カーズ（DL05）是最近才停用的，
  // 因此已結標以前的輪次仍在名單內（其出價列入排名、標示「停用」、不可被指定成交）
  const PAST_ALL = ['DL01', 'DL02', 'DL03', 'DL04', 'DL05', 'DL06']
  const NOW_ALL = ['DL01', 'DL02', 'DL03', 'DL04', 'DL06']

  const round = (id, vehicleId, no, startDate, endDate, o = {}) => ({
    id,
    vehicleId,
    round: no,
    batchId: o.batchId ?? null,
    startDate,
    endDate,
    startPrice: o.startPrice ?? 0,
    inviteeIds: o.inviteeIds === undefined ? [...PAST_ALL] : o.inviteeIds,
    status: o.status ?? ROUND_STATUS.CLOSED,
    createdBy: o.createdBy ?? '田中 健一',
    createdAt: o.createdAt ?? ts(-30),
    urgeLogs: o.urgeLogs ?? [],
    autoUrgeSent: o.autoUrgeSent ?? true,
    noticeSent: o.noticeSent ?? true
  })

  const OPEN = ROUND_STATUS.OPEN
  const PENDING = ROUND_STATUS.PENDING

  const rounds = [
    // 待開始：同一批次的ノア／ステップワゴン（開始日 +2），首輪名單於開始日 00:00 才確定
    round('R2595-1', 'V2595', 1, d(2), d(9), { batchId: 'BT-C', status: PENDING, inviteeIds: null, autoUrgeSent: false, noticeSent: false, createdAt: ts(-1, 16, 5) }),
    round('R2596-1', 'V2596', 1, d(2), d(9), { batchId: 'BT-C', status: PENDING, inviteeIds: null, autoUrgeSent: false, noticeSent: false, createdAt: ts(-1, 16, 5) }),
    round('R2597-1', 'V2597', 1, d(5), d(12), { batchId: 'BT-D', status: PENDING, inviteeIds: null, autoUrgeSent: false, noticeSent: false, createdBy: '中村 誠', createdAt: ts(-1, 11, 40) }),
    // 待開始的加價輪：シビック第 1 輪結標後發起，明天開始，只邀請 2 家
    round('R2589-1', 'V2589', 1, d(-10), d(-3), { batchId: 'BT-X' }),
    round('R2589-2', 'V2589', 2, d(1), d(6), { status: PENDING, startPrice: 1980000, inviteeIds: ['DL01', 'DL02'], autoUrgeSent: false, noticeSent: false, createdBy: '中村 誠', createdAt: ts(-1, 15, 30) }),

    // 拍賣進行中
    round('R2591-1', 'V2591', 1, d(-1), d(2), { batchId: 'BT-A', status: OPEN, inviteeIds: [...NOW_ALL], autoUrgeSent: false, createdAt: ts(-2, 17, 30) }),
    round('R2594-1', 'V2594', 1, d(-1), d(2), { batchId: 'BT-A', status: OPEN, inviteeIds: [...NOW_ALL], autoUrgeSent: false, createdAt: ts(-2, 17, 30) }),
    round('R2592-1', 'V2592', 1, d(-5), d(0), {
      batchId: 'BT-B',
      status: OPEN,
      inviteeIds: [...NOW_ALL],
      createdAt: ts(-5, 9, 30),
      urgeLogs: [{ by: null, auto: true, at: ts(-2, 9, 0), targets: ['DL01', 'DL03', 'DL04', 'DL06'] }]
    }),
    round('R2593-1', 'V2593', 1, d(-14), d(-7), { batchId: 'BT-Y', createdAt: ts(-14, 9, 30) }),
    round('R2593-2', 'V2593', 2, d(-4), d(3), {
      status: OPEN,
      startPrice: 2850000,
      inviteeIds: ['DL01', 'DL02', 'DL03'],
      autoUrgeSent: false,
      createdBy: '中村 誠',
      createdAt: ts(-4, 15, 10)
    }),
    round('R2598-1', 'V2598', 1, d(0), d(1), { batchId: 'BT-E', status: OPEN, inviteeIds: [...NOW_ALL], createdAt: tsToday(9, 5) }),

    // 已結標
    round('R2585-1', 'V2585', 1, d(-9), d(-1), { batchId: 'BT-F' }),
    round('R2586-1', 'V2586', 1, d(-9), d(-2), { batchId: 'BT-F' }),
    round('R2587-1', 'V2587', 1, d(-10), d(-3), { batchId: 'BT-X' }),
    round('R2588-1', 'V2588', 1, d(-10), d(-3), { batchId: 'BT-X' }),

    // 已決標
    round('R2578-1', 'V2578', 1, d(-20), d(-13), { batchId: 'BT-G' }),
    round('R2579-1', 'V2579', 1, d(-21), d(-14), { batchId: 'BT-H' }),
    round('R2580-1', 'V2580', 1, d(-30), d(-23), { batchId: 'BT-I' }),
    round('R2580-2', 'V2580', 2, d(-20), d(-14), { startPrice: 2310000, inviteeIds: ['DL01', 'DL03', 'DL04'], createdBy: '中村 誠', createdAt: ts(-21, 15) })
  ]

  // 排定批次（上架通知依批次歸組，一個批次只發一封）
  const batch = (id, roundIds, startDate, endDate, o = {}) => ({
    id,
    roundIds,
    startDate,
    endDate,
    operator: o.operator ?? '田中 健一',
    at: o.at ?? ts(-30),
    noticeSent: o.noticeSent ?? true
  })
  const batches = [
    batch('BT-A', ['R2591-1', 'R2594-1'], d(-1), d(2), { at: ts(-2, 17, 30) }),
    batch('BT-B', ['R2592-1'], d(-5), d(0), { at: ts(-5, 9, 30) }),
    batch('BT-C', ['R2595-1', 'R2596-1'], d(2), d(9), { at: ts(-1, 16, 5), noticeSent: false }),
    batch('BT-D', ['R2597-1'], d(5), d(12), { operator: '中村 誠', at: ts(-1, 11, 40), noticeSent: false }),
    batch('BT-E', ['R2598-1'], d(0), d(1), { at: tsToday(9, 5) })
  ]

  const bid = (roundId, dealerId, amount, at, history) => ({
    id: `${roundId}-${dealerId}`,
    roundId,
    dealerId,
    amount,
    at,
    history: history || [{ amount, at }]
  })

  const bids = [
    bid('R2591-1', 'DL01', 1520000, ts(-1, 11, 5), [
      { amount: 1450000, at: ts(-1, 9, 40) },
      { amount: 1520000, at: ts(-1, 11, 5) }
    ]),
    bid('R2591-1', 'DL02', 1480000, ts(-1, 18, 22)),
    bid('R2591-1', 'DL03', 1505000, ts(-1, 21, 48)),

    bid('R2592-1', 'DL02', 620000, ts(-3, 13, 15)),

    bid('R2593-1', 'DL01', 2850000, ts(-9, 10, 12)),
    bid('R2593-1', 'DL02', 2610000, ts(-8, 17, 30)),
    bid('R2593-2', 'DL01', 2980000, ts(-2, 10, 44)),
    bid('R2593-2', 'DL03', 2920000, ts(-1, 15, 3)),

    bid('R2589-1', 'DL01', 1980000, ts(-6, 10, 20)),
    bid('R2589-1', 'DL02', 1850000, ts(-5, 16, 2)),

    // ハリアー：停用中の高橋カーズが最高額（排名に残るが指定不可）
    bid('R2585-1', 'DL01', 1760000, ts(-4, 10, 0)),
    bid('R2585-1', 'DL02', 1820000, ts(-2, 20, 41)),
    bid('R2585-1', 'DL03', 1690000, ts(-3, 9, 25)),
    bid('R2585-1', 'DL05', 1880000, ts(-5, 15, 10)),

    // ヴェゼル：最高額 2 社同額（「同價」標籤）
    bid('R2586-1', 'DL01', 1340000, ts(-5, 14, 8)),
    bid('R2586-1', 'DL02', 1340000, ts(-4, 19, 55)),
    bid('R2586-1', 'DL03', 1120000, ts(-6, 8, 30)),

    // スイフト：入札は停用中の高橋カーズのみ → 指定成交 disable
    bid('R2588-1', 'DL05', 640000, ts(-7, 11, 45)),

    bid('R2578-1', 'DL01', 1180000, ts(-15, 11, 20)),
    bid('R2578-1', 'DL02', 1090000, ts(-16, 16, 45)),

    bid('R2579-1', 'DL02', 985000, ts(-16, 10, 5)),
    bid('R2579-1', 'DL03', 985000, ts(-15, 18, 12)),

    bid('R2580-1', 'DL01', 2310000, ts(-25, 13, 0)),
    bid('R2580-1', 'DL04', 2150000, ts(-24, 9, 30)),
    bid('R2580-2', 'DL01', 2380000, ts(-17, 10, 10)),
    bid('R2580-2', 'DL03', 2450000, ts(-16, 14, 40))
  ]

  // 貸後端尚未呼叫「收車通知」的訂單。Demo 控制台可代替貸後團隊呼叫，
  // 本模組依 orderNo 自行取進件車輛資料建檔（車輛資料不隨 payload 傳入、附件不帶入）
  const intakePool = [
    mk(['V2606', '20260726611', '千葉 300 ら 24-68', 'トヨタ', 'ヴォクシー', 'ZWR90', 'S-Z', '2022', 'ブラック', 'ハイブリッド', '1,797 cc', 'ZWR90-0071233', '0']),
    mk(['V2607', '20260728904', '名古屋 500 ゆ 13-57', 'ホンダ', 'N-BOX', 'JF3', 'G・L ホンダセンシング', '2020', 'パールホワイト', 'ガソリン', '658 cc', 'JF3-1450922', '1'])
  ].map((vehicle) => ({ orderNo: vehicle.orderNo, vehicle }))

  const awards = [
    { vehicleId: 'V2578', roundId: 'R2578-1', dealerId: 'DL01', amount: 1180000, operator: '中村 誠', at: ts(-12, 10, 30), settled: false, settledAt: null },
    // 最高額 2 社同額 → 操作人員が鈴木を選んで成交
    { vehicleId: 'V2579', roundId: 'R2579-1', dealerId: 'DL02', amount: 985000, operator: '中村 誠', at: ts(-13, 14, 5), settled: false, settledAt: null },
    // 加價輪（第 2 輪）で成交
    { vehicleId: 'V2580', roundId: 'R2580-2', dealerId: 'DL03', amount: 2450000, operator: '中村 誠', at: ts(-13, 11, 0), settled: false, settledAt: null }
  ]

  // ── 站內通知（類型與文案於發送當下寫入）────────────────
  const view = (id) => {
    const v = vehicles.find((x) => x.id === id)
    return { ...v.intake, ...v.current }
  }
  const roundOf = (id) => rounds.find((r) => r.id === id)
  let seq = 0
  const n = (dealerId, type, roundId, at, read, extra = {}) => {
    const r = roundOf(roundId)
    return {
      id: `N${String(++seq).padStart(2, '0')}`,
      dealerId,
      type,
      vehicleId: r.vehicleId,
      roundId,
      at,
      read,
      ...noticeText(type, { round: r, vehicle: view(r.vehicleId), vehicles: (extra.vehicleIds || []).map(view) }),
      ...extra
    }
  }
  const batchExtra = (b) => {
    const vehicleIds = b.roundIds.map((id) => roundOf(id).vehicleId)
    return { batchId: b.id, vehicleIds, count: vehicleIds.length, endDate: b.endDate }
  }
  const [bA, bB, , , bE] = batches

  const notifications = [
    ...NOW_ALL.map((id) => n(id, NOTICE_TYPE.NEW_AUCTION, 'R2598-1', tsToday(9, 5), false, batchExtra(bE))),
    ...NOW_ALL.map((id) => n(id, NOTICE_TYPE.NEW_AUCTION, 'R2591-1', ts(-1, 9, 0), id !== 'DL03', batchExtra(bA))),
    ...NOW_ALL.map((id) => n(id, NOTICE_TYPE.NEW_AUCTION, 'R2592-1', ts(-5, 9, 31), true, batchExtra(bB))),
    ...['DL01', 'DL03', 'DL04', 'DL06'].map((id) => n(id, NOTICE_TYPE.CLOSING_SOON, 'R2592-1', ts(-2, 9, 0), false)),
    ...['DL01', 'DL02', 'DL03'].map((id) => n(id, NOTICE_TYPE.EXTRA_ROUND_INVITE, 'R2593-2', ts(-4, 15, 11), false)),
    n('DL01', NOTICE_TYPE.WON, 'R2578-1', ts(-12, 10, 31), true),
    n('DL02', NOTICE_TYPE.LOST, 'R2578-1', ts(-12, 10, 31), false),
    n('DL02', NOTICE_TYPE.WON, 'R2579-1', ts(-13, 14, 6), false),
    n('DL03', NOTICE_TYPE.LOST, 'R2579-1', ts(-13, 14, 6), true),
    n('DL03', NOTICE_TYPE.WON, 'R2580-2', ts(-13, 11, 1), false),
    n('DL01', NOTICE_TYPE.LOST, 'R2580-2', ts(-13, 11, 1), false),
    n('DL04', NOTICE_TYPE.LOST, 'R2580-2', ts(-13, 11, 1), true)
  ]

  return {
    version: SEED_VERSION,
    seededAt: Date.now(),
    dealers,
    vehicles,
    rounds,
    batches,
    bids,
    awards,
    notifications,
    // 帳號通知（事件 6、7）—— 僅 Email，不進站內通知
    emails: [],
    // 與貸後的三支介接 API 的呼叫紀錄（收車通知／成交通知／結清通知）
    callbackLogs: [],
    intakePool,
    auditLogs: [],
    timeOffset: 0,
    // Demo 用開關：開啟後成交通知呼叫失敗，可觀察「留在已結標」的行為
    demo: { dealApiFail: false },
    // 內部系統的操作人與角色（右上角切換；一個帳號可同時擁有兩個角色）
    internalUser: { name: '田中 健一', roles: ['collection', 'finance'] }
  }
}
