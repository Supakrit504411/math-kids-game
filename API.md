# 📚 API Reference - Classes & Functions

## GameEngine

### Constructor
```javascript
new GameEngine()
```
**Parameters:** ไม่มี
**Returns:** GameEngine instance
**Side effects:** สร้าง sub-objects (UIManager, SoundEngine, QuestSystem)

### setConfig(config)
ตั้งค่า config จาก `game-config.json`

**Parameters:**
- `config` - object จาก fetch `config/game-config.json`

**Returns:** `void`

### markAssetsReady()
แจ้งว่า font + bg โหลดเสร็จ (เรียกจาก main.js หลัง `k.onLoad`)

**Returns:** `void`

### initContext(k)
ตั้งค่า Kaboom instance + ติด pointer handler + เริ่ม scenes

**Parameters:**
- `k` - Kaboom instance (จาก `kaboom()`)

**Returns:** `void`

**Example:**
```javascript
const k = kaboom({ width: 1280, height: 720, globals: true, font: 'kanit' });
gameEngine.setConfig(config);
gameEngine.markAssetsReady();
gameEngine.initContext(k);
```

### _onCanvasPointer(e)
DOM pointer event handler (click + touch + pointer)

**Parameters:**
- `e` - PointerEvent / MouseEvent

**Returns:** `void`

**Calls:**
- `item.actionFn()` ถ้า hit falling item
- `area.action()` ถ้า hit static button
- pause overlay buttons ถ้ากำลัง pause

### _addText(str, x, y, size, colorVal)
สร้าง text object + เก็บใน gameObjects

**พฤติกรรม:**
- ถ้า `str` มี non-ASCII (ไทย) → เรียก `_addDomText()` (HTML overlay)
- ถ้า ASCII เท่านั้น → ใช้ Kaboom `k.text()`

**Parameters:**
- `str` - ข้อความ (string)
- `x`, `y` - ตำแหน่ง (number)
- `size` - ขนาด font (number, default 32)
- `colorVal` - สี RGB array `[R, G, B]` (optional)

**Returns:** wrapper object (Kaboom text object หรือ DOM wrapper)

**DOM wrapper interface:**
```javascript
{
    isDom: true,
    _el: HTMLElement,
    text: string,    // getter/setter ผ่าน textContent
    destroy(): void  // เรียก el.remove()
}
```

**Example:**
```javascript
this._addText('Score: 0', 100, 200, 40, [255, 0, 0]);   // Kaboom
this._addText('ข้อที่ 1 / 10', 640, 700, 20, [255, 255, 255]);  // DOM overlay
```

### _addDomText(str, x, y, size, colorVal)
สร้างข้อความไทยบน HTML overlay (ใช้เมื่อมี non-ASCII)

**Parameters:** เหมือน `_addText`
**Returns:** DOM wrapper (ดูข้างบน)

### _addRect(x, y, w, h, colorVal, radius)
สร้าง rectangle object + เก็บใน gameObjects

**Parameters:**
- `x`, `y` - ตำแหน่ง (number)
- `w`, `h` - ขนาด (number)
- `colorVal` - สี RGB array `[R, G, B]` หรือ `[R, G, B, A]` (optional)
- `radius` - border radius (number, optional)

**Returns:** Kaboom rect object

### _addBackground()
เพิ่มภาพพื้นหลัง + overlay มืด (เรียกในทุก scene ถ้า `_bgLoaded`)

**Returns:** Kaboom sprite object

### _clearAll()
Destroy ทั้ง gameObjects (Kaboom + DOM) + fallingItems

**Returns:** `void`

### _clearClickables()
Reset `clickableAreas` array

### _togglePause()
สลับ pause state + แสดง/ซ่อน pause overlay

### _drawMainMenu()
วาดหน้าเมนู

**Creates:**
- MATH KIDS title
- START GAME button
- SETTINGS button
- MUTE/SND button
- High score text
- Background

### _drawGameScene()
วาดหน้าเล่นเกม

**Creates:**
- Score/Lives/Combo/Progress HUD
- BACK button
- PAUSE button
- MUTE/SND button
- Background
- แสดง tutorial ถ้า first play
- เรียก `_spawnQuestion()` หลังจาก 1 วินาที

### _spawnQuestion()
สร้างโจทย์ใหม่ (ผ่าน `mathGame.generateQuestion()`)

**Logic:**
- นับ `questionCount++`
- ถ้า `questionCount % 10 === 0`: boss level
- ถ้าไม่: normal question

### _createSingleQuestion(isBoss)
สร้างโจทย์เดียว + falling items

**Parameters:**
- `isBoss` - boolean (ทำให้ fall เร็วขึ้น)

