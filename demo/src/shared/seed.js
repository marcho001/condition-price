import dayjs from 'dayjs'
import { VEHICLE_STATUS, AWARD_METHOD, NOTICE_TYPE } from './constants.js'

const d = (n) => dayjs().add(n, 'day').format('YYYY-MM-DD')
const ts = (n, h = 10, m = 20) =>
  dayjs().add(n, 'day').hour(h).minute(m).second(0).millisecond(0).valueOf()

const INTAKE_PHOTOS = [
  ['side', '車両写真_サイド.jpg', 'CAR_PHOTO'],
  ['front', '車両写真_フロント.jpg', 'CAR_PHOTO'],
  ['rear', '車両写真_リア.jpg', 'CAR_PHOTO'],
  ['left', '車両写真_左.jpg', 'CAR_PHOTO'],
  ['right', '車両写真_右.jpg', 'CAR_PHOTO'],
  ['checkFront', '車両チェックシート_前.jpg', 'CHECK_SHEET'],
  ['checkRear', '車両チェックシート_後.jpg', 'CHECK_SHEET'],
  ['checkLeft', '車両チェックシート_左.jpg', 'CHECK_SHEET'],
  ['checkRight', '車両チェックシート_右.jpg', 'CHECK_SHEET'],
  ['meter', '走行距離メーター.jpg', 'METER'],
  ['seat1', '1列目シート.jpg', 'PART'],
  ['seat2', '2列目シート.jpg', 'PART'],
  ['engine', 'エンジン写真.jpg', 'PART']
]

function attachments(id, { condition = false, rating = false } = {}) {
  const list = INTAKE_PHOTOS.map(([kind, name, category], i) => ({
    id: `${id}-a${i}`,
    name,
    kind,
    category,
    mime: 'image/jpeg',
    source: 'intake',
    uploader: 'システム（申込時）',
    uploadedAt: ts(-40, 9, 0)
  }))
  if (condition) {
    list.push({
      id: `${id}-c1`,
      name: '引取後現況_外装.jpg',
      kind: 'condition',
      category: 'CONDITION',
      mime: 'image/jpeg',
      source: 'module',
      uploader: '田中 健一',
      uploadedAt: ts(-6, 14, 12)
    })
  }
  if (rating) {
    list.push({
      id: `${id}-r1`,
      name: '評価シート.pdf',
      kind: 'rating',
      category: 'RATING',
      mime: 'application/pdf',
      source: 'module',
      uploader: '田中 健一',
      uploadedAt: ts(-5, 11, 30)
    })
  }
  return list
}

function mk(o) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    intake: {
      makeName: o.make,
      seriesName: o.series,
      yearName: o.yearName,
      modelName: o.grade,
      carYear: o.carYear,
      color: o.color,
      fuelType: o.fuel,
      displacement: o.disp,
      mileageRange: o.mileageRange,
      vin: o.vin,
      licensingPlateNumber: o.plate,
      productDate: o.productDate,
      registeDate: o.registeDate,
      vehicleInspectionTime: o.inspect,
      vehicleUsageType: o.usage || '自家用',
      transferCount: o.transfer,
      trafficInsuranceExpiryDate: o.insurance
    },
    current: o.current || {},
    guidePrice: o.guidePrice,
    valuationPrice: o.valuationPrice,
    receivedAt: o.receivedAt,
    status: o.status,
    attachments: attachments(o.id, o.files),
    fieldLogs: o.fieldLogs || []
  }
}

