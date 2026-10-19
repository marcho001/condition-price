import dayjs from 'dayjs'
import { yen, km } from './format.js'
import { NOTICE_TYPE } from './constants.js'

// 站內通知的標題與內文於發送當下寫入（對外站以此做關鍵字搜尋）。
// 一律日文；車輛以「メーカー＋車系＋ナンバープレート」識別，不得帶 OrderNo。
// 第 1–5 項的模板文案規格仍待定，此處為 demo 版本（語氣對齊對外站 mock）

const day = (d) => dayjs(d).format('YYYY/MM/DD')

export const vehicleLabel = (v) => `${v.makeName} ${v.seriesName}（${v.licensingPlateNumber}）`

/**
 * @param {string} type NOTICE_TYPE
 * @param {{ round: object, vehicle: object, vehicles?: object[] }} ctx 車輛為顯示用資料（現況值優先）
 */
export function noticeText(type, { round, vehicle, vehicles = [] }) {
  switch (type) {
    case NOTICE_TYPE.NEW_AUCTION:
      // 一次批次只發一封，以清單列出本批全部車輛（不帶 OrderNo、不帶起標價）
      return {
        title: '新しい出品車両のお知らせ',
        content: [
          `新しい出品車両が ${vehicles.length} 台ございます。`,
          `期間：${day(round.startDate)}〜${day(round.endDate)}`,
          '',
          '■ 今回の出品車両',
          ...vehicles.map(
            (v) =>
              `・${v.makeName} ${v.seriesName}／${v.licensingPlateNumber}／${v.carYear || '—'}年式／${km(v.mileage)}／${v.color || '—'}`
          ),
          '',
          '締切までにご入札ください。'
        ].join('\n')
      }
    case NOTICE_TYPE.EXTRA_ROUND_INVITE:
      return {
        title: '追加ラウンドのご案内',
        content: `${vehicleLabel(vehicle)}の追加ラウンドが開始されました。開始価格 ${yen(round.startPrice)} 円を上回る金額でご入札ください。締切：${day(round.endDate)}`
      }
    case NOTICE_TYPE.CLOSING_SOON:
      return {
        title: '締切間近のお知らせ',
        content: `${vehicleLabel(vehicle)}の入札締切が近づいています（締切：${day(round.endDate)}）。まだご入札いただいていません。`
      }
    case NOTICE_TYPE.WON:
      return {
        title: '落札のお知らせ',
        content: `${vehicleLabel(vehicle)}を落札されました。お支払い・名義変更は担当者より個別にご連絡します。`
      }
    case NOTICE_TYPE.LOST:
      return {
        title: '選定結果のお知らせ',
        content: `${vehicleLabel(vehicle)}は、今回ご選定に至りませんでした。`
      }
    default:
      return { title: '', content: '' }
  }
}
