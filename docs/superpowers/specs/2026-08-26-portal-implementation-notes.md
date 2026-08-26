# 車輛拍賣 —— 既有 portal 實作參考筆記

**日期**：2026-08-26
**用途**：開發前的技術對齊筆記。記錄既有 `xstar-web-pc` 的技術棧、版型慣例、共用元件與可複用資料
**性質**：**非需求文件**。需求以《日本-車輛拍賣-內部系統》與《日本-車輛拍賣-廠商競價站》為準
**來源**：實際讀取 `xstar-web-pc` 程式碼（2026-08-26）

---

## 1. 技術棧

|項目|內容|
|---|---|
|Monorepo|`xstar-web-pc`，pnpm workspace，`application/*`（業務應用）＋ `packages/*`（共享包）|
|框架|Vue 3 + Vite 5 + Pinia + Vue Router 4|
|UI|Element Plus + Sass|
|國際化|vue-i18n，各應用自帶 `src/i18n/{ja,zh,en}.json`|
|其他|dayjs、axios（`@packages/x-axios` 封裝）|
|預設語言|`ja`（`@packages/theme` settings）|
|主色|`#0568FF`|
|規範|Prettier（2 空格、單引號、分號、printWidth 100、無尾隨逗號）；ESLint 基於 Vue 3 + Standard|

啟動：`pnpm -C application/<app> dev`；檢查與建置：`pnpm -C application/<app> lint` / `build`。

---

## 2. 版型慣例（以 `credit-approve` 列表頁為範本）

```
.page-wrap                背景 #f7f8fa，padding 16px 20px
 ├─ .tab-filter-section   el-tabs（no-border）+ xFilterForm
 └─ .table-section        白底、border-radius 16px、padding 16px
      ├─ 右上／左上動作按鈕（匯出、新增）
      ├─ x-list-table
      └─ el-pagination    靠右，margin-top 36px
```

其他慣例：

- 空值顯示 `-` 或 `NA`
- 操作列寬度依語言調整（`locale === 'ja' ? '230px' : '190px'`）
- 列表篩選條件與分頁狀態存在 Pinia（`useListContextStore`）＋ sessionStorage，返回列表時還原
- orderNo 一律做成 `el-link` 進詳情

---

## 3. 共用元件（`@packages/x-components`）

|元件|用途|
|---|---|
|`xFilterForm` / `xFilterFormItem`|篩選區。以 `filterFormItems` 陣列設定，支援 `input` / `select` / `daterange`，`default-visible-num` 控制折疊|
|`xListTable`|列表。以 `columns` 設定欄位（`prop`、`label`、`width`/`minWidth`、`formatter`、`slot`、`show`）；操作列固定 `prop: 'action'`、`fixed: 'right'`，以 `actions` 陣列設定按鈕（`label`、`handler`、`show`、`refreshAfter`）；`api-handler` + `queryParams` 自帶分頁請求，`pagination-map` 對應後端欄位（如 `pages` / `size`）|
|`xInfoCard`|詳情的 label / value 網格區塊，可設定每列欄數，支援 inline 編輯|
|`xConfirm` / `xSlotConfirm`|二次確認彈窗|
|`xNoData`|空狀態|
|`xTextOverflowTooltip`|長文字截斷|
|`xBreadcrumb`|麵包屑（路由 meta `breadcrumbList`）|
|`xEcharts`|圖表|

附件上傳與預覽：`@packages/x-uploader` 的 `PictureUploader` / `FileUploader` / `FileUploaderNew`。既有實作可參考 `credit-approve/src/views/creditApprove/components/attachCard.vue`、`supplementAttach.vue`。

工具：`@packages/utils`（`simpleDeepClone`、`hasValidState` 等）。

---

## 4. 權限機制

不是角色判斷，而是**按鈕權限碼**：

```js
const { queryPermission, checkPermission } = usePermissionStore();
// 權限碼由後端依頁面 URL 回傳，分號分隔
getPageButton({ pageUrl: '/#/creditApprove/list' })
// 使用
v-if="checkPermission(['compReport:operation'])"
```

拍賣模組的兩個權限建議定義為：

|需求文件中的權限|建議權限碼|
|---|---|
|拍賣營運|`auction:operation`|
|決標管理|`auction:award`|

