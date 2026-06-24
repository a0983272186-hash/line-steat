# 專案筆記（2026-06-24 整理）

這份是「今天做了什麼、現在到哪、接下來怎麼接」的重點，方便換電腦或之後回來繼續。

---

## 一、這個專案是什麼

一隻 **LINE 客服機器人**：客戶在 LINE 傳訊息 → 用 Claude 依「商家知識」自動回覆。
- 碰到「報價、下單、付款、退換貨、客訴、發票、維修」等敏感字 → 自動回「轉專人」，不讓 AI 亂答。
- AI 沒把握時也會自動轉人工。
- 可選：每次轉人工推播通知老闆（需設 `OWNER_USER_ID`）。

技術：Node.js + Express + `@line/bot-sdk` + `@anthropic-ai/sdk`。

---

## 二、現在的狀態（重要）

- ✅ 程式**寫好也測過**（啟動、簽章驗證、轉人工邏輯都 OK）。
- ✅ 已 push 到 GitHub：`https://github.com/a0983272186-hash/line-steat`
- ⛔ **還沒部署上線**、**還沒接 LINE**。
- 👉 目前決定：**先走免費「半自動」**（客戶訊息貼給 Claude → 擬回覆 → 自己貼回 LINE），暫不花錢。

### 跟「原本那隻 PDF 機器人」的關係
- 原本那隻會出估價單 PDF 的機器人，**今天完全沒有被碰到**，照常運作。
- 這隻是**全新、獨立**的客服機器人，用的是**另外新開的一隻 LINE channel**（不會頂掉 PDF 那隻）。
- 本機找不到 PDF 機器人的原始碼（可能在別台電腦或只在雲端），所以「二合一」沒做，改成各自獨立。

---

## 三、要「全自動上線」還缺什麼

換不換電腦都一樣，缺這幾項：

1. **Claude API 金鑰**（尚未申請）
   - 到 https://console.anthropic.com/ （不是 claude.ai）→ Billing 儲值（最低 US$5）→ API Keys 建立 → `sk-ant-...`
   - ⚠️ claude.ai 的 Pro 訂閱**不含** API 金鑰，API 是另外按用量付費。
2. **雲端主機**（Render）
   - https://render.com/ → GitHub 登入 → New Web Service → 選 `line-steat` repo → 自動讀 `render.yaml`。
   - 免費方案會休眠（第一則訊息要等 30~50 秒）；要秒回約 US$7/月。
3. **環境變數**（填在 Render 的 Environment）
   - `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`（新客服 channel 的）
   - `ANTHROPIC_API_KEY`（上面申請的）
4. **接 Webhook**
   - LINE Developers → Messaging API → Webhook URL 填 `https://你的Render網址/webhook` → Verify。
   - 並關閉「自動回應訊息」、開啟 Webhook。

### 成本概算（全自動）
- Claude：按用量，一則約 NT$0.1~0.5，先儲 US$5。
- 主機：Render 免費 = $0（會休眠）/ 付費約 US$7 月。

---

## 四、換另一台電腦怎麼接續

需先裝 **Node.js** 和 **Git**，然後：
```bash
git clone https://github.com/a0983272186-hash/line-steat.git
cd line-steat
npm install
```
- ⚠️ `.env`（金鑰檔）**不會**跟著 git 過去（安全考量），要照 `.env.example` 自己重建。
- git 抓下來的是**程式碼**，不是跟 Claude 的對話記錄。

---

## 五、更新機器人會的內容

編輯 `knowledge.md`（商品、價格說明、營業時間、FAQ），commit 後 push，Render 會自動重新部署。**不用改程式。**

---

## 六、今天順手做的事：SanDisk → 創見 報價對照

客戶那張 SanDisk 清單，換成創見 ESD310C（雙頭 Type-C＋Type-A、支援 OTG，容量不變）：

| 原 SanDisk | 數量 | 換成 | PChome |
|---|---|---|---|
| Extreme PRO 固態行動碟 2TB | ×1 | ESD310C 2TB | https://24h.pchome.com.tw/prod/DGBN50-A900GEM8D |
| Ultra Luxe 2TB 隨身碟 | ×1 | ESD310C 2TB | https://24h.pchome.com.tw/prod/DGBN50-A900GEM8D |
| Ultra GO 1TB 隨身碟 | ×2 | ESD310C 1TB | https://24h.pchome.com.tw/prod/DGBN50-A900GAXAM |
| Ultra Luxe 256G 隨身碟 | ×4 | ESD310C 256GB | https://24h.pchome.com.tw/prod/DGBN6P-A900GAX6C |

共 8 支。規格：USB 3.2 Gen2 10Gbps、讀取約 1,050MB/s、五年保固、太空黑。
（給客戶用的文字版在桌面：`新增資料夾 (2)\創見ESD310C報價.txt`）

---

## 七、下一步（回來時從這裡接）

- 想**省錢** → 繼續半自動：開 Claude，把客戶訊息貼上，請它擬客服回覆。
- 想**全自動** → 申請 Claude 金鑰 → Render 部署 → 接 Webhook（照第三節）。
- 想讓回覆更準 → 把店名、營業時間、出貨方式、常賣商品/報價習慣補進 `knowledge.md`。
