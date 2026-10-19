/** 車輛標題：メーカー＋車系（本站不揭露 OrderNo，規格 三） */
export function vehicleTitle(vehicle) {
  return [vehicle.makeName, vehicle.seriesName].filter(Boolean).join(' ')
}

/** 彈窗中用來辨識車輛的一行文字：メーカー 車系 ナンバープレート（規格 1.1） */
export function vehicleLabel(vehicle) {
  return [vehicle.makeName, vehicle.seriesName, vehicle.licensingPlateNumber].filter(Boolean).join(' ')
}

// 附件依副檔名分為照片與其他附件（API 說明：jpg／jpeg／png 為照片、pdf 為其他附件）
const PHOTO_PATTERN = /\.(jpe?g|png)$/i

export function isPhoto(file) {
  return PHOTO_PATTERN.test(file.fileName)
}