export function buildSeed() {
  const dealers = [
    {
      id: 'DL01',
      name: '山田商事株式会社',
      contactName: '山田 太郎',
      phone: '090-1234-5678',
      email: 'yamada@example.co.jp',
      password: 'demo1234',
      status: 'ACTIVE',
      remark: '関東エリア・年間 200 台規模',
      createdAt: ts(-180)
    },
    {
      id: 'DL02',
      name: '鈴木自動車販売',
      contactName: '鈴木 一郎',
      phone: '090-2345-6789',
      email: 'suzuki@example.co.jp',
      password: 'demo1234',
      status: 'ACTIVE',
      remark: '',
      createdAt: ts(-180)
    },
    {
      id: 'DL03',
      name: '田中モータース',
      contactName: '田中 次郎',
      phone: '080-3456-7890',
      email: 'tanaka@example.co.jp',
      password: 'demo1234',
      status: 'ACTIVE',
      remark: '軽自動車を中心に仕入',
      createdAt: ts(-150)
    },
    {
      id: 'DL04',
      name: '佐藤オートセールス',
      contactName: '佐藤 花子',
      phone: '080-4567-8901',
      email: 'sato@example.co.jp',
      password: 'demo1234',
      status: 'ACTIVE',
      remark: '',
      createdAt: ts(-90)
    },
    {
      id: 'DL05',
      name: '高橋カーズ',
      contactName: '高橋 健',
      phone: '070-5678-9012',
      email: 'takahashi@example.co.jp',
      password: 'demo1234',
      status: 'INACTIVE',
      remark: '取引一時停止中（ログイン不可）',
      createdAt: ts(-200)
    }
  ]

  const vehicles = [
    // ── 待排定拍賣 ─────────────────────────────
    mk({
      id: 'V2601',
      orderNo: '20260712430',
      plate: '品川 300 あ 12-34',
      make: 'トヨタ',
      series: 'プリウス',
      yearName: 'ZVW51',
      grade: 'S ツーリングセレクション',
      carYear: '2019',
      color: 'パールホワイト',
      fuel: 'ハイブリッド',
      disp: '1,797 cc',
      mileageRange: '3万 〜 5万 km',
      vin: 'ZVW51-8031452',
      productDate: '2019-04-18',
      registeDate: '2019-05',
      inspect: '2027-05-17',
      transfer: '1',
      insurance: '2027-06-01',
      receivedAt: d(-6),
      status: VEHICLE_STATUS.PENDING_SCHEDULE,
      guidePrice: '1,400,000 〜 1,750,000',
      valuationPrice: '1,580,000',
      current: { mileage: 52300, remark: '左フロントフェンダーに 5cm 程度の擦り傷あり。内装は良好。' },
      files: { condition: true, rating: true },
      fieldLogs: [
        { field: 'mileage', before: '', after: '52300', operator: '田中 健一', at: ts(-6, 14, 10) },
        {
          field: 'remark',
          before: '',
          after: '左フロントフェンダーに 5cm 程度の擦り傷あり。内装は良好。',
          operator: '田中 健一',
          at: ts(-6, 14, 12)
        }
      ]
    }),
    mk({
      id: 'V2602',
      orderNo: '20260714743',
      plate: '横浜 500 さ 56-78',
      make: 'ホンダ',
      series: 'フィット',
      yearName: 'GR3',
      grade: 'e:HEV HOME',
      carYear: '2021',
      color: 'ブラック',
      fuel: 'ハイブリッド',
      disp: '1,496 cc',
      mileageRange: '1万 〜 3万 km',
      vin: 'GR3-1104822',
      productDate: '2021-02-09',
      registeDate: '2021-03',
      inspect: '2027-03-08',
      transfer: '0',
      insurance: '2027-03-20',
      receivedAt: d(-4),
      status: VEHICLE_STATUS.PENDING_SCHEDULE,
      guidePrice: '1,550,000 〜 1,850,000',
      valuationPrice: '1,690,000',
      current: {},
      files: {}
    }),
    mk({
      id: 'V2603',
      orderNo: '20260716318',
      plate: '足立 300 な 90-12',
      make: '日産',
      series: 'セレナ',
      yearName: 'C27',
      grade: 'ハイウェイスター V',
      carYear: '2018',
      color: 'ガンメタリック',
      fuel: 'ガソリン',
      disp: '1,997 cc',
      mileageRange: '5万 〜 8万 km',
      vin: 'C27-0448120',
      productDate: '2018-09-25',
      registeDate: '2018-10',
      inspect: '2026-10-24',
      transfer: '2',
      insurance: '2026-11-05',
      receivedAt: d(-3),
      status: VEHICLE_STATUS.PENDING_SCHEDULE,
      guidePrice: '1,100,000 〜 1,400,000',
      valuationPrice: '1,240,000',
      current: { mileage: 78400, vehicleInspectionTime: '2026-10-24' },
      files: { condition: true }
    }),
    mk({
      id: 'V2604',
      orderNo: '20260718205',
      plate: '大宮 300 ほ 34-56',
      make: 'マツダ',
      series: 'CX-5',
      yearName: 'KF2P',
      grade: 'XD プロアクティブ',
      carYear: '2020',
      color: 'レッド',
      fuel: 'ディーゼル',
      disp: '2,188 cc',
      mileageRange: '3万 〜 5万 km',
      vin: 'KF2P-2201884',
      productDate: '2020-06-30',
      registeDate: '2020-07',
      inspect: '2026-07-29',
      transfer: '1',
      insurance: '2026-08-10',
      receivedAt: d(-2),
      status: VEHICLE_STATUS.PENDING_SCHEDULE,
      guidePrice: '1,900,000 〜 2,300,000',
      valuationPrice: '2,080,000',
      current: {
        mileage: 44120,
        trafficInsuranceExpiryDate: '2026-08-10',
        remark: 'リアバンパー右側に補修跡。スペアキー 1 本欠品。'
      },
      files: { condition: true, rating: true }
    }),
    mk({
      id: 'V2605',
      orderNo: '20260720228',
      plate: '所沢 300 め 78-90',
      make: 'スバル',
      series: 'フォレスター',
      yearName: 'SK9',
      grade: 'Premium',
      carYear: '2019',
      color: 'ダークブルー',
      fuel: 'ガソリン',
      disp: '2,498 cc',
      mileageRange: '5万 〜 8万 km',
      vin: 'SK9-0093311',
      productDate: '2019-11-12',
      registeDate: '2019-12',
      inspect: '2027-12-11',
      transfer: '1',
      insurance: '2027-12-25',
      receivedAt: d(-1),
      status: VEHICLE_STATUS.PENDING_SCHEDULE,
      guidePrice: '1,700,000 〜 2,050,000',
      valuationPrice: '1,860,000',
      current: {},
      files: {}
    }),

    // ── 拍賣進行中 ─────────────────────────────
    mk({
      id: 'V2591',
      orderNo: '20260628706',
      plate: '練馬 300 ら 11-22',
      make: 'トヨタ',
      series: 'アルファード',
      yearName: 'AGH30W',
      grade: '2.5S C パッケージ',
      carYear: '2019',
      color: 'ブラック',
      fuel: 'ガソリン',
      disp: '2,493 cc',
      mileageRange: '5万 〜 8万 km',
      vin: 'AGH30-0331207',
      productDate: '2019-08-05',
      registeDate: '2019-08',
      inspect: '2027-08-04',
      transfer: '1',
      insurance: '2027-08-20',
      receivedAt: d(-14),
      status: VEHICLE_STATUS.IN_AUCTION,
      guidePrice: '3,100,000 〜 3,600,000',
      valuationPrice: '3,350,000',
      current: { mileage: 61800, remark: '禁煙車。純正ナビ・後席モニター付き。' },
      files: { condition: true, rating: true }
    }),
    mk({
      id: 'V2592',
      orderNo: '20260630431',
      plate: '春日部 580 と 33-44',
      make: 'スズキ',
      series: 'ハスラー',
      yearName: 'MR52S',
      grade: 'ハイブリッド X',
      carYear: '2020',
      color: 'ベージュ',
      fuel: 'ハイブリッド',
      disp: '658 cc',
      mileageRange: '1万 〜 3万 km',
      vin: 'MR52S-0182233',
      productDate: '2020-10-14',
      registeDate: '2020-11',
      inspect: '2026-11-13',
      transfer: '0',
      insurance: '2026-11-30',
      receivedAt: d(-12),
      status: VEHICLE_STATUS.IN_AUCTION,
      guidePrice: '850,000 〜 1,050,000',
      valuationPrice: '940,000',
      current: { mileage: 23600 },
      files: { condition: true }
    }),
    mk({
      id: 'V2593',
      orderNo: '20260620290',
      plate: '世田谷 300 は 55-66',
      make: 'レクサス',
      series: 'RX',
      yearName: 'AGL25W',
      grade: 'RX300 F SPORT',
      carYear: '2020',
      color: 'シルバー',
      fuel: 'ガソリン',
      disp: '1,998 cc',
      mileageRange: '3万 〜 5万 km',
      vin: 'AGL25-0022917',
      productDate: '2020-03-21',
      registeDate: '2020-04',
      inspect: '2027-04-20',
      transfer: '1',
      insurance: '2027-05-02',
      receivedAt: d(-22),
      status: VEHICLE_STATUS.IN_AUCTION,
      guidePrice: '3,400,000 〜 4,000,000',
      valuationPrice: '3,700,000',
      current: { mileage: 38900, remark: '第 1 ラウンドは価格が想定を下回ったため、追加ラウンドを実施。' },
      files: { condition: true, rating: true }
    }),
    mk({
      id: 'V2594',
      orderNo: '20260702336',
      plate: '川口 580 ゆ 77-88',
      make: 'ダイハツ',
      series: 'タント',
      yearName: 'LA650S',
      grade: 'カスタム RS',
      carYear: '2021',
      color: 'パールホワイト',
      fuel: 'ガソリン',
      disp: '658 cc',
      mileageRange: '1万 〜 3万 km',
      vin: 'LA650S-0311455',
      productDate: '2021-05-19',
      registeDate: '2021-06',
      inspect: '2027-06-18',
      transfer: '0',
      insurance: '2027-07-01',
      receivedAt: d(-10),
      status: VEHICLE_STATUS.IN_AUCTION,
      guidePrice: '1,050,000 〜 1,300,000',
      valuationPrice: '1,170,000',
      current: { mileage: 18200 },
      files: {}
    }),

    // ── 已結標 ─────────────────────────────────
    mk({
      id: 'V2585',
      orderNo: '20260610113',
      plate: '横浜 300 ま 99-00',
      make: 'トヨタ',
      series: 'ハリアー',
      yearName: 'MXUA80',
      grade: 'G レザーパッケージ',
      carYear: '2020',
      color: 'ガンメタリック',
      fuel: 'ガソリン',
      disp: '1,986 cc',
      mileageRange: '3万 〜 5万 km',
      vin: 'MXUA80-0047733',
      productDate: '2020-08-27',
      registeDate: '2020-09',
      inspect: '2026-09-26',
      transfer: '1',
      insurance: '2026-10-08',
      receivedAt: d(-26),
      status: VEHICLE_STATUS.CLOSED,
      guidePrice: '2,600,000 〜 3,050,000',
      valuationPrice: '2,820,000',
      current: { mileage: 41500 },
      files: { condition: true, rating: true }
    }),
    mk({
      id: 'V2586',
      orderNo: '20260612989',
      plate: '柏 300 き 21-43',
      make: 'ホンダ',
      series: 'ヴェゼル',
      yearName: 'RV5',
      grade: 'e:HEV Z',
      carYear: '2021',
      color: 'ブラック',
      fuel: 'ハイブリッド',
      disp: '1,496 cc',
      mileageRange: '1万 〜 3万 km',
      vin: 'RV5-1029844',
      productDate: '2021-07-02',
      registeDate: '2021-07',
      inspect: '2027-07-01',
      transfer: '0',
      insurance: '2027-07-15',
      receivedAt: d(-24),
      status: VEHICLE_STATUS.CLOSED,
      guidePrice: '2,200,000 〜 2,600,000',
      valuationPrice: '2,400,000',
      current: { mileage: 26700, remark: '最高額が同額のため、指定成交または追加ラウンドで対応。' },
      files: { condition: true }
    }),
    mk({
      id: 'V2587',
      orderNo: '20260614566',
      plate: '習志野 300 の 65-87',
      make: '三菱',
      series: 'デリカ D:5',
      yearName: 'CV1W',
      grade: 'P',
      carYear: '2019',
      color: 'ダークブルー',
      fuel: 'ディーゼル',
      disp: '2,267 cc',
      mileageRange: '8万 〜 12万 km',
      vin: 'CV1W-0300218',
      productDate: '2019-01-30',
      registeDate: '2019-02',
      inspect: '2027-02-01',
      transfer: '2',
      insurance: '2027-02-14',
      receivedAt: d(-23),
      status: VEHICLE_STATUS.CLOSED,
      guidePrice: '2,000,000 〜 2,400,000',
      valuationPrice: '2,180,000',
      current: { mileage: 96300, remark: '走行距離が多く、第 1 ラウンドは応札なし。' },
      files: {}
    }),

    // ── 已決標 ─────────────────────────────────
    mk({
      id: 'V2578',
      orderNo: '20260528182',
      plate: '八王子 500 ふ 10-08',
      make: '日産',
      series: 'ノート',
      yearName: 'E13',
      grade: 'e-POWER X',
      carYear: '2021',
      color: 'シルバー',
      fuel: 'ハイブリッド',
      disp: '1,198 cc',
      mileageRange: '1万 〜 3万 km',
      vin: 'E13-0155922',
      productDate: '2021-09-08',
      registeDate: '2021-09',
      inspect: '2027-09-07',
      transfer: '0',
      insurance: '2027-09-20',
      receivedAt: d(-40),
      status: VEHICLE_STATUS.AWARDED,
      guidePrice: '1,050,000 〜 1,300,000',
      valuationPrice: '1,160,000',
      current: { mileage: 21400 },
      files: { condition: true, rating: true }
    }),
    mk({
      id: 'V2579',
      orderNo: '20260530494',
      plate: '千葉 500 む 32-10',
      make: 'トヨタ',
      series: 'ヤリス',
      yearName: 'MXPA10',
      grade: 'X',
      carYear: '2020',
      color: 'パールホワイト',
      fuel: 'ガソリン',
      disp: '1,490 cc',
      mileageRange: '3万 〜 5万 km',
      vin: 'MXPA10-2011630',
      productDate: '2020-12-11',
      registeDate: '2021-01',
      inspect: '2026-12-25',
      transfer: '1',
      insurance: '2027-01-05',
      receivedAt: d(-38),
      status: VEHICLE_STATUS.AWARDED,
      guidePrice: '900,000 〜 1,120,000',
      valuationPrice: '1,010,000',
      current: { mileage: 39800 },
      files: { condition: true }
    })
  ]

  const allIds = dealers.filter((x) => x.status === 'ACTIVE').map((x) => x.id)

  const rounds = [
    {
      id: 'R2591-1',
      vehicleId: 'V2591',
      round: 1,
      startDate: d(-3),
      endDate: d(2),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'OPEN',
      createdBy: '田中 健一',
      createdAt: ts(-3, 9, 30),
      urgeLogs: [],
      autoUrgeSent: false
    },
    {
      id: 'R2592-1',
      vehicleId: 'V2592',
      round: 1,
      startDate: d(-5),
      endDate: d(0),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'OPEN',
      createdBy: '田中 健一',
      createdAt: ts(-5, 9, 30),
      urgeLogs: [{ by: 'システム（自動）', at: ts(-2, 9, 0), targets: ['DL01', 'DL03', 'DL04'] }],
      autoUrgeSent: true
    },
    {
      id: 'R2593-1',
      vehicleId: 'V2593',
      round: 1,
      startDate: d(-14),
      endDate: d(-7),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-14, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    },
    {
      id: 'R2593-2',
      vehicleId: 'V2593',
      round: 2,
      startDate: d(-4),
      endDate: d(3),
      startPrice: 2850000,
      inviteeIds: ['DL01', 'DL02', 'DL03'],
      status: 'OPEN',
      createdBy: '中村 誠',
      createdAt: ts(-4, 15, 10),
      urgeLogs: [],
      autoUrgeSent: false
    },
    {
      id: 'R2594-1',
      vehicleId: 'V2594',
      round: 1,
      startDate: d(-4),
      endDate: d(1),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'OPEN',
      createdBy: '田中 健一',
      createdAt: ts(-4, 9, 30),
      urgeLogs: [],
      autoUrgeSent: false
    },
    {
      id: 'R2585-1',
      vehicleId: 'V2585',
      round: 1,
      startDate: d(-9),
      endDate: d(-1),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-9, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    },
    {
      id: 'R2586-1',
      vehicleId: 'V2586',
      round: 1,
      startDate: d(-9),
      endDate: d(-2),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-9, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    },
    {
      id: 'R2587-1',
      vehicleId: 'V2587',
      round: 1,
      startDate: d(-10),
      endDate: d(-3),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-10, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    },
    {
      id: 'R2578-1',
      vehicleId: 'V2578',
      round: 1,
      startDate: d(-20),
      endDate: d(-13),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-20, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    },
    {
      id: 'R2579-1',
      vehicleId: 'V2579',
      round: 1,
      startDate: d(-21),
      endDate: d(-14),
      startPrice: 0,
      inviteeIds: [...allIds],
      status: 'CLOSED',
      createdBy: '田中 健一',
      createdAt: ts(-21, 9, 30),
      urgeLogs: [],
      autoUrgeSent: true
    }
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
    bid('R2591-1', 'DL01', 1520000, ts(-2, 11, 5), [
      { amount: 1450000, at: ts(-3, 16, 40) },
      { amount: 1520000, at: ts(-2, 11, 5) }
    ]),
    bid('R2591-1', 'DL02', 1480000, ts(-2, 18, 22)),
    bid('R2591-1', 'DL03', 1505000, ts(-1, 9, 48)),

    bid('R2592-1', 'DL02', 620000, ts(-3, 13, 15)),

    bid('R2593-1', 'DL01', 2850000, ts(-9, 10, 12)),
    bid('R2593-1', 'DL02', 2610000, ts(-8, 17, 30)),

    bid('R2593-2', 'DL01', 2980000, ts(-2, 10, 44)),
    bid('R2593-2', 'DL03', 2920000, ts(-1, 15, 3)),

    bid('R2585-1', 'DL01', 1760000, ts(-4, 10, 0)),
    bid('R2585-1', 'DL02', 1820000, ts(-2, 20, 41)),
    bid('R2585-1', 'DL03', 1690000, ts(-3, 9, 25)),

    bid('R2586-1', 'DL01', 1340000, ts(-5, 14, 8)),
    bid('R2586-1', 'DL02', 1340000, ts(-4, 19, 55)),
    bid('R2586-1', 'DL03', 1120000, ts(-6, 8, 30)),

    bid('R2578-1', 'DL01', 1180000, ts(-15, 11, 20)),
    bid('R2578-1', 'DL02', 1090000, ts(-16, 16, 45)),

    bid('R2579-1', 'DL02', 985000, ts(-16, 10, 5)),
    bid('R2579-1', 'DL03', 985000, ts(-15, 18, 12))
  ]

  const awards = [
    {
      vehicleId: 'V2578',
      roundId: 'R2578-1',
      dealerId: 'DL01',
      amount: 1180000,
      method: AWARD_METHOD.AWARD,
      operator: '中村 誠',
      at: ts(-12, 10, 30),
      completed: false,
      completedAt: null
    },
    {
      vehicleId: 'V2579',
      roundId: 'R2579-1',
      dealerId: 'DL02',
      amount: 985000,
      method: AWARD_METHOD.DESIGNATE,
      operator: '中村 誠',
      at: ts(-13, 14, 5),
      completed: false,
      completedAt: null
    }
  ]

  const n = (id, dealerId, type, vehicleId, roundId, at, read) => ({
    id,
    dealerId,
    type,
    vehicleId,
    roundId,
    at,
    read
  })

  const notifications = [
    n('N01', 'DL01', NOTICE_TYPE.NEW_AUCTION, 'V2591', 'R2591-1', ts(-3, 9, 31), true),
    n('N02', 'DL02', NOTICE_TYPE.NEW_AUCTION, 'V2591', 'R2591-1', ts(-3, 9, 31), true),
    n('N03', 'DL03', NOTICE_TYPE.NEW_AUCTION, 'V2591', 'R2591-1', ts(-3, 9, 31), false),
    n('N04', 'DL04', NOTICE_TYPE.NEW_AUCTION, 'V2591', 'R2591-1', ts(-3, 9, 31), false),
    n('N05', 'DL01', NOTICE_TYPE.NEW_AUCTION, 'V2592', 'R2592-1', ts(-5, 9, 31), true),
    n('N06', 'DL01', NOTICE_TYPE.CLOSING_SOON, 'V2592', 'R2592-1', ts(-2, 9, 0), false),
    n('N07', 'DL01', NOTICE_TYPE.EXTRA_ROUND_INVITE, 'V2593', 'R2593-2', ts(-4, 15, 11), false),
    n('N08', 'DL02', NOTICE_TYPE.EXTRA_ROUND_INVITE, 'V2593', 'R2593-2', ts(-4, 15, 11), false),
    n('N09', 'DL03', NOTICE_TYPE.EXTRA_ROUND_INVITE, 'V2593', 'R2593-2', ts(-4, 15, 11), false),
    n('N10', 'DL01', NOTICE_TYPE.NEW_AUCTION, 'V2594', 'R2594-1', ts(-4, 9, 31), false),
    n('N11', 'DL01', NOTICE_TYPE.WON, 'V2578', 'R2578-1', ts(-12, 10, 31), true),
    n('N12', 'DL02', NOTICE_TYPE.LOST, 'V2578', 'R2578-1', ts(-12, 10, 31), false),
    n('N13', 'DL01', NOTICE_TYPE.LOST, 'V2579', 'R2579-1', ts(-13, 14, 6), true),
    n('N14', 'DL02', NOTICE_TYPE.WON, 'V2579', 'R2579-1', ts(-13, 14, 6), false)
  ]

  return {
    version: 1,
    seededAt: Date.now(),
    dealers,
    vehicles,
    rounds,
    bids,
    awards,
    notifications,
    auditLogs: [],
    timeOffset: 0,
    internalUser: { name: '田中 健一', roles: ['auction:operation', 'auction:award'] },
    dealerSession: null
  }
}
