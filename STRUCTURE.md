# 📐 โครงสร้าง Codebase - รายละเอียดเชิงลึก

เอกสารนี้สำหรับนักพัฒนาที่ต้องการทำความเข้าใจสถาปัตยกรรมภายใน

## 0. Dependency Graph

```
index.html
  └─ <script type="module" src="js/main.js">
         ├─ import { GameEngine } from './engine/game-engine.js'
         └─ kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs')

js/main.js
  ├─ loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf')
  ├─ loadSprite('bg', 'assets/bg.png')
  ├─ await waitKaboomLoad(k)
  └─ window.gameEngine = new GameEngine()
       ├─ gameEngine.setConfig(config)
       ├─ gameEngine.markAssetsReady()
       └─ gameEngine.initContext(k)

js/engine/game-engine.js
  ├─ import { UIManager }    '../modules/ui-manager.js'
  ├─ import { QuestSystem }  '../modules/quest-system.js'
  ├─ import { MathGame }     '../games/math-game.js'
  ├─ import { generateOptions } '../utils/helpers.js'
  └─ class SoundEngine (inside same file)
       ├─ Web Audio API (Oscillator, GainNode)
       └─ SpeechSynthesisUtterance (Thai voice)

js/games/math-game.js
  └─ import { QuestionEngine } '../engine/question-engine.js'

js/games/word-game.js
  └─ import { QuestionEngine } '../engine/question-engine.js'

js/engine/network.js  (placeholder — ไม่ได้ import โดย game-engine ตอนนี้)
```

## 1. Core Files

### `js/main.js` — Entry Point (~75 บรรทัด)
```javascript
async function init() {
    const kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs');
    const kaboom = kaboomModule.default;          // ← สำคัญ: .default
    const config = await loadConfig();             // ← fetch() ต้องใช้ local server

    const k = kaboom({
        width: config.display?.width || 1280,
        height: config.display?.height || 720,
        stretch: true, crisp: false,
        background: [102, 126, 234],
        globals: true,
        font: 'kanit',
    });

    k.loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf');
    k.loadSprite('bg', 'assets/bg.png');
    await waitKaboomLoad(k);                        // รอ font + bg โหลดเสร็จ

    const gameEngine = new GameEngine();
    gameEngine.setConfig(config);
    gameEngine.markAssetsReady();
    gameEngine.initContext(k);
}
```

### `js/engine/game-engine.js` — Core Engine (~860 บรรทัด)
คลาสเดียวที่ขับเคลื่อนทั้งเกม รวม `SoundEngine` class ภายในไฟล์

#### หน้าที่หลัก
1. **Scene Management** - 4 scenes (main-menu, game, settings, game-over)
2. **Game Loop** - `_gameUpdate()` ทำงานทุกเฟรมผ่าน `k.onUpdate()`
3. **Falling Items** - จัดการ gravity, collision, hit test
4. **Click Handler** - DOM event → game coordinates (รองรับ pointer + touch)
5. **Sound** - SFX + TTS
6. **UI State** - pause, tutorial, mute (ผ่าน UIManager)
7. **Quests** - แจ้งเตือนความสำเร็จ (ผ่าน QuestSystem)
8. **Background** - `_addBackground()` ในทุก scene + overlay มืด

#### Properties สำคัญ
```javascript
class GameEngine {
    this.k                    // Kaboom instance
    this.uiManager            // UIManager (score, lives, combo, mute, tutorial)
    this.sound                // SoundEngine
    this.questSystem          // QuestSystem (achievements)
    this.mathGame             // MathGame instance (สร้างใน startGame)
    this.gameRunning          // boolean - stop/update loop เมื่อ false
    this.currentDifficulty    // 1-3
    this.questionCount        // นับจำนวนโจทย์ → boss ทุก 10
    this.isBoss               // boolean - boss mode
    this.multiQuestion        // โจทย์ multi-target
    this.fallingItems[]       // array ของ falling item objects
    this.gameObjects[]        // array ของ Kaboom/DOM objects ทั้งหมดใน scene
    this.clickableAreas[]     // static buttons (menu, settings)
    this.scoreTextObj, livesTextObj, questionTextObj, comboTextObj, progressTextObj
    this.bossNotifyObj
    this.pauseOverlayObjs[]
    this._bgLoaded            // markAssetsReady() ตั้ง true
    this._showingAnswer       // กำลังแสดงคำตอบที่ถูก
}
```

