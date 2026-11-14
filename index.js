// NOX TOPSPEED - Webhook B v4 Final - มีหมุดฟ้า + ปุ่มปิดเปิด ครบทุกอย่าง
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || '';
const CHANNEL_SECRET = process.env.CHANNEL_SECRET || '';
const REPLY_TEXT = process.env.REPLY_TEXT || '🙏🙏🙏';
const IMAGE_MODE = process.env.IMAGE_MODE || 'ignore';
const SINGLE_MODE = process.env.SINGLE_MODE || '0';
const BLOCK_WORDS = (process.env.BLOCK_WORDS || 'ฝาก,ถอน,ราคา,สเปวิไล,เครดิต').split(',').map(s=>s.trim()).filter(Boolean);
const LICENSE_CODE = process.env.LICENSE_CODE || '';
const LICENSE_EXPIRE = process.env.LICENSE_EXPIRE || '';

// ===== หมุดฟ้า / รายชื่อที่อนุญาต - หลักการ NOX ห้ามทิ้ง =====
const ALLOWED_NAMES = C4 (process.env.ALLOWED_NAMES || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

// ===== ปุ่มปิดเปิด - เปิดอยู่ตอนแรก =====
let B_ENABLED = true;

const LAST_REPLY = new Map();

function isLicenseOK(){
  if(!LICENSE_CODE) return true;
  if(!LICENSE_EXPIRE) return true;
  const now = new Date();
  const exp = new Date(LICENSE_EXPIRE + 'T23:59:59');
  return now <= exp;
}

function isLottery(text){
  const t = (text || '').trim();
  if(!t) return false;
  if(/^\d{9,12}$/.test(t.replace(/\s/g,''))) return false;
  for(const w of BLOCK_WORDS){
    if(w && t.includes(w)){
      if(/ลาว|รูด|บน|ล่าง|หวย|บลก/.test(t)) break;
      return false;
    }
  }
  const hasSep = /[\/\-=\*\.:]/.test(t);
  const digitCount = (t.match(/\d/g) || []).length;
  const hasLotteryWord = /ลาว|รูด|บน|ล่าง|เบิ้ล|ชุด|บาท|ตัวละ|ซื้อ|แทง|หวย|ดาว|ฮานอย|รัฐบาล|ฮั้ง|นิ|สิง|พัด|บลก/.test(t);
  if(hasLotteryWord && digitCount >= 1) return true;
  if(hasSep && digitCount >= 2) return true;
  return false;
}

async function getDisplayName(userId){
  try{
    const pr = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` }
    });
    const pj = await pr.json();
    return pj.displayName || '';
  }catch(e){ return ''; }
}

async function sendReply(replyToken, text){
  const r = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
  });
  return r.status;
}

function verifySignature(req){
  if(!CHANNEL_SECRET) return true;
  const sig = req.headers['x-line-signature'];
  if(!sig) return false;
  const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(req.rawBody).digest('base64');
  return hash === sig;
}

// ===== หน้าปุ่มปิดเปิด =====
app.get('/control', (req, res) => {
  res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body{font-family:sans-serif;text-align:center;padding:30px;background:#111;color:#fff}
    h1{font-size:32px;margin:0} p{color:#aaa}
    .status{font-size:26px;margin:25px 0;padding:25px;border-radius:15px;background:${B_ENABLED ? '#00ff88' : '#ff3333'};color:#000;font-weight:bold}
    button{font-size:28px;padding:20px 40px;margin:10px;border:none;border-radius:15px;cursor:pointer;width:90%;max-width:400px}
    .on{background:#00ff88} .off{background:#ff3333;color:#fff}
    .box{background:#222;padding:20px;border-radius:15px;margin-top:20px;text-align:left;font-size:16px;line-height:1.8}
    </style></head><body>
    <h1>NOX TOPSPEED B</h1>
    <p>ปุ่มปิดเปิด Webhook B</p>
    <div class="status">${B_ENABLED ? '🟢 กำลังเปิดอยู่ - ตอบลูกค้าแล้ว' : '🔴 ปิดอยู่ - ไม่ตอบใคร'}</div>
    <form method="POST" action="/control/on"><button class="on" type="submit">✅ เปิด NOX</button></form>
    <form method="POST" action="/control/off"><button class="off" type="submit">🛑 ปิด NOX</button></form>
    <div class="box">
    <b>วิธีใช้:</b><br>
    • กดปิด = B จะไม่ตอบใครเลย<br>
    • กดเปิด = B กลับมาตอบปกติ<br>
    • หรือพิมพ์ในแชทว่า <b>ปิดnox</b> / <b>เปิดnox</b> ก็ได้<br>
    • หมุดฟ้าตอนนี้: ${ALLOWED_NAMES.length > 0 ? ALLOWED_NAMES.join(', ') : 'รับทุกคน (ทดลอง)'}<br>
    • ข้อความตอบ: ${REPLY_TEXT}
    </div>
    </body></html>
  `);
});
app.post('/control/on', (req, res) => { B_ENABLED = true; console.log('แอดมินกดเปิด NOX'); res.redirect('/control'); });
app.post('/control/off', (req, res) => { B_ENABLED = false; console.log('แอดมินกดปิด NOX'); res.redirect('/control'); });

