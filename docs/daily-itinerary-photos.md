# 每日行程照片：後端待實作規格

此文件是提案，以下端點尚未存在，前端目前不會呼叫。後端檔案未修改。

## 目前前端行為

- 使用 Element Plus Collapse 與既有 Upload/Img.vue。
- 每天可展開編輯，收合顯示天數、標題與單張照片預覽。
- 每天最多選一張 JPG、PNG 或 WebP，最大 5 MB；再次選取會替換預覽。
- 照片僅存在目前編輯器記憶體，不上傳、不寫入 localStorage，也不占用行程相簿名額。
- 儲存每日行程目前只儲存原有文字資料。移除預覽後可切換步驟，關閉編輯器會清除預覽。

## 建議後端契約（待確認與實作）

沿用 TripProductDay 模組與既有 TripPhoto 的圖片驗證、回應方式。可在 trip_product_day 新增可空的 photo_file（二進位）及 photo_content_type 欄位，一個每日行程自然最多一張，不建立與行程總相簿共用的 TripPhoto 記錄。

新增 migration，使用當下未占用的版本號，不修改已執行的 migration；舊每日行程照片預設為空。部署須先完成 migration，避免 ORM 查詢不存在的欄位而回傳 500。

| 方法   | 提議路徑                                        | 行為                                                             |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| PUT    | /api/v1/admin/trips/{tripId}/days/{dayId}/photo | multipart/form-data，file 單檔；新增或原子替換照片，成功回傳 204 |
| GET    | /api/v1/admin/trips/{tripId}/days/{dayId}/photo | 回傳圖片 bytes 與正確 Content-Type；無照片回傳 404               |
| DELETE | /api/v1/admin/trips/{tripId}/days/{dayId}/photo | 刪除當日照片，回傳 204                                           |

- 每日行程回應 DTO 增加 hasPhoto: boolean，避免對未上傳的日期不斷請求不存在的圖片。
- 驗證 dayId 隸屬 tripId，套用現有管理者授權；不接受用戶端任意指定其他天的照片。
- 後端驗證單檔、5 MB 上限、JPEG/PNG/WebP 及實際圖片內容，失敗不得覆蓋原照片。
- 格式錯誤回傳 400 或 415，檔案過大回傳 413；找不到行程／日期回傳 404。
- 儲存檔案與 content type 必須具交易一致性；刪除每日行程時一併移除照片。
- 若買家頁也需展示，另確認公開讀取權限，只允許讀取已上架行程照片。

## 後端完成後的前端串接

1. 在 src/api/modules/trip.ts 沿用共用 HTTP 客戶端新增上傳、讀取與刪除函式；二進位讀取使用 responseType: blob。
2. 新增日期先儲存取得 dayId，再上傳該日單張照片；照片失败保留檔案供重試，不重複新增日期。
3. 編輯既有日期時載入照片，替換失敗保留原圖，成功後重新載入驗證。
4. 移除「僅預覽」提示並將照片狀態納入 busy／dirty 保護。
5. 驗證新增、替換、移除、重新開啟回填，以及與行程相簿完全分離。

## 版面參考

- [雄獅每日行程](https://tour.liontravel.us/zh-tw/F6EA00B9-0F32-4DD4-B659-FA37E7233BDB)：DAY 分段、展開內容、餐食與旅館資訊。
- [KKday 行程介紹](https://www.kkday.com/zh-tw/product/576620)：按天分段的行程資訊。
- [可樂旅遊行程搜尋](https://www.colatour.com.tw/webDM/serve/t/new_tour/tour_PatternSearch/patternsearch.html)：以每日路線摘要呈現旅程。

只參考資訊組織方式，沒有複製網站照片或完整行程文案。