#### Scene Lifecycle
```
go('scene-name')
  └─ kaboom clears scene
     └─ scene callback runs
        ├─ _clearAll()        // destroy objects จาก scene ก่อนหน้า (Kaboom + DOM)
        ├─ _clearClickables() // reset clickables
        ├─ สร้าง UI ใหม่ + bg
        └─ เริ่ม spawn question (ถ้าเป็น 'game')
```

#### DOM Click Flow
```
canvas pointer event (จาก initContext)
  └─ _onCanvasPointer(e)
       ├─ คำนวณ clickX, clickY (game coordinates)
       ├─ ถ้ากำลัง pause: ส่งไป pause overlay buttons
       ├─ วน fallingItems (หลังไปหน้า)
       │    └─ hit test → item.actionFn()
       └─ วน clickableAreas
            └─ hit test → area.action()
```

**สำคัญ:** Falling items ใช้ **pos จริง** (จาก Kaboom object ที่ sync ทุกเฟรม) ไม่ใช่ตำแหน่งตอน spawn

### ระบบข้อความ: DOM Overlay (สำคัญ!)

Kaboom ไม่สามารถ render ข้อความไทยบน canvas ได้ เพราะ `measureText(ch)` คืน width = 0 สำหรับ glyph ไทยหลายตัว → `getImageData(0,0,0,h)` พัง

ระบบจึงแยก:

| ประเภทข้อความ | วิธี | ฟังก์ชัน |
|--------------|-----|---------|
| ASCII (`Score: 0`, `START`, `MUTE`) | Kaboom `text()` | `_addText()` → `k.add([k.text(...)])` |
| ไทย + non-ASCII (`เกมเรียน...`, `ข้อที่`) | HTML `<div>` overlay | `_addText()` → `_addDomText()` |

`_addText()` ตรวจ `non-ASCII` regex แล้วเลือกวิธีอัตโนมัติ DOM overlay อยู่ใน `#game-ui-overlay` (`z-index: 2`, `pointer-events: none`)

ตำแหน่ง DOM text คำนวณเป็น `%` ของ canvas เพื่อให้ responsive ตาม `stretch: true`:
```javascript
el.style.left = `${(x / W) * 100}%`;
el.style.top  = `${(y / H) * 100}%`;
el.style.fontSize = `${(size / H) * 100}vh`;
el.style.transform = 'translate(-50%, -50%)';
```

### `js/engine/question-engine.js` — Abstract Base
```javascript
export class QuestionEngine {
    constructor(difficultyLevel) {
        this.difficultyLevel = difficultyLevel || 1;
        this.type = 'abstract';
    }

    getNextChallenge() { throw new Error('must be implemented'); }
    checkAnswer(selectedOption) { throw new Error('must be implemented'); }

    generateQuestion() { ... }   // template method
    validateAnswer(selected) { ... }
    getAccuracy() { ... }
}
```

**Challenge shape มาตรฐาน:** `{ text, answer, options }`

### `js/games/math-game.js` — MathGame (extends QuestionEngine)
- สุ่มตัวเลขตาม `maxNumber` จาก difficulty
- สุ่ม operation ตาม `operations` array
- คืน `{ text: '5 + 3 = ?', answer: 8, options: [...] }`

### `js/games/word-game.js` — WordGame (extends QuestionEngine)
- มี word list ภาษาไทย-อังกฤษ
- คืน `{ text: 'cat', answer: 'แมว', options: [...] }`
- **สถานะ:** แก้ typos แล้ว แต่ยังไม่เชื่อมปุ่มเลือกในเมนู

### `js/modules/ui-manager.js` — UI State
```javascript
class UIManager {
    score, lives, level, combo
    highScore ← localStorage('mathKidsHighScore')
    muted     ← localStorage('mathKidsMuted')
    tutorialShown ← localStorage('mathKidsTutorial')

    onCorrect(points) → +score, +combo, +life(ถ้า combo>2)
    onWrong() → combo=0, lives--, save high score
    reset() → ค่าเริ่มต้น (ไม่ reset muted/tutorial)
    isMuted(), toggleMute()
    shouldShowTutorial(), markTutorialShown()
}
```

