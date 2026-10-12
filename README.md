# 日語單字學習系統

一個使用 Google 帳戶登入的日語單字學習網站。單字資料會保存到 Firebase Cloud Firestore，因此使用同一個 Google 帳戶登入時，可以在電腦、手機與其他設備讀取相同資料。

## 功能

- 使用 Google 帳戶登入與登出
- 建立不同的單字單元
- 新增日文單字與中文翻譯
- 刪除不需要的單字
- 三種測驗模式：
  - 給中文選日文
  - 給日文選中文
  - 給中文拼寫日文
- 單字資料跨設備同步
- 每個 Google 帳戶使用獨立的單字資料

## 使用方式

### 1. 開啟網站並登入

開啟網站後，按下「使用 Google 登入」，使用要同步資料的 Google 帳戶登入。

登入完成後，畫面會顯示帳戶名稱，單元與單字管理功能也會解鎖。

### 2. 建立單元

1. 在「輸入新單元名稱」欄位輸入名稱，例如「N5 動詞」。
2. 按下「新增單元」。
3. 從下拉選單選擇要管理的單元。

### 3. 新增與刪除單字

選擇單元後：

1. 在日文欄位輸入單字，例如 `食べる`。
2. 在中文欄位輸入翻譯，例如 `吃`。
3. 按下「新增」。
4. 單字會顯示在清單中，並自動保存到雲端。

要刪除單字時，按下該單字右側的「刪除」，再確認刪除即可。

### 4. 開始測驗

選擇單元後，在「測驗模式」選擇一種題型：

- **給中文選日文**：看到中文翻譯，從選項選出日文。
- **給日文選中文**：看到日文單字，從選項選出中文。
- **給中文拼日文**：看到中文翻譯，手動輸入日文。

選擇題需要該單元至少有 4 個單字；拼寫題至少需要 1 個單字。

測驗結束後會自動返回單元管理畫面，也可以隨時按「結束測驗」離開。

## 跨設備同步

單字不是保存於某一台電腦的瀏覽器檔案，而是保存於 Firebase Cloud Firestore。只要：

1. 在不同設備開啟同一個網站。
2. 使用相同的 Google 帳戶登入。

就能取得同一份單字與單元資料。

不同 Google 帳戶之間的資料互相獨立。

## 專案檔案

- [index.html](./index.html)：網站頁面結構
- [style.css](./style.css)：網站樣式
- [script.js](./script.js)：登入、雲端資料同步、單字管理與測驗邏輯
- [firebase-config.js](./firebase-config.js)：Firebase Web App 設定

## 本機執行

這個專案使用 ES Module 與 Firebase Web SDK，請使用本機 Web Server 開啟，不要直接雙擊 `index.html`。

例如在專案資料夾執行：

```bash
python -m http.server 8000
```

然後用瀏覽器開啟：

```text
http://localhost:8000
```

也可以使用 VS Code 的 Live Server 擴充功能開啟 [index.html](./index.html)。

## Firebase 設定

Firebase Web 設定需放在 [firebase-config.js](./firebase-config.js)。目前專案已完成 Firebase Authentication 與 Firestore 的程式整合；若要在新的 Firebase 專案使用，請將 Firebase Console 提供的 Web App 設定填入該檔案，並在 Firebase Console：

1. 啟用 Google Authentication。
2. 建立 Cloud Firestore。
3. 將目前使用的 Firestore 規則設定為只允許登入者讀寫自己的 `users/{uid}` 文件。
4. 將網站網址加入 Authentication 的 Authorized domains。

## 免費方案

本專案可使用 Firebase Spark 免費方案。個人單字學習通常適合使用免費額度，但 Firebase 免費方案仍有儲存、讀寫與流量限制，請在 Firebase Console 的用量頁面查看目前使用量。
