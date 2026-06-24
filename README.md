# LINE 客服機器人（Claude 自動回覆）

客戶傳訊息到你的 LINE 官方帳號 → 機器人用 Claude 依「商家知識」自動回覆。
碰到報價／下單／退換貨／客訴等敏感字，或 AI 沒把握時，會自動回「轉專人」並（可選）通知你。

---

## 一、需要先準備的東西（這幾步只有你能做，因為要登入你的帳號）

### 1. LINE 官方帳號 + Messaging API
1. 到 https://developers.line.biz/ 用 LINE 帳號登入。
2. 建立一個 **Provider** → 建立一個 **Messaging API channel**。
3. 在該 channel 的 **Basic settings** 頁，複製 **Channel secret** → 就是 `LINE_CHANNEL_SECRET`。
4. 在 **Messaging API** 頁，發行 **Channel access token (long-lived)** → 就是 `LINE_CHANNEL_ACCESS_TOKEN`。
5. 同一頁把 **「自動回應訊息 (Auto-reply messages)」關閉**、**「Webhook」開啟**（不然會跟機器人打架）。

### 2. Claude API 金鑰
1. 到 https://console.anthropic.com/ 註冊／登入，儲值一點額度。
2. 建立 API key → 就是 `ANTHROPIC_API_KEY`。

---

## 二、部署到雲端（Render，免費方案即可起步）

1. 先把這個資料夾推到一個 GitHub repo（見最下方指令）。
2. 到 https://render.com/ 用 GitHub 登入 → **New +** → **Web Service** → 選你的 repo。
3. Render 會讀到 `render.yaml`，自動設定好 build / start 指令。
4. 在 **Environment** 填入這三個（render.yaml 已標 `sync:false`，需手動填）：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `ANTHROPIC_API_KEY`
   - （`OWNER_USER_ID` 之後再填，見步驟四）
5. 部署完成後會得到一個網址，例如 `https://line-customer-bot-xxxx.onrender.com`。

> ⚠️ Render 免費方案閒置會休眠，下一則訊息可能要等 30~50 秒冷啟動。
> 正式營運建議用付費方案，或改用 Railway / Fly.io 等不休眠的服務。

---

## 三、把 Webhook 接上 LINE

1. 回 LINE Developers 的 **Messaging API** 頁，**Webhook URL** 填：
   `https://你的網址/webhook`
2. 按 **Verify**，顯示 Success 即連通。
3. 確認 **Use webhook** 是開啟的。

現在用你的手機加這個官方帳號為好友，傳訊息測試即可。

---

## 四、（選填）開啟「轉人工」推播通知

想在每次轉人工時收到通知：
1. 部署好後，自己用 LINE 傳一句話給機器人。
2. 看 Render 的 **Logs**，會印出 `收到 <你的userId>：...`。
3. 把那個 userId 填到環境變數 `OWNER_USER_ID`，重新部署即可。

---

## 五、更新機器人會的內容

編輯 `knowledge.md`（商品、價格說明、營業時間、FAQ…），commit 推上 GitHub，Render 會自動重新部署。
**不需要改程式。**

---

## 本機測試（選用）

```bash
npm install
cp .env.example .env   # 然後把值填進 .env
npm run dev
```
本機沒有公開網址，要讓 LINE 連到你，需另外用 ngrok：`ngrok http 3000`，把它給的 https 網址 + `/webhook` 填到 LINE。

## 推到 GitHub 的指令

```bash
git init
git add .
git commit -m "init line customer bot"
git branch -M main
git remote add origin https://github.com/你的帳號/line-customer-bot.git
git push -u origin main
```