### _createMultiQuestion()
สร้าง 2 โจทย์พร้อมกัน (boss multi-target)

### _spawnFallingItems(options, correctAnswer, side)
สร้าง falling items จาก options

**Parameters:**
- `options` - array of numbers/strings
- `correctAnswer` - คำตอบที่ถูกต้อง
- `side` - 0=ซ้าย, 1=ขวา, undefined=เต็มจอ (optional)

### _onItemClick(item)
จัดการเมื่อคลิก item

**Logic:**
- ถ้า `item.isCorrect`:
  - +score, +combo
  - play SFX, spawn particles, flash green
  - แจ้ง QuestSystem (combo/score/streak)
  - spawn next question
- ถ้า `!item.isCorrect`:
  - -life, reset combo
  - play SFX, shake item
  - แสดงคำตอบที่ถูก (เขียว ~1.5 วิ)
  - ถ้า lives=0: game over

### _spawnParticles(x, y, colorVal)
สร้าง particle explosion effect

### _flashMsg(msg, dur)
แสดงข้อความชั่วคราวกลางจอ (เช่น "BOSS LEVEL!", "Get Ready!")

### _showAchievementBanner(achievement)
แสดง banner ความสำเร็จ (เรียกโดย QuestSystem callback)

### _gameUpdate()
Game loop - ทำงานทุกเฟรมผ่าน `k.onUpdate()`

**Does:**
- ถ้า paused/!gameRunning: return
- Update falling items (gravity, bounce, sync pos)
- Check if all items gone → spawn next
- Update HUD

### _drawSettings()
วาดหน้า settings (เลือก difficulty, เปิด/ปิดเสียง)

### _drawGameOverScene()
วาดหน้า game over + ปุ่ม "เล่นอีกครั้ง" และ "MENU"

### startGame(difficulty)
เริ่มเกม

**Parameters:**
- `difficulty` - 1, 2, หรือ 3

---

## QuestionEngine (Abstract)

### constructor(difficultyLevel)
```javascript
new QuestionEngine(difficultyLevel)
```

**Parameters:**
- `difficultyLevel` - 1, 2, หรือ 3

### getNextChallenge() ⭐ Abstract
ต้อง override ใน subclass

**Returns:** Challenge object `{ text, answer, options }`

### checkAnswer(selectedOption) ⭐ Abstract
ต้อง override ใน subclass

**Returns:** boolean

### generateQuestion()
สร้างโจทย์ใหม่ (template method)

**Returns:** Challenge object

### validateAnswer(selected)
เช็คคำตอบ + อัปเดตสถิติ

**Returns:** boolean

### getAccuracy()
**Returns:** number (0-100)

---

## MathGame (extends QuestionEngine)

### constructor(difficultyLevel)
สร้าง MathGame instance ตามระดับความยาก

### getNextChallenge()
สุ่ม operation + operands ตาม difficulty

**Returns:** `{ text: '5 + 3 = ?', answer: 8, options: [8, 7, 9, 6, 10, 5] }`

### checkAnswer(selected)
**Returns:** `selected === this.currentChallenge.answer`

---

## WordGame (extends QuestionEngine)

### constructor(difficultyLevel)

### getNextChallenge()
**Returns:** `{ text: 'cat', answer: 'แมว', options: [...] }`

**หมายเหตุ:** ยังไม่ได้เชื่อมปุ่มเลือกในเมนู

---

## UIManager

### constructor()
```javascript
new UIManager()
```
โหลด state จาก localStorage (highScore, muted, tutorialShown)

### reset()
รีเซ็ต score/lives/level/combo (ไม่ reset muted/tutorial)

### onCorrect(points)
ตอบถูก → +score, +combo, +life(ถ้า combo>2)

### onWrong()
ตอบผิด → combo=0, lives--, save high score

### Getters
- `getScore()`, `getLives()`, `getCombo()`, `getLevel()`, `getMaxCombo()`
- `getHighScore()`
- `isMuted()`, `toggleMute()`
- `shouldShowTutorial()`, `markTutorialShown()`

---

## SoundEngine

### constructor()
```javascript
new SoundEngine()
```

### correct()
เล่นเสียงตอบถูก (C-E-G arpeggio)

### wrong()
เล่นเสียงตอบผิด (low sawtooth)

### click()
เล่นเสียงคลิก (square wave)

### levelUp()
เล่นเสียง level up (4-note arpeggio)

### gameOver()
เล่นเสียง game over (descending)

### speak(text)
อ่านข้อความเป็นภาษาไทย (fallback English)

**Parameters:**
- `text` - ข้อความที่จะอ่าน (string)

### unlock()
Unlock AudioContext (เรียกตอน user gesture)

---

## QuestSystem

