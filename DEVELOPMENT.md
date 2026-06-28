# 🛠️ Developer Guide - คู่มือการพัฒนา

## เริ่มต้นพัฒนา

### Requirements
- **Cursor IDE** (หรือ VS Code)
- **Chrome/Edge** (แนะนำสำหรับ Thai TTS voice)
- **Local Server** - `npx serve` หรือ Live Server extension
- **Basic JavaScript** - ES6+, classes, async/await, ES modules
- **Kaboom.js Knowledge** - อ่าน https://kaboomjs.com/doc

### Setup
```bash
# ในโฟลเดอร์ math-kids-game
npx serve .
# เปิด http://localhost:3000 (หรือพอร์ตที่ serve ระบุ)
```

หมายเหตุ: ถ้าใช้ PowerShell บน Windows อย่าใช้ `&&` ในการ chain command ใช้ `;` หรือ Set-Location แยกบรรทัด และถ้าไม่มี `python` ใน PATH ให้ใช้ `npx serve` แทน

## Debugging

### Console Log
เกมจะ log ทุก action สำคัญ:
```
Math Kids Game Ready!
GameEngine initialized
Canvas pointer handler attached
click at: 628 313 items: 0 areas: 2
>>> HIT BUTTON - calling area.action
Game started
```

### DevTools Tips
- **Elements**: ดู `#game-ui-overlay` (มี `<div>` ข้อความไทย)
- **Console**: ดู log, errors
- **Sources**: ตั้ง breakpoints ใน `game-engine.js`
- **Performance**: ดู frame rate (ควร ~60fps)
- **Application → Local Storage**: ดู `mathKidsHighScore`, `mathKidsMuted`, `mathKidsTutorial`, quest data

### Hot Reload
ถ้าใช้ Live Server: แค่ save file → auto reload
ถ้าใช้ `npx serve`: ต้อง F5 manually

## Architecture Patterns

### 1. Scene Pattern
Kaboom ใช้ scene-based architecture:
```javascript
k.scene('scene-name', () => {
    // init code - runs เมื่อ go('scene-name')
});

k.go('scene-name');  // switch scene
```

**ข้อควรระวัง:** ทุกครั้งที่สลับ scene ต้อง `_clearAll()` objects จาก scene ก่อนหน้า (Kaboom auto-clear ไม่ได้รวม DOM overlay)

### 2. Entity Component (Falling Items)
ใช้ plain objects (ไม่ใช่ Kaboom ECS):
```javascript
const fallItem = {
    rectObj: KaboomObject,   // visual (rect)
    textObj: KaboomObject,   // label (text — ASCII เท่านั้น)
    x, y, w, h,              // position/size
    vy, bounce,              // physics
    isCorrect,               // game logic
    actionFn: () => {...},   // click handler
};
```

### 3. Event-Driven
- **DOM Events**: pointerdown / click (manual hit test)
- **Kaboom Events**: `k.onUpdate()` (game loop)
- **Timeouts**: `_nextQuestionAfterAnswer()`, tutorial auto-close

### 4. DOM Overlay Pattern (สำหรับข้อความไทย)
```javascript
const txt = this._addText('ข้อความไทย', x, y, size, [r,g,b]);
// → ตรวจ non-ASCII → เรียก _addDomText() → สร้าง <div> ใน #game-ui-overlay
// txt.text = '...'  // setter อัปเดต textContent
// txt.destroy()     // เรียก el.remove()
```

## Code Style

### Naming
- `camelCase` สำหรับ variables, functions
- `PascalCase` สำหรับ classes
- `_prefix` สำหรับ private methods
- `ALL_CAPS` สำหรับ constants (if any)

### Comments
ใช้ภาษาไทยสำหรับ comments (โปรเจคเป็นภาษาไทย)

### File Organization
- 1 class per file (ส่วนใหญ่)
- Utils อยู่ `js/utils/`
- Games ต่างๆ อยู่ `js/games/`
- Modules อยู่ `js/modules/`
- Engine core อยู่ `js/engine/`

## Testing Checklist