### `js/modules/quest-system.js` — Achievement Tracker
- ติดตาม achievements: combo 5, 10, 25; score 50, 100, 200; level up; ตอบรวด 3 ข้อ
- บันทึกใน localStorage
- `notify(event, payload)` → เช็ค unlock → เรียก callback แสดง banner
- GameEngine ผูก `_showAchievementBanner` กับ quest callback

### `js/utils/helpers.js` — Utilities
```javascript
generateOptions(correct, count=5, range=5)
getRandomInt(min, max), randomFrom(arr)
shuffleArray(arr)
splitWord(word)              // สำหรับ word game
Timer class (start, pause, resume, reset)
debounce(func, wait)
formatTime(seconds)
lerp(start, end, t)
```

## 2. Game Loop Architecture

### `_gameUpdate()` — ทำงานทุกเฟรม (~60fps)
```
ถ้า !gameRunning || paused: return

for each falling item:
  1. เพิ่ม gravity: item.vy += 0.15
  2. เคลื่อนที่: item.y += item.vy
  3. พื้นจอ: if (y+h >= floor):
       - กระดอน: vy = -vy * bounce (0.55)
       - ถ้าน้อยมาก: destroy
  4. SYNC POS ทุกเฟรม:
       - rectObj.pos = vec2(x, y)
       - textObj.pos = vec2(x+w/2, y+h/2+2)    // text เป็น ASCII

  5. ถ้าไม่มี items เหลือ + spawnTimer > 30:
       - spawnNextQuestion()

อัปเดต HUD (Score, Lives, Combo, Progress)
```

### Boss Level Logic
```
questionCount++
if (questionCount % 10 === 0):
  isBoss = true
  ถ้า random > 0.5:
    Speed Rush → createSingleQuestion(isBoss=true)
  ถ้า random <= 0.5:
    Multi-Target → createMultiQuestion()  // 2 โจทย์ ซ้าย+ขวา
```

### Pause/Resume Flow
```
คลิก PAUSE หรือกด P/Esc:
  ├─ gameRunning = false
  ├─ k.debug.pause() (ถ้ามี)
  ├─ สร้าง pause overlay (rect มืด + RESUME + MENU buttons)
  └─ pointer ไปที่ pause overlay แทน

คลิก RESUME:
  └─ gameRunning = true, destroy overlay

คลิก MENU:
  └─ k.go('main-menu')
```

## 3. Sound System

### SoundEngine (ภายใน game-engine.js)
```
constructor:
  - AudioContext (lazy init เมื่อมี user gesture)
  - check SpeechSynthesis support

playTone(freq, dur, type):
  - OscillatorNode → GainNode → destination
  - decay exponential

correct()  → C5(523) → E5(659) → G5(784) arpeggio
wrong()    → 200Hz sawtooth
click()    → 800Hz square
levelUp()  → arpeggio 4 โน้ต
gameOver() → G4 → E4 → C4 descending

speak(text):
  - หา Thai voice จาก getVoices()
  - ถ้าไม่มี → fallback English
  - SpeechSynthesisUtterance(lang='th-TH')
```

**ข้อจำกัด:** ต้องมี **user gesture** (click) ก่อนเรียก `AudioContext.resume()`

## 4. Known Issues & Solutions

### Bug: `IndexSizeError: getImageData source width is 0` (แก้แล้ว)
**Root cause:** Kaboom `formatText` เรียก `c2d.measureText(ch)` สำหรับ glyph ไทย ได้ width = 0 แล้ว `c2d.getImageData(0, 0, 0, h)` พัง
**Fix:** `_addText()` ตรวจ non-ASCII → เรียก `_addDomText()` สร้าง HTML `<div>` overlay แทน

### Bug: Cannot click falling items (แก้แล้ว)
**Root cause:** Click handler ใช้ตำแหน่งตอน spawn (y = -200) ไม่ใช่ตำแหน่งจริง
**Fix:** ใน `_gameUpdate()` sync `item.rectObj.pos` ทุกเฟรม แล้ว DOM click ใช้ pos จริง

