// NOX TOPSPEED - Webhook B v5 Final - หน้าเดียวจบ ปุ่มปิดเปิด + หมุดฟ้า
const 【entity-express¦canonical_name=express】 = require('【entity-express¦canonical_name=express】');
const crypto = require('crypto');
const app = 【entity-express¦canonical_name=express】();
app.use(【entity-express¦canonical_name=express】.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(【entity-express¦canonical_name=express】.urlencoded({ extended: true }));

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || '';
const CHANNEL_SECRET = process.env.CHANNEL_SECRET || '';
const REPLY_TEXT = process.env.REPLY_TEXT || '🙏🙏🙏';
const IMAGE_MODE = process.env.IMAGE_MODE || 'ignore';
const SINGLE_MODE = process.env.SINGLE_MODE || '0';
const BLOCK_WORDS = (process.env.BLOCK_WORDS || 'ฝาก,ถอน,ราคา,สเปวิไล,เครดิต').split(',').map(s=>s.trim()).filter(Boolean);
const LICENSE_CODE = process.env.LICENSE_CODE || '';
const LICENSE_EXPIRE = process.env.LICENSE_EXPIRE || '';

// ===== ที่วางชื่อหมุดฟ้า - ที่เดียวจบ ไม่ต้องเข้า Render แล้ว =====
let ALLOWED_NAMES = (process.env.ALLOWED_NAMES || '').split(',').map(s => s.trim()).filter(Boolean);
let ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

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

app.get('/control', (req, res) => {
  const namesHtml = ALLOWED_NAMES.length === 0
    ? '<p style="color:#ff0">⚠️ ตอนนี้ยังไม่มีชื่อหมุดฟ้าเลย = รับทุกคนอยู่ (โหมดทดลอง)<br>พิมพ์ชื่อข้างล่างแล้วกดเพิ่ม เพื่อล็อกให้รับแค่คนนั้น</p>'
    : ALLOWED_NAMES.map((n,i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#333;padding:12px 15px;border-radius:10px;margin:8px 0">
        <span style="font-size:20px">📌 ${n}</span>
        <form method="POST" action="/control/remove-name" style="margin:0"><input type="hidden" name="index" value="${i}"><button type="submit" style="background:#ff3333;color:#fff;border:none;padding:8px 15px;border-radius:8px;font-size:16px;cursor:pointer">ลบ</button></form>
      </div>`).join('');
  res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body{font-family:sans-serif;text-align:center;padding:20px;background:#111;color:#fff;max-width:600px;margin:0 auto}
    h1{font-size:30px;margin:10px 0} p{color:#aaa}
    .status{font-size:24px;margin:20px 0;padding:20px;border-radius:15px;background:${B_ENABLED ? '#00ff88' : '#ff3333'};color:#000;font-weight:bold}
    button{font-size:22px;padding:15px 25px;margin:8px;border:none;border-radius:12px;cursor:pointer}
    .on{background:#00ff88} .off{background:#ff3333;color:#fff}
    .box{background:#222;padding:20px;border-radius:15px;margin-top:20px;text-align:left}
    input[type=text]{width:100%;padding:15px;font-size:20px;border-radius:10px;border:none;margin:10px 0;box-sizing:border-box}
    .addbtn{background:#00aaff;color:#fff;width:100%}
    </style></head><body>
    <h1>NOX TOPSPEED B</h1>
    <p>หน้าควบคุมที่เดียวจบ</p>
    <div class="status">${B_ENABLED ? '🟢 กำลังเปิดอยู่ - ตอบลูกค้าแล้ว' : '🔴 ปิดอยู่ - ไม่ตอบใคร'}</div>
    <form method="POST" action="/control/on"><button class="on" type="submit" style="width:100%">✅ เปิด NOX</button></form>
    <form method="POST" action="/control/off"><button class="off" type="submit" style="width:100%">🛑 ปิด NOX</button></form>
    <div class="box">
      <h2 style="margin:0 0 10px 0">📌 รายชื่อหมุดฟ้า - รับแค่คนนี้เท่านั้น</h2>
      ${namesHtml}
      <form method="POST" action="/control/add-name">
        <input type="text" name="name" placeholder="พิมพ์ชื่อ LINE ลูกค้า เช่น เจ้าสัวสามขุม" required>
        <button class="addbtn" type="submit">➕ เพิ่มชื่อหมุดฟ้า</button>
      </form>
      <p style="font-size:14px">* ชื่อต้องตรงกับชื่อ LINE ของลูกค้าเป๊ะๆ ถ้าใส่ชื่อไว้แล้ว คนที่ไม่มีชื่อจะไม่ได้รับคำตอบเลย</p>
      <p style="font-size:14px">* ถ้าลบชื่อออกหมด จะกลับไปเป็นรับทุกคน (โหมดทดลอง)</p>
    </div>
    <div class="box" style="font-size:16px;line-height:1.8">
      <b>ข้อมูลตอนนี้:</b><br>
      - ข้อความตอบ: ${REPLY_TEXT}<br>
      - คำสั่งในแชท: พิมพ์ <b>ปิดnox</b> / <b>เปิดnox</b> ก็ได้
    </div>
    </body></html>
  `);
});
app.post('/control/on', (req, res) => { B_ENABLED = true; console.log('แอดมินกดเปิด NOX'); res.redirect('/control'); });
app.post('/control/off', (req, res) => { B_ENABLED = false; console.log('แอดมินกดปิด NOX'); res.redirect('/control'); });
app.post('/control/add-name', (req, res) => {
  const n = (req.body.name || '').trim();
  if(n && !ALLOWED_NAMES.includes(n)){ ALLOWED_NAMES.push(n); console.log('เพิ่มหมุดฟ้า:', n); }
  res.redirect('/control');
});
app.post('/control/remove-name', (req, res) => {
  const idx = parseInt(req.body.index);
  if(!isNaN(idx) && idx >= 0 && idx < ALLOWED_NAMES.length){ console.log('ลบหมุดฟ้า:', ALLOWED_NAMES[idx]); ALLOWED_NAMES.splice(idx, 1); }
  res.redirect('/control');
});

app.get('/', (req, res) => {
  res.send('NOX TOPSPEED Webhook B v5 พร้อมแล้ว | เปิดอยู่: ' + (B_ENABLED ? 'ใช่' : 'ไม่') + ' | หมุดฟ้า: ' + (ALLOWED_NAMES.length > 0 ? ALLOWED_NAMES.join(',') : 'รับทุกคน'));
});

app.post('/webhook', async (req, res) => {
  if(!verifySignature(req)) return res.sendStatus(401);
  const events = req.body.events || [];
  for(const ev of events){
    try{
      if(ev.type !== 'message') continue;
      if(ev.message.type !== 'text') {
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
      if(lower === 'ปิดnox' || lower === 'ปิด nox' || lower === 'nox off'){
        B_ENABLED = false;
        await sendReply(ev.replyToken, '🛑 ปิด NOX แล้ว จะไม่ตอบใครจนกว่าจะพิมพ์ เปิดnox');
        continue;
      }
      if(lower === 'เปิดnox' || lower === 'เปิด nox' || lower === 'nox on'){
        B_ENABLED = true;
        await sendReply(ev.replyToken, '✅ เปิด NOX แล้ว พร้อมตอบลูกค้า');
        continue;
      }
      if(!B_ENABLED) continue;
      if(!isLicenseOK()) continue;
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
        }
      }
      if(SINGLE_MODE === '1'){
        const last = LAST_REPLY.get(userId) || 0;
        if(Date.now() - last < 5000) continue;
      }
      if(!isLottery(text)) continue;
      const status = await sendReply(ev.replyToken, REPLY_TEXT);
      console.log('ส่งแล้ว status:', status);
      LAST_REPLY.set(userId, Date.now());
    }catch(e){ console.log('error:', e.message); }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('NOX B v5 พร้อมที่พอร์ต ' + PORT));