### ก่อน Commit
- [ ] เกม start ได้จากเมนู (no console errors)
- [ ] คลิก START GAME → เข้าหน้าเกม
- [ ] โจทย์แสดงผลด้านบน
- [ ] Falling items ตก + มีเลข
- [ ] คลิกถูก → particle + เสียง + score++
- [ ] คลิกผิด → shake + เสียง + lives-- + แสดงคำตอบที่ถูก
- [ ] Lives = 0 → Game Over
- [ ] BACK button → เมนู
- [ ] Settings → เลือก difficulty ได้
- [ ] Boss level ทุก 10 ข้อ
- [ ] Pause (ปุ่ม + P/Esc) ทำงาน
- [ ] Mute toggle บันทึกใน localStorage
- [ ] Tutorial แสดงครั้งแรกเล่น
- [ ] Progress indicator อัปเดต
- [ ] Leaderboard แสดงผล + ข้อความ cloud/local ถูกต้อง
- [ ] Mobile responsive — items + fonts ใหญ่พอ มองเห็นชัด
- [ ] Circle + rect items หมุน + sync ตำแหน่งถูกต้อง
- [ ] ข้อความไทยแสดงถูกต้อง (ไม่มี IndexSizeError)
- [ ] คลิกปุ่ม "เล่นอีกครั้ง" → เริ่มเกมใหม่

### Performance
- [ ] frame rate คงที่ ~60fps
- [ ] ไม่มี memory leak (objects ถูก destroy รวม DOM elements)
- [ ] ไม่มี console errors

## Common Tasks

### เพิ่มข้อความไทยใหม่
```javascript
// _addText จะ detect non-ASCII แล้วใช้ DOM overlay อัตโนมัติ
this._addText('ข้อความใหม่', x, y, size, [r, g, b]);
```

อย่าใช้ `k.text('ภาษาไทย', ...)` ตรงๆ — จะทำให้ `IndexSizeError`

### เพิ่มสีใหม่
แก้ `config/game-config.json`:
```json
"colors": {
    "newColor": "#FF5722",
    ...
}
```
แล้วใช้ใน `_addRect(x, y, w, h, [R, G, B])`:
```javascript
const [r, g, b] = hexToRgb('#FF5722');
this._addRect(x, y, w, h, [r, g, b]);
```

### เพิ่มเสียงใหม่
ใน `SoundEngine`:
```javascript
newSound() {
    this.playTone(440, 0.2, 'sine');  // A4 note
}
```
เรียกใช้: `this.sound.newSound()`

### เพิ่ม Particle Effect
```javascript
this._spawnParticles(
    item.x + item.w / 2,
    item.y + item.h / 2,
    [255, 200, 0]  // yellow
);
```

### เพิ่ม Achievement
ใน `js/modules/quest-system.js`:
```javascript
this.achievements.push({
    id: 'combo-50',
    name: 'Combo Master',
    desc: 'ตอบถูก 50 ครั้งติด',
    check: (stats) => stats.combo >= 50,
});
```

### เพิ่ม Screen Shake
```javascript
const origPos = this.k.camPos();
let shakeCount = 10;
const iv = setInterval(() => {
    this.k.camPos(
        origPos.x + (Math.random() - 0.5) * 20,
        origPos.y + (Math.random() - 0.5) * 20
    );
    shakeCount--;
    if (shakeCount <= 0) {
        clearInterval(iv);
        this.k.camPos(origPos);
    }
}, 16);
```

## Build & Deploy

### Production Build
ปัจจุบันไม่มี build step (pure ES modules + CDN)

### Deploy
- Github Pages (static hosting)
- Netlify / Vercel
- หรือ static hosting ใดๆ

### Supabase Setup (Leaderboard)
1. สร้าง project ที่ https://supabase.com
2. Run `supabase-migration.sql` ใน SQL Editor
3. คัดลอก `Project URL` + `anon public` key จาก Project Settings → API
4. ใส่ใน `config/game-config.json` → `leaderboard.supabaseUrl` + `leaderboard.supabaseAnonKey`
5. Leaderboard จะ sync อัตโนมัติ (fallback ไป localStorage ถ้าเชื่อมต่อไม่ได้)

