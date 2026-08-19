require('dotenv').config();
const puppeteer = require('puppeteer');

// Lấy thông tin hoàn toàn từ biến môi trường (File .env hoặc Railway Variables)
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = parseInt(process.env.PORT || '8081', 10);

if (!TOKEN || !GUILD_ID || !CHANNEL_ID) {
  console.error('[LỖI] Vui lòng cấu hình đầy đủ DISCORD_TOKEN, GUILD_ID và CHANNEL_ID trong biến môi trường!');
  process.exit(1);
}

const express = require('express');
const app = express();
let browser = null;
let page = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [VIEWER-BOT] ${msg}`);
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', active: !!browser });
});

app.get('/', async (req, res) => {
  let statusText = browser ? "Trình duyệt đang CHẠY ngầm" : "Trình duyệt đang TẮT";
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discord Viewer Control</title>
      <style>
        body { font-family: sans-serif; background: #1e1f22; color: #dbdee1; text-align: center; padding-top: 50px; }
        .box { background: #2b2d31; display: inline-block; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        button { padding: 12px 24px; font-size: 15px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; margin: 10px; }
        .btn-open { background: #5865f2; color: white; }
        .btn-close { background: #da373c; color: white; }
        .status { font-weight: bold; color: ${browser ? '#23a55a' : '#f23f43'}; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>ĐIỀU KHIỂN DISCORD VIEWER</h2>
        <p>Trạng thái: <span class="status">${statusText}</span></p>
        <br>
        <button class="btn-open" onclick="window.location.href='/launch'">1. KHỞI CHẠY TRÌNH DUYỆT</button>
        <button class="btn-close" onclick="window.location.href='/stop'">2. ĐÓNG TRÌNH DUYỆT (GIỮ MẮT XEM)</button>
      </div>
    </body>
    </html>
  `);
});

app.get('/launch', async (req, res) => {
  if (!browser) {
    try {
      log('Đang khởi chạy Chromium...');
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--autoplay-policy=no-user-gesture-required',
          '--disable-background-timer-throttling'
        ]
      });

      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      log('Đang đăng nhập bằng Token bảo mật...');
      await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

      await page.evaluate((token) => {
        setInterval(() => {
          document.body.appendChild(document.createElement('iframe')).contentWindow.localStorage.token = `"${token}"`;
        }, 50);
        setTimeout(() => { location.reload(); }, 2000);
      }, TOKEN);

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
      
      log('Đang chuyển hướng tới Kênh Voice...');
      await page.goto(`https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`, { waitUntil: 'networkidle2' });

      log('>>> KHỞI CHẠY THÀNH CÔNG <<<');
    } catch (err) {
      log(`Lỗi: ${err.message}`);
      if (browser) await browser.close();
      browser = null;
      return res.send(`Lỗi: ${err.message}`);
    }
  }

  res.send(`
    <script>
      alert('Đã khởi chạy phiên làm việc thành công!');
      window.location.href = '/';
    </script>
  `);
});

app.get('/stop', async (req, res) => {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    log('Đã đóng trình duyệt điều khiển.');
  }
  res.send(`
    <script>
      alert('Đã đóng trình duyệt. Mắt xem vẫn được giữ!');
      window.location.href = '/';
    </script>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  log(`Server đang chạy tại cổng ${PORT}`);
});
