# 🎮 Math Kids Game - เกมคณิตศาสตร์สำหรับเด็ก

เกมการศึกษาสำหรับเด็กระดับประถมศึกษา ใช้รูปแบบตอบคำถามพร้อมฟิสิกส์ Falling Items

## 📖 สารบัญ
- [ภาพรวมโปรเจค](#ภาพรวมโปรเจค)
- [โครงสร้างโฟลเดอร์](#โครงสร้างโฟลเดอร์)
- [การติดตั้งและใช้งาน](#การติดตั้งและใช้งาน)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [สถาปัตยกรรม](#สถาปัตยกรรม)
- [การพัฒนาต่อ](#การพัฒนาต่อ)

## ภาพรวมโปรเจค

**Math Kids Game** เป็นเกมแนวการศึกษาสำหรับเด็กประถมศึกษา เน้นการเรียนรู้คณิตศาสตร์พื้นฐานผ่านการเล่น (Gamification)

### เทคโนโลยี
- **HTML5 Canvas** + **Kaboom.js v3000.0.1** - กราฟิกส์และ Game Loop
- **Vanilla JavaScript (ES modules)** - Logic ทั้งหมด (no framework)
- **Web Audio API** - เสียง SFX แบบ procedural
- **SpeechSynthesis** - เสียงอ่านโจทย์ภาษาไทย
- **HTML overlay** - แสดงข้อความไทย (Kaboom canvas วัด glyph ไทยไม่ได้)
- **Supabase (placeholder)** - Multiplayer 2 คน (ยังไม่ implement)

## โครงสร้างโฟลเดอร์

```
math-kids-game/
├── index.html              # Entry point + overlay div สำหรับข้อความไทย
├── css/
│   └── style.css           # Reset, canvas, overlay styling
├── config/
│   └── game-config.json    # ค่าตั้งค่า v1.1.0: ความยาก, เสียง, สี, controls
├── js/
│   ├── main.js             # โหลด Kaboom + Font (Kanit) + bg + GameEngine
│   ├── engine/
│   │   ├── game-engine.js  # Core ~860 บรรทัด: scenes, loop, DOM click, SoundEngine
│   │   ├── question-engine.js  # Abstract Base Class สำหรับเกมถามตอบ
│   │   └── network.js      # Supabase multiplayer placeholder
│   ├── modules/
│   │   ├── ui-manager.js   # คะแนน, ชีวิต, combo, high score, mute, tutorial state
│   │   └── quest-system.js # Achievement tracker + แสดง banner
│   ├── games/
│   │   ├── math-game.js    # MathGame extends QuestionEngine
│   │   └── word-game.js    # WordGame extends QuestionEngine
│   └── utils/
│       └── helpers.js      # generateOptions, shuffle, Timer, lerp, formatTime
└── assets/
    ├── bg.png              # ภาพพื้นหลัง (~2MB)
    └── fonts/
        └── Kanit-Regular.ttf  # ฟอนต์ไทย (Google Fonts)
```

## การติดตั้งและใช้งาน

### สิ่งที่ต้องมี
1. **Browser** - Chrome หรือ Edge (แนะนำเพื่อ Thai Voice)
2. **Local Server** - จำเป็นเพราะใช้ `fetch('config/...')` + ES modules

### เริ่มเกม
```bash
# เข้าโฟลเดอร์ math-kids-game
cd math-kids-game

# รันเซิร์ฟเวอร์ (เลือกอย่างเดียว)
npx serve .              # แนะนำ (ไม่ต้องติดตั้งถาวร)
# หรือ
npm install -g serve && serve .
# หรือ
python -m http.server 8765   # ถ้าติดตั้ง Python ไว้

# เปิด http://localhost:3000 (หรือพอร์ตที่ระบุ)
```

### สำหรับ Cursor IDE
- เปิดโฟลเดอร์ `math-kids-game` ใน Cursor
- กด **F5** หรือใช้ Live Server extension
- เปิด DevTools (F12) เพื่อดู console log

## ฟีเจอร์หลัก

### 1. หน้าเมนู
- **START GAME** - เริ่มเกม
- **SETTINGS** - ตั้งค่าความยาก 1-3
- ปุ่ม **MUTE/SND** - เปิด/ปิดเสียง (persist ใน localStorage)
- แสดง High Score จาก localStorage

### 2. หน้าเล่นเกม
**Layout:**
- ด้านบน: โจทย์ (เช่น "5 + 3 = ?")
- ตรงกลาง: ตัวเลือก 6 ตัว ตกลงมาจากฟ้า (Falling Items)
- มุมซ้ายบน: BACK button
- มุมซ้าย: Score, มุมขวา: Lives, กลางบน: Combo, ล่าง: Progress
- ปุ่ม **PAUSE** (มุมขวาบน) และ **MUTE/SND** (มุมซ้ายล่าง)

**Gameplay:**
- ตอบถูก: +10 คะแนน, Combo xN, particle ระเบิด, เสียง "ถูกต้อง!"
- ตอบผิด: -1 ชีวิต, ปุ่มสั่น, แสดงคำตอบที่ถูก (เขียว ~1.5 วิ), เสียง "ผิด!"
- Combo > 1: โบนัส +2 ต่อ combo
- Level Up: ทุก 50 คะแนน

**UX พิเศษ:**
- **Pause/Resume** - ปุ่มหรือกด `P`/`Esc`, มี overlay
- **Tutorial overlay** - แสดงครั้งแรกเล่น (localStorage)
- **Progress indicator** - "ข้อที่ X / 10"
- **Touch/Pointer support** - รองรับมือถือ, falling items เล็กลงบนจอแคบ
- **Restart** จาก Game Over ("เล่นอีกครั้ง")

### 3. Boss Level (ทุก 10 ข้อ)
สุ่มระหว่าง:
- **Speed Rush** - โจทย์ออกเร็วมาก (ทุก ~1 วินาที)
- **Multi-Target** - 2 โจทย์พร้อมกัน ซ้าย/ขวา ของจอ

### 4. Difficulty Levels

| Level | Max Number | Operations | Interval | Fall Speed |
|-------|-----------|-----------|----------|-----------|
| 1 (ง่าย) | 10 | + | 3000ms | ช้า |
| 2 (กลาง) | 20 | + - | 2500ms | ปกติ |
| 3 (ยาก) | 50 | + - * | 2000ms | เร็ว |

### 5. ระบบเสียง
- **Web Audio API** - เสียง SFX procedural (ไม่ต้องไฟล์ mp3)
- **SpeechSynthesis** - อ่านโจทย์ + "ถูกต้อง!/ผิด!" เป็นภาษาไทย
  - Fallback: English ถ้าไม่มี Thai voice
- คลิกครั้งแรกจะ unlock AudioContext (browser policy)
- **Mute toggle** บันทึกใน localStorage

### 6. Quest / Achievement System
- `QuestSystem` ใน `js/modules/quest-system.js` ติดตามความสำเร็จ (combo, score, level, ตอบรวด)
- แสดง banner ตอนปลดล็อก (`_showAchievementBanner`)

### 7. พื้นหลัง + ฟอนต์
- `assets/bg.png` - โหลดด้วย `k.loadSprite('bg')` ใน `main.js`
- `assets/fonts/Kanit-Regular.ttf` - โหลดด้วย `k.loadFont('kanit', ...)`
- รอ `k.onLoad()` ก่อนเริ่ม game scenes (`waitKaboomLoad`)

### 8. Multiplayer (placeholder)
ดูไฟล์ `js/engine/network.js` - มีโครงสร้าง Supabase แต่ยังไม่ implement จริง

## สถาปัตยกรรม

### Core Pattern: GameEngine + Scene System
```
main.js
  ├─ imports Kaboom.js v3000.0.1
  ├─ loadFont('kanit'), loadSprite('bg')
  ├─ await waitKaboomLoad(k)
  ├─ new GameEngine()
  ├─ setConfig(config), markAssetsReady()
  └─ initContext(kaboomInstance)
       ├─ k.scene('main-menu', ...)
       ├─ k.scene('game', ...)
       ├─ k.scene('settings', ...)
       ├─ k.scene('game-over', ...)
       └─ k.go('main-menu')
```

### การแสดงข้อความ (สำคัญ)
Kaboom วัด glyph ไทยบน canvas ไม่ได้ (`measureText` คืน width = 0 → `getImageData` พัง) ระบบจึงแยก:

- **ASCII text** (Score, MATH, START, etc.) → `k.add(k.text(...))` ปกติ
- **Non-ASCII text (ไทย)** → `_addDomText()` สร้าง `<div>` ใน `#game-ui-overlay` ที่อยู่เหนือ canvas (`z-index: 2`)

`_addText()` ตรวจ non-ASCII อัตโนมัติแล้วเลือก DOM หรือ Kaboom ตามความเหมาะสม

### วิธีที่เกมจัดการ Click
ใช้ **DOM click event** (ไม่ใช้ Kaboom mouse API เพราะ ES module ไม่เห็น global functions)

```javascript
// ใน _onCanvasPointer()
// 1. แปลง screen coordinates → game coordinates
const clickX = ((e.clientX - rc.left) / rc.width) * gameW;
const clickY = ((e.clientY - rc.top) / rc.height) * gameH;

// 2. เช็ค falling items (ใช้ pos จริงที่ sync ทุกเฟรม)
// 3. เช็ค static clickable areas
```

### Falling Items System
- สร้าง `rect` + `text` แยกกัน (หลีกเลี่ยง duplicate width bug)
- เก็บข้อมูล: `{ rectObj, textObj, x, y, vy, isCorrect, actionFn, ... }`
- `_gameUpdate()` sync pos ทุกเฟรม
- DOM click หัก box จาก pos จริงของ rectObj

### Sound Engine
อยู่ใน `GameEngine` class เป็น `this.sound` (SoundEngine)
- `correct()` - C5-E5-G5 chord
- `wrong()` - low sawtooth
- `click()` - square wave
- `gameOver()` - descending notes
- `speak(text)` - SpeechSynthesis lang='th-TH'

## ปัญหาที่พบบ่อยและวิธีแก้

### IndexSizeError: getImageData source width is 0
**สาเหตุ:** Kaboom `formatText` เรียก `measureText(ch)` สำหรับ glyph ไทย แล้วได้ width = 0 → `getImageData(0,0,0,h)` พัง

**วิธีแก้:** ข้อความที่มี non-ASCII จะถูกส่งไป `_addDomText()` (HTML overlay) แทน Kaboom text โดยอัตโนมัติ

### kaboom.ts: Duplicate component property: "width"
**สาเหตุ:** ใช้ `rect()` + `text()` ใน `add()` array เดียวกัน

**วิธีแก้:** แยกเป็น 2 objects:
```javascript
const rect = this._addRect(x, y, w, h, color);
const text = this._addText('...', x+w/2, y+h/2, size, color);
```

### Kaboom functions not defined (text, add, scene...)
**สาเหตุ:** ES modules ไม่เห็น global variables แม้ใช้ `globals: true`

**วิธีแก้:** เรียกผ่าน `this.k.text(...)`, `this.k.add(...)` หรือใช้ wrapper methods

### ข้อความไม่อยู่ตรงกลางปุ่ม
**สาเหตุ:** text object ไม่ sync ตาม rect ที่ตก

**วิธีแก้:** ใน `_gameUpdate()`:
```javascript
item.textObj.pos.x = item.x + item.w / 2;
item.textObj.pos.y = item.y + item.h / 2 + 2;
```

### เสียงพูดเป็นภาษาอังกฤษแทนภาษาไทย
**สาเหตุ:** Windows ไม่มี Thai TTS voice

**วิธีแก้:** Settings → Time & Language → Speech → เพิ่ม Thai voice
หรือใช้ Chrome/Edge ที่มาพร้อม Thai voice

## การพัฒนาต่อ

### งานที่ค้างอยู่
1. **ไฟล์เสียงจริง** - แทนที่ procedural SFX ด้วย mp3 (มี config path แล้วใน `audio.sounds`)
2. **Multiplayer จริง** - Implement Supabase ใน `network.js`
3. **WordGame ในเมนู** - ปัจจุบัน math-game เป็น default, WordGame ยังไม่ได้เชื่อมปุ่มเลือก
4. **Player character / Power-ups** - ยังไม่มี

### เพิ่มเกมใหม่
สร้างไฟล์ใน `js/games/` extend `QuestionEngine`:
```javascript
import { QuestionEngine } from '../engine/question-engine.js';

export class NewGame extends QuestionEngine {
    constructor(difficulty) {
        super(difficulty);
        this.type = 'newgame';
    }
    getNextChallenge() {
        return { text: '...', answer: '...', options: [...] };
    }
    checkAnswer(selected) {
        return selected === this.currentChallenge.answer;
    }
}
```

แล้ว register ใน GameEngine ตอน `startGame()` (ปัจจุบัน hard-coded เป็น MathGame)

### เพิ่ม Difficulty Level
แก้ `config/game-config.json`:
```json
"difficulty": {
    "levels": [
        { "maxNumber": 100, "operations": ["+", "-", "*", "/"], "spawnInterval": 1500 }
    ]
}
```

## Credits
- **Kaboom.js** - https://kaboomjs.com/
- **Kanit font** - https://fonts.google.com/specimen/Kanit (Google Fonts, OFL)
- **Game Design** - สำหรับเด็กประถมศึกษา
- **Language** - เสียงอ่านภาษาไทย (SpeechSynthesis)
