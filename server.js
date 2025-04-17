import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import crypto from "crypto";
import https from "https";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ➕ CORS заголовки
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.post("/", async (req, res) => {
  const { prompt, model = "GigaChat", temperature = 0.7, max_tokens = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: "❌ No prompt provided" });

  try {
    const token = await getAccessToken();

    const response = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      agent: new https.Agent({ rejectUnauthorized: false }), // ⚠️ обход SSL
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data });

    res.json({ result: data.choices[0].message.content.trim() });

  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ GigaChat-прокси работает на Railway");
});

app.listen(PORT, () => {
  console.log("🔌 Сервер запущен на порту:", PORT);
});

// Получение access_token от GigaChat
async function getAccessToken() {
  const basicAuth = process.env.GIGACHAT_AUTH_KEY;
  if (!basicAuth) throw new Error("❌ GIGACHAT_AUTH_KEY не указан");

  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    agent: new https.Agent({ rejectUnauthorized: false }), // ⚠️ обход SSL
    headers: {
      "Authorization": "Basic " + basicAuth,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": crypto.randomUUID()
    },
    body: "scope=GIGACHAT_API_PERS"
  });

  const json = await response.json();
  if (!json.access_token) throw new Error("❌ Не удалось получить access_token");

  return json.access_token;
}
