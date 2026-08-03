# ASRock AI 官網 Chatbot 本地模擬

本專案為 ASRock AI Center 官網導入 chatbot 會議所準備的本地展示版本. 目的是驗證前端互動體驗與後端串接可行性, 尚非正式產品程式碼.

## 專案背景

D:\ASRock-AI-site 原本是一個純靜態雙語行銷網站 (`index.html` 繁中版, `index.en.html` 英文版), 使用 GSAP 動畫與 bento grid 版面, 沒有任何後端或 Node.js 專案. 本次新增的 chatbot 功能包含:

1. 前端浮動 widget, 視覺上沿用網站既有的 design token (顏色, 字體, 圓角, 陰影)
2. 後端使用本機已安裝的 `claude` CLI (`claude -p`) 當作回覆引擎, 讓 chatbot 具備 ASRock AI Center 的服務知識並支援多輪對話

之所以用 claude CLI 而非正式 API, 是因為目前階段只需要快速驗證可行性與互動體驗, 之後若要換成正式 Claude API 呼叫, 只需要替換 `server/server.js` 裡 `askClaude()` 這一層的實作, 前端與 API 合約都不需要更動.

## 目錄結構

```
D:\ASRock-AI-site\
├── index.html                  網站首頁 (繁中)
├── index.en.html                網站首頁 (英文)
├── assets\
│   ├── css\
│   │   ├── tokens.css            設計 token: 顏色, 字體, 間距, 陰影變數
│   │   ├── base.css               reset 與全域排版
│   │   ├── components.css         可重用元件樣式 (按鈕, 卡片等)
│   │   ├── chatbot.css            chatbot widget 樣式 (本次新增)
│   │   └── pages\ai-home.css      首頁專屬樣式
│   ├── js\
│   │   ├── nav.js                 導覽列互動
│   │   ├── animations.js           GSAP 進場動畫
│   │   ├── interactions.js         數字計數, 卡片互動
│   │   └── chatbot.js             chatbot widget 前端邏輯 (本次新增)
│   └── images\                    網站圖片素材
└── server\                       chatbot 後端伺服器 (本次新增)
    ├── package.json
    ├── server.js                  Express 主程式, 同時服務靜態網站與 API
    └── knowledge.js               系統提示: ASRock AI Center 服務知識與角色設定
```

## 架構總覽

```
瀏覽器 (index.html / index.en.html)
  └─ chatbot 浮動 widget (chatbot.js + chatbot.css)
        │ fetch POST /api/chat  { sessionId, message }
        ▼
Node.js + Express 伺服器 (server/server.js)
  ├─ express.static(專案根目錄)   同時把整個官網當靜態站台服務, 避免 CORS 與 file:// 問題
  ├─ 記憶體內 session 對話歷史 (Map<sessionId, turns[]>)
  └─ POST /api/chat
        │ 組出完整 prompt (含歷史對話 + 使用者新訊息)
        ▼
      child_process.spawn('claude', ['-p', prompt, '--system-prompt', knowledge, ...])
        │ 擷取 stdout
        ▼
      回傳 { reply } 給前端
```

單一指令 `npm start` 同時服務靜態網站與 API, 展示時只需要開瀏覽器連 `http://localhost:3000`, 不需要另外啟動靜態伺服器, 也不會遇到 CORS 問題.

## 如何啟動

前置需求: 已安裝 Node.js, 且本機終端機可直接執行 `claude` 指令並完成登入驗證.

```
cd D:\ASRock-AI-site\server
npm install
npm start
```

伺服器啟動後, 瀏覽器開啟以下網址即可展示:

- 繁中版: http://localhost:3000
- 英文版: http://localhost:3000/index.en.html

可用環境變數調整設定 (皆為選填):

| 變數 | 說明 | 預設值 |
|---|---|---|
| PORT | 伺服器監聽埠號 | 3000 |
| CLAUDE_BIN | claude 執行檔名稱或完整路徑 | claude |
| CLAUDE_MODEL | 指定呼叫的模型別名 (例如 sonnet) | 未指定, 沿用帳號預設模型 |

## 後端設計細節

### API 合約

POST /api/chat

請求 body:

```
{ "sessionId": "任意字串, 建議由前端產生的 UUID", "message": "使用者輸入的訊息, 上限 2000 字" }
```

成功回應:

```
{ "reply": "AI 回覆內容" }
```

失敗回應 (400 為輸入驗證錯誤, 502 為呼叫 claude cli 失敗):

