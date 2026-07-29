import type { BodyType, Drive, Fuel, Transmission } from '@/types'

export type ModelSpec = {
  model: string
  bodyType: BodyType
  fuel: Fuel
  transmission: Transmission
  drive: Drive
  displacement: number
  seats: number
  /** 車齡 0 年時的參考行情，用來推導起標價與底價 */
  basePrice: number
  yearRange: [number, number]
}

/** 自行維護的日本車款清單：faker.vehicle.model() 會產出歐美車款，不適用 */
export const CATALOG: ReadonlyArray<{ brand: string; models: ReadonlyArray<ModelSpec> }> = [
  {
    brand: 'Toyota',
    models: [
      { model: 'Alphard', bodyType: '七人車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 2493, seats: 7, basePrice: 4_200_000, yearRange: [2016, 2023] },
      { model: 'Prius', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1797, seats: 5, basePrice: 2_600_000, yearRange: [2015, 2022] },
      { model: 'Hiace', bodyType: '商用車', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2755, seats: 3, basePrice: 3_100_000, yearRange: [2014, 2022] },
      { model: 'Corolla Fielder', bodyType: '房車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 5, basePrice: 1_700_000, yearRange: [2014, 2021] },
      { model: 'Land Cruiser Prado', bodyType: 'SUV', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2754, seats: 7, basePrice: 5_400_000, yearRange: [2015, 2023] },
    ],
  },
  {
    brand: 'Nissan',
    models: [
      { model: 'Serena', bodyType: '七人車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1997, seats: 8, basePrice: 2_900_000, yearRange: [2016, 2022] },
      { model: 'Note', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1198, seats: 5, basePrice: 1_800_000, yearRange: [2015, 2022] },
      { model: 'X-Trail', bodyType: 'SUV', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1997, seats: 5, basePrice: 2_800_000, yearRange: [2015, 2022] },
      { model: 'Elgrand', bodyType: '七人車', fuel: '汽油', transmission: 'CVT', drive: 'FR', displacement: 2488, seats: 7, basePrice: 3_300_000, yearRange: [2014, 2021] },
    ],
  },
  {
    brand: 'Honda',
    models: [
      { model: 'N-BOX', bodyType: '輕自動車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 658, seats: 4, basePrice: 1_450_000, yearRange: [2017, 2023] },
      { model: 'Fit', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 5, basePrice: 1_900_000, yearRange: [2015, 2022] },
      { model: 'Freed', bodyType: '七人車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 6, basePrice: 2_300_000, yearRange: [2016, 2022] },
      { model: 'Vezel', bodyType: 'SUV', fuel: '油電', transmission: 'CVT', drive: '4WD', displacement: 1496, seats: 5, basePrice: 2_400_000, yearRange: [2015, 2022] },
    ],
  },
  {
    brand: 'Mazda',
    models: [
      { model: 'CX-5', bodyType: 'SUV', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2188, seats: 5, basePrice: 2_900_000, yearRange: [2015, 2022] },
      { model: 'Demio', bodyType: '房車', fuel: '汽油', transmission: 'AT', drive: 'FF', displacement: 1298, seats: 5, basePrice: 1_500_000, yearRange: [2014, 2021] },
    ],
  },
  {
    brand: 'Subaru',
    models: [
      { model: 'Forester', bodyType: 'SUV', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1995, seats: 5, basePrice: 2_700_000, yearRange: [2015, 2022] },
      { model: 'Impreza', bodyType: '房車', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1599, seats: 5, basePrice: 1_950_000, yearRange: [2015, 2021] },
    ],
  },
  {
    brand: 'Suzuki',
    models: [
      { model: 'Jimny', bodyType: '輕自動車', fuel: '汽油', transmission: 'MT', drive: '4WD', displacement: 658, seats: 4, basePrice: 1_800_000, yearRange: [2018, 2023] },
      { model: 'Wagon R', bodyType: '輕自動車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 658, seats: 4, basePrice: 1_150_000, yearRange: [2016, 2022] },
    ],
  },
  {
    brand: 'Mitsubishi',
    models: [
      { model: 'Delica D:5', bodyType: '七人車', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2267, seats: 8, basePrice: 3_400_000, yearRange: [2016, 2022] },
    ],
  },
  {
    brand: 'Lexus',
    models: [
      { model: 'RX', bodyType: 'SUV', fuel: '油電', transmission: 'CVT', drive: '4WD', displacement: 3456, seats: 5, basePrice: 6_200_000, yearRange: [2016, 2022] },
      { model: 'IS', bodyType: '房車', fuel: '汽油', transmission: 'AT', drive: 'FR', displacement: 2494, seats: 5, basePrice: 3_800_000, yearRange: [2015, 2021] },
    ],
  },
]

export const ALL_BRANDS = CATALOG.map((c) => c.brand)

export const COLORS = [
  '珍珠白',
  '純白',
  '銀',
  '鐵灰',
  '黑',
  '深藍',
  '紅',
  '香檳金',
  '墨綠',
] as const

export const PLATE_REGIONS = [
  '品川',
  '練馬',
  '横浜',
  '大阪',
  '名古屋',
  '神戸',
  '札幌',
  '福岡',
] as const

export const PLATE_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'ら'] as const

export const REMARK_POOL = [
  '定期保養紀錄齊全，原廠保養手冊在車。',
  '左前保險桿有輕微擦傷，已於車體圖標記。',
  '前擋風玻璃右下角有小石擊痕，未擴散。',
  '四輪輪胎於一年內更換，胎紋深度約 6mm。',
  '後座椅面有輕微污損，可清潔處理。',
  '引擎運轉正常，無異音，冷氣功能正常。',
  '車主變更 1 次，無事故紀錄。',
  '底盤有輕微表面鏽蝕，結構無損。',
  '導航主機已升級為市售品，原廠件未保留。',
  '鑰匙 2 把齊全，含備胎與隨車工具。',
] as const

/** 依車齡折舊推導參考行情 */
export function estimateMarketPrice(spec: ModelSpec, year: number, currentYear: number): number {
  const age = Math.max(0, currentYear - year)
  const retained = Math.max(0.28, 0.88 ** age)
  return Math.round((spec.basePrice * retained) / 10_000) * 10_000
}
