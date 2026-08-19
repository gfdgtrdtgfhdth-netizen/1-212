require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');

const TOKEN = process.env.DISCORD_TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '1343934186448359436';
const CHANNEL_ID = process.env.CHANNEL_ID || '1343934187219976256';
const PORT = parseInt(process.env.PORT || '8081', 10);

const app = express();
let browser = null;
let page = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [RAILWAY-VIEWER] ${msg}`);
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', active: !!browser });
});

// Trang chủ hiển thị trạng thái và nút mở/tắt phiên làm việc
app.get('/', async (req, res) => {
  let statusText = browser ? "Trình duyệt đang CHẠY ngầm trên Server" : "Trình duyệt đang TẮT";
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discord Web Viewer Control</title>
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
        <h2>ĐIỀU KHIỂN DISCORD WEB VIEWER</h2>
        <p>Trạng thái: <span class="status">${statusText}</span></p>
        <p>Server đang giữ tài khoản Token đăng nhập sẵn.</p>
        <br>
        <button class="btn-open" onclick="window.location.href='/launch'">1. KHỞI CHẠY & ĐĂNG NHẬP SẴN</button>
        <button class="btn-close" onclick="window.location.href='/stop'">2. ĐÓNG TRÌNH DUYỆT (GIỮ MẮT XEM)</button>
        <br><br>
        <a href="https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}" target="_blank" style="color: #00a8fc;">Mở trực tiếp link Kênh Discord</a>
      </div>
    </body>
    </html>
  `);
});

// Khởi chạy trình duyệt, nạp sẵn Token và trỏ thẳng vào Server/Kênh Voice
app.get('/launch', async (req, res) => {
  if (!browser) {
    try {
      log('Đang khởi chạy Chromium trên Railway...');
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

      log('Đang nạp Token vào phiên làm việc...');
      await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

      // Inject Token tự động đăng nhập
      await page.evaluate((token) => {
        setInterval(() => {
          document.body.appendChild(document.createElement('iframe')).contentWindow.localStorage.token = `"${token}"`;
        }, 50);
        setTimeout(() => { location.reload(); }, 2000);
      }, TOKEN);

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
      
      // Chuyển thẳng đến Kênh Voice của bạn
      log('Đang mở Kênh Voice...');
      await page.goto(`https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}`, { waitUntil: 'networkidle2' });

      log('>>> ĐÃ KHỞI CHẠY VÀ ĐĂNG NHẬP THÀNH CÔNG TRÊN SERVER <<<');
    } catch (err) {
      log(`Lỗi: ${err.message}`);
      if (browser) await browser.close();
      browser = null;
      return res.send(`Lỗi: ${err.message}`);
    }
  }

  res.send(`
    <script>
      alert('Đã khởi chạy phiên làm việc thành công! Bot đã vào sẵn kênh.');
      window.location.href = '/';
    </script>
  `);
});

// Đóng trình duyệt nhưng container ngầm vẫn giữ trạng thái
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
