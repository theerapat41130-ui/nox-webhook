// NOX TOPSPEED - Webhook B มืออาชีพ
// ลูกค้าพิมพ์เลข -> LINE ยิงมาที่นี่ -> ส่ง 🙏 กลับทันที ไม่ต้องเปิดหน้าเว็บ
const express = require('express');
const crypto = require('crypto');
const app = express();

// ต้องอ่าน body แบบ raw เพื่อเช็คลายเซ็นของ LINE
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN || '';
const CHANNEL_SECRET = process.env.CHANNEL_SECRET || '';
const REPLY_TEXT = process.env.REPLY_TEXT || '🙏🙏🙏';

function isLottery(text){
  const t = (text || '').trim();
  if(!t) return false;
  // ก๊อปบัญชี 9-12 หลัก ไม่รับ
  if(/^\d{9,12}$/.test(t.replace(/\s/g,''))) return false;
  // ฝาก / ถอน / ราคา ไม่รับ
  if(/ฝาก|ถอน|ราคา|ม\.|สเปวิไล|เครดิต/.test(t) && !/ลาว|รูด|บน|ล่าง|หวย/.test(t)) return false;
  const hasSep = /[\/\-=\*\.:]/.test(t);
  const digitCount = (t.match(/\d/g) || []).length;
  const hasLotteryWord = /ลาว|รูด|บน|ล่าง|เบิ้ล|ชุด|บาท|ตัวละ|ซื้อ|แทง|หวย|ดาว|ฮานอย|รัฐบาล|ฮั้ง|นิ|สิง|พัด/.test(t);
  if(hasLotteryWord && digitCount >= 1) return true;
  if(hasSep && digitCount >= 2) return true;
  return false;
}

function verifySignature(req){
  if(!CHANNEL_SECRET) return true;
  const sig = req.headers['x-line-signature'];
  if(!sig) return false;
  const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(req.rawBody).digest('base64');
  return hash === sig;
}

app.get('/', (req, res) => {
  res.send('NOX TOPSPEED Webhook B พร้อมแล้ว');
});

app.post('/webhook', async (req, res) => {
  // เช็คก่อนว่า LINE ตัวจริงส่งมา
  if(!verifySignature(req)){
    console.log('ลายเซ็นไม่ตรง - ไม่ใช่ LINE ตัวจริง');
    return res.sendStatus(401);
  }
  const events = req.body.events || [];
  for(const ev of events){
    try{
      if(ev.type !== 'message') continue;
      if(ev.message.type === 'sticker' || ev.message.type === 'image'){
        // ถ้าอยากรับรูปด้วย ให้เปลี่ยนตรงนี้ - ตอนนี้ตั้งไว้ว่าไม่รับรูป
        console.log('เจอรูป/สติ๊กเกอร์ ข้าม');
        continue;
      }
      if(ev.message.type !== 'text') continue;
      const text = ev.message.text || '';
      console.log('ได้รับ:', text);
      if(!isLottery(text)){
        console.log('ไม่ใช่เลขหวย ข้าม:', text);
        continue;
      }
      // ส่ง 🙏 กลับทันที ใช้ Reply Token ไม่ต้องคลิก
      const r = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          replyToken: ev.replyToken,
          messages: [{ type: 'text', text: REPLY_TEXT }]
        })
      });
      console.log('ส่งแล้ว:', text, 'status:', r.status);
    }catch(e){
      console.log('error:', e.message);
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('NOX B พร้อมที่พอร์ต ' + PORT));