### PWA (ถ้าต้องการ)
เพิ่ม `manifest.json` + service worker

## Troubleshooting

### เกมไม่ขึ้นเลย
**อาการ:** หน้าขาว
**แก้:** เปิด console → ดู error → มักเป็น `text is not defined` หรือ path ผิด
**สาเหตุ:** ES module + globals: true ไม่ทำงานในบาส browser หรือ serve ไม่ผ่าน http
**วิธีแก้:** รันผ่าน local server, ใช้ wrapper methods (`_addText`, `_addRect`)

### IndexSizeError: getImageData source width is 0
**อาการ:** หน้าขาว / ข้อความไทยไม่ขึ้น
**สาเหตุ:** มีการเรียก `k.text('ข้อความไทย', ...)` ตรงๆ แทนที่จะผ่าน `_addText`
**วิธีแก้:** ใช้ `_addText()` เสมอ (จะ detect non-ASCII แล้วใช้ DOM overlay)

### คลิกไม่ได้
**อาการ:** คลิกแล้วไม่มีอะไร
**แก้:** ดู console → มี log `click at: X Y` ไหม?
**สาเหตุ:** DOM event ไม่ติด canvas หรือ `pointer-events: none` บน overlay ปิดอยู่
**วิธีแก้:** เช็ค `canvas.addEventListener('pointerdown', ...)` และ CSS ของ overlay

### Falling items ไม่ตก
**อาการ:** โจทย์ขึ้น แต่ไม่มีอะไรตก
**แก้:** ดู console → มี error `item.obj.destroy is not a function` ไหม?
**สาเหตุ:** `_clearAll()` พัง
**วิธีแก้:** เช็ค `_clearAll()` ว่าวน fallingItems + gameObjects ถูกต้อง

### เสียงไม่ดัง
**อาการ:** ไม่มีเสียงเลย
**แก้:** คลิกก่อน → AudioContext ต้อง user gesture
**สาเหตุ:** Browser policy
**วิธีแก้:** คลิกครั้งแรกจะ unlock; เช็คปุ่ม MUTE/SND

### Thai voice ไม่ทำงาน
**อาการ:** พูดภาษาอังกฤษ
**แก้:** Windows Settings → Speech → เพิ่ม Thai
**วิธีแก้ Alternative:** ใช้ Chrome (มี Thai voice ในตัว)

### ข้อความไทยไม่ขยับตาม falling item
**อาการ:** ตัวเลขตก แต่ไม่มี label
**สาเหตุ:** falling item text ใช้ Kaboom text (ASCII) อยู่แล้ว — ไม่น่ามีปัญหา
**วิธีแก้:** เช็ค `_gameUpdate()` ว่า `item.textObj.pos` ถูก sync ทุกเฟรม

### Leaderboard แสดง ERROR (ERR_NAME_NOT_RESOLVED)
**อาการ:** console แสดง `POST .../rest/v1/leaderboard net::ERR_NAME_NOT_RESOLVED`
**สาเหตุ:** Supabase project ถูกลบหรือ URL ผิด
**วิธีแก้:** ไม่ต้องแก้ — เกม fallback ไป localStorage อัตโนมัติ Leaderboard ยังทำงานได้แบบ local
  ถ้าอยากใช้ cloud: สร้าง Supabase project ใหม่ → run `supabase-migration.sql` → อัปเดต config

## Resources

### Kaboom.js
- Docs: https://kaboomjs.com/doc
- Examples: https://kaboomjs.com/play
- GitHub: https://github.com/replit/kaboom

### Kanit Font
- Google Fonts: https://fonts.google.com/specimen/Kanit

### Web Audio API
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Tutorial: https://web.dev/audio/

### SpeechSynthesis
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- Voices: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices

### Supabase (Multiplayer — future)
- Docs: https://supabase.com/docs
- Realtime: https://supabase.com/docs/guides/realtime