### constructor()
โหลด achievements + unlocked state จาก localStorage

### notify(event, payload)
แจ้งเหตุการณ์ (เช่น `combo`, `score`, `level`, `streak`)

**Parameters:**
- `event` - string ('combo', 'score', 'level', 'streak')
- `payload` - number หรือ object

**Triggers:** callback ที่ลงทะเบียนไว้ (เช่น `_showAchievementBanner`) ถ้า unlock ใหม่

### onUnlock(callback)
ลงทะเบียน callback สำหรับ achievement unlock

---

## Helpers

### generateOptions(correct, count, range)
สร้างตัวเลือกคำตอบ (จำนวนเต็ม) สุ่มจาก correct ± range, shuffle

**Returns:** Array of numbers

### getRandomInt(min, max)
**Returns:** number

### randomFrom(arr)
**Returns:** random element

### shuffleArray(arr)
Fisher-Yates shuffle

**Returns:** shuffled array

### splitWord(word)
สำหรับ word game

### Timer class
```javascript
const timer = new Timer();
timer.start();
timer.pause();
timer.resume();
timer.reset();
timer.getSeconds();
```

### debounce(func, wait)

### formatTime(seconds)

### lerp(start, end, t)

---

## NetworkManager (Placeholder — ไม่ได้ใช้ตอนนี้)

### constructor()
```javascript
new NetworkManager()
```

### initialize(config)
ตั้งค่า Supabase (ยังไม่ได้ implement)

### createRoom() / joinRoom(roomId)
Stub

### broadcastChallenge(challenge) / broadcastScore(score)
Stub

### on(event, callback)
Subscribe event

---

## Data Structures

### FallingItem
```javascript
{
    rectObj: KaboomObject,    // rectangle (ASCII text ใช้ Kaboom)
    textObj: KaboomObject,    // label
    x: number,                // x position (คงที่)
    y: number,                // y position (เปลี่ยนตาม gravity)
    w: number, h: number,
    value: number,            // ค่าของตัวเลข
    isCorrect: boolean,
    vy: number, bounce: number,
    alive: boolean, clicked: boolean,
    side: number,             // -1=full, 0=left, 1=right
    actionFn: Function,
}
```

### Challenge
```javascript
{
    text: string,             // "5 + 3 = ?" หรือ "cat"
    answer: number|string,    // 8 หรือ 'แมว'
    options: Array,            // [8, 7, 9, 6, 10, 5]
}
```

### ClickableArea
```javascript
{
    x, y: number, w, h: number,
    action: Function,
    _keep: boolean,           // ไม่ลบตอนเปลี่ยน scene (optional)
}
```

### Achievement
```javascript
{
    id: string,               // 'combo-5'
    name: string,             // 'Combo Starter'
    desc: string,             // 'ตอบถูก 5 ครั้งติด'
    check: (stats) => boolean,
    unlocked: boolean,
}
```

---

## Constants

### Default Colors (`game-config.json`)
```json
{
    "background": "#667eea",
    "primary": "#FF6B6B",
    "secondary": "#4ECDC4",
    "accent": "#FFE66D",
    "success": "#6BCB77",
    "danger": "#FF6B6B",
    "info": "#4D96FF"
}
```

### Physics (hard-coded)
```javascript
{
    gravity: 0.15,
    bounce: 0.55,
    fallSpeed: 1,
}
```

### Layout (responsive ปรับตามขนาดจอ)
```javascript
{
    itemWidth: 110,   // ลดเหลือ 75 บนจอแคบ
    itemHeight: 60,
    itemGap: 25,
    floor: height - 30,
}
```

---

## Events

### Kaboom Events
- `k.onUpdate(callback)` - ทุกเฟรม
- `k.onLoad(callback)` - เมื่อ assets โหลดเสร็จ
- `k.scene('name', callback)` - define scene
- `k.go('name')` - switch scene

### DOM Events
- `canvas.addEventListener('pointerdown', handler)` - custom hit test
- `window.addEventListener('keydown', handler)` - P/Esc pause

### Sound Events
- `SoundEngine.correct()` - เมื่อตอบถูก
- `SoundEngine.wrong()` - เมื่อตอบผิด
- `SoundEngine.speak(text)` - เมื่ออ่านโจทย์

### Quest Events (ผ่าน `QuestSystem.notify`)
- `combo` - ตอบถูกพร้อม combo count
- `score` - คะแนนเปลี่ยน
- `level` - level up
- `streak` - ตอบถูกติดต่อกัน

### Network Events (Future)
- `challengeUpdated` - โจทย์เปลี่ยน
- `scoreUpdated` - คะแนนเปลี่ยน
- `roomCreated` - สร้างห้อง
- `roomJoined` - เข้าร่วมห้อง