app.get('/', (req, res) => {
  res.send('NOX TOPSPEED Webhook B v4 พร้อมแล้ว | เปิดอยู่: ' + (B_ENABLED ? 'ใช่' : 'ไม่') + ' | License: ' + (isLicenseOK() ? 'OK' : 'หมดอายุ') + ' | หมุดฟ้า: ' + (ALLOWED_NAMES.length > 0 ? ALLOWED_NAMES.join(',') : 'รับทุกคน'));
});

app.post('/webhook', async (req, res) => {
  if(!verifySignature(req)) return res.sendStatus(401);
  const events = req.body.events || [];
  for(const ev of events){
    try{
      if(ev.type !== 'message') continue;
      if(ev.message.type !== 'text') {
        // ถ้าไม่ใช่ข้อความตัวอักษร ให้เช็คปุ่มปิดเปิดก่อนแล้วข้ามเลย
        if(!B_ENABLED) continue;
        if(!isLicenseOK()) continue;
        const userId2 = ev.source?.userId || 'unknown';
        if(ALLOWED_NAMES.length > 0 || ALLOWED_USER_IDS.length > 0){
          if(!ALLOWED_USER_IDS.includes(userId2)){
            const nm = await getDisplayName(userId2);
            if(!ALLOWED_NAMES.includes(nm)) continue;
          }
        }
        if(ev.message.type === 'image' || ev.message.type === 'sticker'){
          if(IMAGE_MODE !== 'receive') continue;
          await sendReply(ev.replyToken, REPLY_TEXT);
          continue;
        }
        continue;
      }

      const text = (ev.message.text || '').trim();
      const userId = ev.source?.userId || 'unknown';
      const lower = text.toLowerCase();

      // ===== คำสั่งปิดเปิดจากแชท - พิมพ์ ปิดnox / เปิดnox =====
      if(lower === 'ปิดnox' || lower === 'ปิด nox' || lower === 'nox off'){
        B_ENABLED = false;
        console.log('สั่งปิด NOX จากแชท:', userId);
        await sendReply(ev.replyToken, '🛑 ปิด NOX แล้ว จะไม่ตอบใครจนกว่าจะพิมพ์ เปิดnox');
        continue;
      }
      if(lower === 'เปิดnox' || lower === 'เปิด nox' || lower === 'nox on'){
        B_ENABLED = true;
        console.log('สั่งเปิด NOX จากแชท:', userId);
        await sendReply(ev.replyToken, '✅ เปิด NOX แล้ว พร้อมตอบลูกค้า');
        continue;
      }

      // เช็คปุ่มปิดเปิดก่อนเลย ถ้าปิดอยู่ไม่ตอบใคร
      if(!B_ENABLED){
        console.log('NOX ปิดอยู่ ไม่ตอบ');
        continue;
      }
      if(!isLicenseOK()){
        console.log('License หมดอายุ ไม่ตอบ');
        continue;
      }

      // ===== หมุดฟ้า - ถ้าไม่ใช่คนที่ปักหมุดไว้ ไม่ตอบ =====
      if(ALLOWED_NAMES.length > 0 || ALLOWED_USER_IDS.length > 0){
        if(ALLOWED_USER_IDS.includes(userId)){
          console.log('หมุดฟ้า ผ่าน UserId:', userId);
        } else {
          const displayName = await getDisplayName(userId);
          console.log('เช็คหมุดฟ้า:', displayName, userId);
          if(!ALLOWED_NAMES.includes(displayName)){
            console.log('ไม่ใช่หมุดฟ้า ข้าม:', displayName);
            continue;
          }
          console.log('หมุดฟ้า ผ่านชื่อ:', displayName);
        }
      }

      // กันสแปมแบบรับทีละคน
      if(SINGLE_MODE === '1'){
        const last = LAST_REPLY.get(userId) || 0;
        if(Date.now() - last < 5000){
          console.log('กันสแปม ข้าม:', userId);
          continue;
        }
      }

      console.log('ได้รับ:', text);
      if(!isLottery(text)){
        console.log('ไม่ใช่เลขหวย ข้าม:', text);
        continue;
      }

      const status = await sendReply(ev.replyToken, REPLY_TEXT);
      console.log('ส่งแล้ว status:', status);
      LAST_REPLY.set(userId, Date.now());
    }catch(e){ console.log('error:', e.message); }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('NOX B v4 พร้อมที่พอร์ต ' + PORT));