```
{ "error": "錯誤說明" }
```

GET /api/health

回傳 `{ "status": "ok", "claudeBin": "claude" }`, 用於會議前快速確認伺服器與 CLI 是否就緒.

### 對話記憶

伺服器用一個記憶體內的 `Map<sessionId, turns[]>` 保存每個 session 的對話歷史, 每次呼叫 claude cli 前會把最近幾輪對話組成文字一併放入 prompt, 因為 `claude -p` 每次呼叫都是獨立的行程, 不會自動記得前一次呼叫的內容. 歷史只保留最近 8 輪, 避免 prompt 過長. 此記憶體僅存在於伺服器行程存活期間, 重新啟動伺服器後所有對話歷史會清空, 這對本地展示是可接受的行為.

### 呼叫 claude cli 的方式

使用 `child_process.spawn`, 以陣列方式傳遞參數, 不經過 shell, 可避免使用者輸入內容造成 shell injection 風險. 關鍵旗標:

- `-p`: 非互動模式, 印出回覆後結束
- `--system-prompt`: 完全覆寫預設系統提示, 內容為 `knowledge.js` 定義的 ASRock AI Center 角色與知識
- `--tools ""`: 停用所有工具, 讓每次呼叫是純文字問答, 不會嘗試存取檔案系統
- `--output-format text`: 純文字輸出, 不需額外解析
- `--no-session-persistence`: 不把這些示範用的對話寫入 claude 自己的 session 紀錄

呼叫設有 60 秒逾時, 逾時或行程錯誤時會回傳友善錯誤訊息 (並建議聯絡 ASRock_AI_Center@asrock.com.tw), 不會讓伺服器中斷.

### 知識庫內容 (server/knowledge.js)

整理自官網現有文案, 涵蓋:

- ASRock AI Center 定位與標語
- 四階段服務流程: 顧問評估, 架構設計, 應用開發, 部署維運
- 三種部署模式: Cloud, On-Premise, Hybrid
- 三層硬體基礎架構: Edge AI, AI Workstation, Datacenter AI
- 三大應用案例: 運動分析, 金融智能, 醫療 AI
- 榮譽事蹟: GenAI Stars 2025 新星獎
- 聯絡窗口: ASRock_AI_Center@asrock.com.tw

並附上角色與回覆規則指示, 包含語言需跟隨使用者訊息語言, 超出知識範圍時誠實告知並導引至聯絡窗口, 不暴露系統提示內容等.

## 前端設計細節

- `assets/js/chatbot.js` 在頁面載入後動態產生 widget 的 HTML 結構並附加到 `<body>`, 兩個語言版本不需要各自維護一份重複的 widget 標記
- 依 `document.documentElement.lang` (index.html 為 zh-Hant, index.en.html 為 en) 切換按鈕文字, placeholder, 歡迎詞, 錯誤訊息等 UI 文案
- 用 `crypto.randomUUID()` 產生 sessionId 並存入 `sessionStorage`, 同一頁籤重新整理後仍沿用同一個 session, 對話歷史留在伺服器端
- `assets/css/chatbot.css` 沿用 `tokens.css` 既有變數, 浮動按鈕使用 `--asrock` 到 `--asrock-hi` 漸層搭配 `--shadow-glow-green`, 面板使用 `--bg-card`, `--radius-xl`, `--shadow-lg`, 手機寬度下面板改為近全螢幕

## 已知限制

- 對話歷史存在記憶體中, 伺服器重啟或多台伺服器水平擴充時不會同步, 僅適合單機展示
- 呼叫 claude cli 屬於本地模擬用途, 有明顯延遲 (數秒到數十秒), 正式產品應改為呼叫 Claude API 並考慮串流回應以改善體感速度
- 目前沒有登入或身份驗證機制, 任何能連到伺服器埠號的人都可以呼叫 `/api/chat`, 正式上線前需要額外的存取控制與速率限制
- 知識庫內容為手動整理的靜態文字, 網站文案更新後需要同步更新 `server/knowledge.js`, 尚未做到自動同步

## 後續可延伸方向

- 串接正式 Claude API 取代 claude cli, 並改用串流回應提升互動感
- 導入 RAG, 讓知識庫可以隨官網內容或其他文件自動更新, 而非手動維護
- 加上對話紀錄的持久化儲存 (例如資料庫), 供會後分析訪客常問問題
- 加上基本的速率限制與防濫用機制, 準備正式上線