需在權限管理系統依頁面 URL 註冊這兩個碼。

---

## 5. 字典與文案

- 狀態、下拉選項一律走字典：`useDictStore().getDictItemList(key)` / `getDictValue(value, key, '-')`
- 字典 key 集中在各應用的 `src/common/constants/dictionaryKeys.js`，路由進入前預先載入
- 文案全部走 i18n，不寫死字串；`ja` / `zh` / `en` 三份 json 需同步

---

## 6. 可複用的既有資料

### 6.1 車輛資料

來源：`credit-approve` 詳情頁的「車両情報」區塊，i18n 命名空間 `creditDetail.orderCar`（`application/credit-approve/src/i18n/{ja,zh}.json`），資料物件為 `detailData.orderCar`。

|欄位 key|ja|zh|
|---|---|---|
|makeName|メーカー|制造商|
|seriesName|車系|车系|
|yearName|モデル|车型|
|modelName|グレード|车款|
|carYear|年式|生产年份|
|color|ボディカラー|车身颜色|
|fuelType|燃料の種類|燃料类型|
|displacement|総排気量または定格出力|排量|
|mileage / mileageRange|走行距離|公里数|
|vin|車台番号|VIN|
|licensingPlateNumber|ナンバープレート|车牌号码|
|productDate|登録年月日/交付年月日|出厂日期|
|registeDate|初度登録年月|初登日期|
|vehicleInspectionTime|次回車検日|车检日期|
|vehicleUsageType|自家用・事業用の別|自用・营业用性质|
|transferCount|車両の移転回数|车辆过户次数|
|trafficInsuranceExpiryDate|自賠責保険の有効期限|交强险失效日|
|accidentFront / accidentAfter / accidentLeft / accidentRight|車両チェックシート（前／後／左／右）|车辆检查表（前／后／左／右）|
|maxmin（guidePrice）|車両価格範囲|车辆价格范围|
|valuationPrice|車両評価|车辆估值|

注意事項：

1. `mileage` 在進件端存的是**區間值**（`mileageRange`，經 `formatMileageRange` 顯示），不是實際里程
2. `maxmin`（車両価格範囲）與 `valuationPrice`（車両評価）屬**內部參考價**，不可對廠商揭露
3. 車牌在進件表單是拆成四段輸入（運輸局 / 分類番号 / かな / 番号），詳情頁以 `licensingPlateNumber` 合併呈現
4. 進件表單另有 `車両チェックシート` 前後左右四張照片（`application/application/src/views/form/modules/cashari/vehicle.vue`）

### 6.2 廠商主檔

既有 `application/dealer-management`（販売業者）**不是**拍賣廠商主檔 —— 該模組是進件來源的銷售通路，拍賣廠商是買方，兩者為不同對象。拍賣廠商需另建主檔。

其欄位結構仍可作為建檔的參考：`dealerNo`、`dealerName`、`dealerAddress`、`dealerStatus`（PENDING / ACTIVE / INACTIVE）、`contactName`、`contactPhone`、`contactEmail`、`attachments`。頁面實作可參考 `views/dealerManagement/list.vue` 與 `detail.vue`。

---

## 7. 對內部端實作的影響

|需求文件中的元件|既有對應|
|---|---|
|車輛管理列表 / 拍賣管理三個 tab|`credit-approve` 列表頁（tabs + xFilterForm + xListTable）可直接作為範本|
|操作列「詳細」「排定拍賣」「催投」|`xListTable` 的 `actions` 設定|
|詳細彈窗（訂單＋車輛＋照片）|`el-dialog` + `xInfoCard`；車輛區塊沿用 `creditDetail.orderCar` 欄位|
|附件上傳（圖片 / pdf）|`@packages/x-uploader` + `attachCard` 樣式|
|二次確認|`xConfirm` / `xSlotConfirm`|
|無人出價的空狀態|`xNoData`|
|三個 tab 的權限控制|`checkPermission`|

內部端幾乎不需要新的視覺設計，是既有元件的重組。

## 8. 對外端

對外站為獨立專案、獨立部署，不在此 monorepo 內，技術選型未定（是否沿用 Vue 3 + Element Plus 或另選，見對外端文件待確認 9.5）。手機優先、i18n 僅日文。