### Bug: Duplicate "width" property (แก้แล้ว)
**Root cause:** ใช้ `rect()` + `text()` ใน `add()` เดียวกัน
**Fix:** แยกเป็น 2 objects ผ่าน `_addRect()` และ `_addText()`

### Bug: ES Module ไม่เห็น global functions (แก้แล้ว)
**Root cause:** kaboom() ไม่ set globals เมื่อ import แบบ ES module
**Fix:** เรียกผ่าน `this.k.text(...)` หรือใช้ wrapper methods (`_addText`, `_addRect`)

## 5. How to Extend

### เพิ่มเกมโหมดใหม่
1. สร้าง `js/games/xxx-game.js`
2. Extend `QuestionEngine`
3. Implement `getNextChallenge()`, `checkAnswer()` → คืน `{ text, answer, options }`
4. ใน `GameEngine.startGame()` สลับ instance ตามโหมดที่เลือก

### เพิ่ม Boss ใหม่
แก้ `_startBossLevel()`:
```javascript
const bossTypes = ['rush', 'multi', 'timeAttack', 'reverse'];
const t = bossTypes[Math.floor(Math.random() * bossTypes.length)];
```

### เพิ่ม Particle Effects
เรียก `_spawnParticles(x, y, color)`:
```javascript
this._spawnParticles(item.x + item.w/2, item.y + item.h/2, [255, 200, 0]);
```

### เพิ่มพื้นหลังใหม่
```javascript
// ใน main.js:
k.loadSprite('bg2', './assets/bg2.png');

// ใน scene:
this.k.add([
    this.k.sprite('bg2', { width: W, height: H }),
    this.k.pos(0, 0),
    this.k.z(-1),
]);
```

## 6. Configuration Reference (`config/game-config.json`)

```json
{
    "game": { "name": "Math Kids Game", "version": "1.1.0", "language": "th" },
    "display": { "width": 1280, "height": 720, "responsive": true },
    "difficulty": {
        "levels": [
            { "name": "ง่าย", "maxNumber": 10, "operations": ["+"], "spawnInterval": 3000 },
            { "name": "ปานกลาง", "maxNumber": 20, "operations": ["+", "-"], "spawnInterval": 2500 },
            { "name": "ยาก", "maxNumber": 50, "operations": ["+", "-", "*"], "spawnInterval": 2000 }
        ]
    },
    "gameplay": {
        "startingLives": 3,
        "pointsPerCorrect": 10,
        "bonusComboMultiplier": 2,
        "bossPointsMultiplier": 3,
        "bossSpawnInterval": 10
    },
    "controls": {
        "pauseHotkey": ["p", "P", "Escape"],
        "pointerEvents": true,
        "touchSupport": true
    },
    "audio": {
        "bgmVolume": 0.5, "sfxVolume": 0.7, "defaultMuted": false,
        "sounds": { "correct": "assets/audio/correct.mp3", ... }
    },
    "colors": { ... }
}
```

## 7. Development Workflow

### Test Loop
1. แก้ code
2. กด F5 (หรือ save ถ้าใช้ live reload)
3. เปิด DevTools → Console → ดู log
4. คลิกปุ่ม/โจทย์ → ดูว่าอะไรเกิดขึ้น

### Debug Mode
เพิ่ม log ใน `_onCanvasPointer()`:
```javascript
console.log('CLICK:', clickX, clickY);
console.log('ITEMS:', this.fallingItems);
for (const item of this.fallingItems) {
    console.log('  item', item.value, 'at', item.rectObj.pos.x, item.rectObj.pos.y);
}
```

### Performance
- ใช้ `destroy()` ทุก object ที่ไม่ใช้ → avoid memory leaks
- `_clearAll()` ต้องล้างทั้ง `gameObjects` (รวม DOM) + `fallingItems`
- ใช้ `setTimeout` น้อยที่สุด → ใช้ `_gameUpdate()` event แทน
- DOM overlay text ใช้ `el.remove()` ใน wrapper `destroy()`
