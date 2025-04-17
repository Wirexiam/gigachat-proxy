let cachedToken = null;
let tokenExpiry = 0;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Only POST allowed");

  const { prompt, model = "GigaChat", temperature = 0.7, max_tokens = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: "❌ No prompt provided" });

  try {
    const token = await getAccessToken();
    const gptRes = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
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

    const data = await gptRes.json();
    if (!gptRes.ok) return res.status(500).json({ error: data });

    res.status(200).json({ result: data.choices[0].message.content.trim() });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) return cachedToken;

  const basicAuth = process.env.GIGACHAT_AUTH_KEY;

  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
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

  cachedToken = json.access_token;
  tokenExpiry = now + 29 * 60 * 1000;

  return cachedToken;
}
