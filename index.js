require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');

const TOKEN = process.env.DISCORD_TOKEN || ;
const GUILD_ID = process.env.GUILD_ID || '1343934186448359436';
const CHANNEL_ID = process.env.CHANNEL_ID || '1343934187219976256';
const PORT = parseInt(process.env.PORT || '8081', 10);

const app = express();
let browser = null;
let page = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [RAILWAY-VIEWER] ${msg}`);
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Railway Discord Viewer</title>
      <style>
        body { font-family: sans-serif; background: #0f172a; color: #fff; text-align: center; padding-top: 50px; }
        button { padding: 14px 28px; font-size: 16px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; margin: 10px; }
        .btn-start { background: #22c55e; color: white; }
        .btn-stop { background: #ef4444; color: white; }
      </style>
    </head>
    <body>
      <h1>BẢNG ĐIỀU KHIỂN BOT MẮT XEM (RAILWAY)</h1>
      <p>Kênh Voice Target: <b>${CHANNEL_ID}</b></p>
      <button class="btn-start" onclick="fetch('/start').then(r=>r.text()).then(alert)">BẮT ĐẦU TĂNG VIEWER</button>
      <button class="btn-stop" onclick="fetch('/stop').then(r=>r.text()).then(alert)">TẮT VIEWER</button>
    </body>
    </html>
  `);
});

app.get('/start', async (req, res) => {
  if (browser) return res.send('Bot đang chạy sẵn trên Railway!');

  try {
    log('Đang khởi chạy Chromium trên Railway Container...');
    
    // Sử dụng đường dẫn Chromium cài từ Dockerfile
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Tránh tràn bộ nhớ SHARED MEMORY trên Railway
        '--disable-gpu',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-background-timer-throttling'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    log('Đang tự động đăng nhập Token...');
    await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

    await page.evaluate((token) => {
      setInterval(() => {
        document.body.appendChild(document.createElement('iframe')).contentWindow.localStorage.token = `"${token}"`;
      }, 50);
      setTimeout(() => { location.reload(); }, 2000);
    }, TOKEN);

    log('Đang kết nối vào Kênh Voice trên Server Discord...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    await page.goto(`https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`, { waitUntil: 'networkidle2' });

    // Giữ nhịp tương tác chuột giả để không bị ngắt luồng
    setInterval(async () => {
      if (page) {
        await page.mouse.move(Math.floor(Math.random() * 200), Math.floor(Math.random() * 200));
      }
    }, 10000);

    log('>>> ĐÃ KÍCH HOẠT MẮT XEM THÀNH CÔNG TRÊN RAILWAY <<<');
    res.send('Tăng mắt xem thành công trên Railway!');

  } catch (err) {
    log(`Lỗi: ${err.message}`);
    if (browser) await browser.close();
    browser = null;
    res.send(`Lỗi: ${err.message}`);
  }
});

app.get('/stop', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    log('Đã dừng kết nối Viewer.');
    return res.send('Đã tắt mắt xem.');
  }
  res.send('Bot hiện không chạy.');
});

app.listen(PORT, '0.0.0.0', () => {
  log(`Server Railway đang chạy tại Cổng ${PORT}`);
});
