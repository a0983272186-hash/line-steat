import express from 'express';
import { messagingApi, middleware } from '@line/bot-sdk';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import 'dotenv/config';

const {
  LINE_CHANNEL_ACCESS_TOKEN,
  LINE_CHANNEL_SECRET,
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001',
  OWNER_USER_ID, // 選填：填了之後，每次轉人工會推播通知你
  PORT = 3000,
} = process.env;

// ---- 啟動前檢查必要的環境變數 ----
for (const [k, v] of Object.entries({ LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, ANTHROPIC_API_KEY })) {
  if (!v) {
    console.error(`❌ 缺少環境變數 ${k}，請參考 .env.example 設定`);
    process.exit(1);
  }
}

// ---- 載入商家知識（可隨時編輯 knowledge.md，重啟即生效）----
const knowledge = fs.readFileSync(new URL('./knowledge.md', import.meta.url), 'utf8');

const lineClient = new messagingApi.MessagingApiClient({ channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---- 安全閥：碰到這些字一律轉人工，不讓 AI 自己回 ----
const ESCALATION_KEYWORDS = [
  '下單', '訂購', '訂單', '報價', '開單', '匯款', '付款',
  '退貨', '退款', '退錢', '換貨', '客訴', '投訴', '抱怨', '不滿',
  '發票', '保固申請', '維修', '送修', '故障',
];
const TRANSFER_MESSAGE = '這部分我幫您轉給專人處理，稍後會由真人同仁回覆您，謝謝您 🙏';

// ---- 每位客戶保留最近幾輪對話，讓回覆有上下文 ----
const histories = new Map(); // userId -> [{ role, content }]
const MAX_TURNS = 8;

const SYSTEM_PROMPT = `你是一間電腦／3C 銷售商家的 LINE 客服助理，請用繁體中文、親切又簡潔地回覆客戶。

規則：
- 只根據下面「商家知識」回答；知識裡沒有、或你不確定的，不要亂編，直接輸出 [[TRANSFER]]。
- 凡涉及「確定報價、下單、付款、訂單、退換貨、客訴、發票、保固維修」等，一律輸出 [[TRANSFER]]，交給真人處理。
- 可以主動提供一般產品介紹、規格說明、相容性、大概的參考資訊。
- 每則回覆控制在 3～5 句內，口吻像真人客服，不要像機器人。
- 不要在回覆裡提到「知識庫」「系統」「AI」這些字眼。

# 商家知識
${knowledge}`;

function needsHuman(text) {
  return ESCALATION_KEYWORDS.some((k) => text.includes(k));
}

async function notifyOwner(userId, text) {
  if (!OWNER_USER_ID) return;
  try {
    await lineClient.pushMessage({
      to: OWNER_USER_ID,
      messages: [{ type: 'text', text: `⚠️ 有客戶需要人工處理\n客戶 ID：${userId}\n訊息：${text}` }],
    });
  } catch (e) {
    console.error('notifyOwner 失敗：', e?.message);
  }
}

async function replyText(replyToken, text) {
  return lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  console.log(`收到 ${userId}：${text}`);

  // 安全閥（關鍵字）：直接轉人工
  if (needsHuman(text)) {
    await notifyOwner(userId, text);
    return replyText(event.replyToken, TRANSFER_MESSAGE);
  }

  const history = histories.get(userId) || [];
  const messages = [...history, { role: 'user', content: text }];

  let reply = '';
  try {
    const resp = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    });
    reply = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  } catch (e) {
    console.error('Claude 呼叫失敗：', e?.message);
    reply = '[[TRANSFER]]';
  }

  // 安全閥（AI 自評）：沒把握 → 轉人工
  if (!reply || reply.includes('[[TRANSFER]]')) {
    await notifyOwner(userId, text);
    return replyText(event.replyToken, TRANSFER_MESSAGE);
  }

  // 存回對話歷史（只留最近幾輪）
  histories.set(userId, [...messages, { role: 'assistant', content: reply }].slice(-MAX_TURNS * 2));

  return replyText(event.replyToken, reply);
}

const app = express();

// 健康檢查 / 雲端喚醒用
app.get('/', (_req, res) => res.send('LINE customer bot is running.'));

// LINE webhook：middleware 會驗證官方簽章，擋掉偽造請求
app.post('/webhook', middleware({ channelSecret: LINE_CHANNEL_SECRET }), async (req, res) => {
  res.status(200).end(); // 先回 200，避免 LINE 逾時重送
  const events = req.body.events || [];
  for (const ev of events) {
    try {
      await handleEvent(ev);
    } catch (e) {
      console.error('handleEvent error：', e?.message);
    }
  }
});

// 簽章驗證失敗等錯誤：安靜回 401，不要噴 500 + stack trace
app.use((err, _req, res, _next) => {
  if (err?.name === 'SignatureValidationFailed') {
    return res.status(401).send('Invalid signature');
  }
  console.error('未預期錯誤：', err?.message);
  res.status(500).end();
});

app.listen(PORT, () => console.log(`✅ LINE 客服機器人已啟動，listening on :${PORT}（模型 ${ANTHROPIC_MODEL}）`));
