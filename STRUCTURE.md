# 📐 โครงสร้าง Codebase - รายละเอียดเชิงลึก

เอกสารนี้สำหรับนักพัฒนาที่ต้องการทำความเข้าใจสถาปัตยกรรมภายใน

## 0. Dependency Graph

```
index.html
  └─ <script type="module" src="js/main.js">
         ├─ import { GameEngine } from './engine/game-engine.js'
         ├─ import { getDeviceTier, getGameDimensions, applyDisplayLayout, isVirtualKeyboardOpen, isPortrait } from './utils/viewport.js'
         └─ kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs')

js/main.js
  ├─ loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf')
  ├─ loadSprite('bg', 'assets/bg.png')
  ├─ loadSprite('bg-mobile', 'assets/bg-mobile.png')
  ├─ await waitKaboomLoad(k)
  ├─ getGameDimensions(config) → applyDisplayLayout(dims)
  └─ window.gameEngine = new GameEngine()
       ├─ gameEngine.setConfig(config)
       ├─ gameEngine.setDisplayMode(dims)
       ├─ gameEngine.setDeviceTier(deviceTier)
       ├─ gameEngine.markAssetsReady()
       └─ gameEngine.initContext(k, canvas)

js/engine/game-engine.js
  ├─ import { UIManager }            '../modules/ui-manager.js'
  ├─ import { QuestSystem }          '../modules/quest-system.js'
  ├─ import { MathGame }             '../games/math-game.js'
  ├─ import { PlayerProfile }        '../modules/player-profile.js'
  ├─ import { LeaderboardService }   '../modules/leaderboard-service.js'
  ├─ import { generateOptions }      '../utils/helpers.js'
  └─ class SoundEngine (inside same file)
       ├─ Web Audio API (Oscillator, GainNode)
       └─ SpeechSynthesisUtterance (Thai voice)

js/games/math-game.js
  └─ import { QuestionEngine } '../engine/question-engine.js'

js/games/word-game.js
  └─ import { QuestionEngine } '../engine/question-engine.js'

js/modules/leaderboard-service.js
  └─ (standalone — Supabase REST + localStorage)

js/modules/player-profile.js
  └─ (standalone — localStorage)

js/utils/viewport.js
  └─ (standalone — DOM measurements + CSS transforms)

js/engine/network.js  (placeholder — ไม่ได้ import โดย game-engine ตอนนี้)
```

## 1. Core Files

### `js/main.js` — Entry Point (~135 บรรทัด)
```javascript
async function init() {
    const kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs');
    const kaboom = kaboomModule.default;          // ← สำคัญ: .default
    const config = await loadConfig();             // ← fetch() ต้องใช้ local server

    const dims = getGameDimensions(config);
    applyDisplayLayout(dims);  // CSS scale for mobile

    const k = kaboom({
        width: dims.width,
        height: dims.height,
        stretch: !dims.scaleMode,
        background: dims.cssBg ? [0,0,0,0] : [102,126,234],
        globals: true,
        font: 'kanit',
    });

    k.loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf');
    k.loadSprite('bg', 'assets/bg.png');
    k.loadSprite('bg-mobile', 'assets/bg-mobile.png');
    await waitKaboomLoad(k);                        // รอ font + bg โหลดเสร็จ

    const gameEngine = new GameEngine();
    gameEngine.setConfig(config);
    gameEngine.setDisplayMode(dims);
    gameEngine.setDeviceTier(dims.tier);
    gameEngine.markAssetsReady();
    gameEngine.initContext(k, canvas);

    // orientation/resize handlers
    k.onResize(() => refreshLayout(true));
    window.addEventListener('orientationchange', ...);
}
```

### `js/engine/game-engine.js` — Core Engine (~1400 บรรทัด)
คลาสเดียวที่ขับเคลื่อนทั้งเกม รวม `SoundEngine` class ภายในไฟล์

#### หน้าที่หลัก
1. **Scene Management** - 6 scenes (enter-name, main-menu, leaderboard, game, settings, game-over)
2. **Game Loop** - `_gameUpdate()` ทำงานทุกเฟรมผ่าน `k.onUpdate()`
3. **Falling Items** - จัดการ gravity, drift, wall bounce, collision, hit test
4. **Click Handler** - DOM event → game coordinates (รองรับ pointer + touch)
5. **Leaderboard** - submit/fetch ผ่าน LeaderboardService (Supabase + localStorage)
6. **Player Profile** - ชื่อเล่นผ่าน PlayerProfile (localStorage)
7. **Sound** - SFX + TTS
8. **UI State** - pause, tutorial, mute (ผ่าน UIManager)
9. **Quests** - แจ้งเตือนความสำเร็จ (ผ่าน QuestSystem)
10. **Responsive** - `_tierSize()` ปรับ UI ตาม phone/tablet/desktop

#### Properties สำคัญ
```javascript
class GameEngine {
    this.k                    // Kaboom instance
    this.uiManager            // UIManager (score, lives, combo, mute, tutorial)
    this.sound                // SoundEngine
    this.questSystem          // QuestSystem (achievements)
    this.leaderboardService   // LeaderboardService (cloud + local)
    this.playerProfile        // PlayerProfile (ชื่อเล่น)
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
    this._deviceTier          // 'phone'|'tablet'|'desktop'
    this._displayMode         // { scaleMode, cssBg }
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
        ├─ _destroyDomPanels() // remove DOM panels + reset aria-hidden
        ├─ สร้าง UI ใหม่ + bg
        └─ เริ่ม spawn question (ถ้าเป็น 'game')
```

#### Responsive 3 Tiers (`_tierSize`)
```
_getLayoutTier() → 'phone' | 'tablet' | 'desktop'

_tierSize({ phone: 120, tablet: 90, desktop: 110 })
  → คืนค่าตาม tier ปัจจุบัน

ใช้ในทุกจุด: items, fonts, buttons, HUD, menu, tutorial, game-over
```

#### DOM Click Flow
```
canvas pointer event (จาก initContext)
  └─ _onCanvasPointer(e)
       ├─ คำนวณ clickX, clickY (game coordinates)
       ├─ วน fallingItems (หลังไปหน้า)
       │    └─ circle: hit test ด้วย distance from center
       │    └─ rect: hit test ด้วย AABB
       │    └─ hit → item.actionFn()
       └─ วน clickableAreas
            └─ hit test → area.action()
```

**สำคัญ:** Falling items ใช้ **pos จริง** (จาก Kaboom object ที่ sync ทุกเฟรม) circle sync ใช้ anchor center ส่วน rect ใช้ anchor topleft

### ระบบข้อความ: DOM Overlay (สำคัญ!)

Kaboom ไม่สามารถ render ข้อความไทยบน canvas ได้ เพราะ `measureText(ch)` คืน width = 0 สำหรับ glyph ไทยหลายตัว → `getImageData(0,0,0,h)` พัง

ระบบจึงแยก:

| ประเภทข้อความ | วิธี | ฟังก์ชัน |
|--------------|-----|---------|
| ASCII (`Score: 0`, `START`, `MUTE`) | Kaboom `text()` | `_addText()` → `k.add([k.text(...)])` |
| ไทย + non-ASCII (`เกมเรียน...`, `ข้อที่`) | HTML `<div>` overlay | `_addText()` → `_addDomText()` |

`_addText()` ตรวจ `non-ASCII` regex + strip emoji แล้วเลือกวิธีอัตโนมัติ DOM overlay อยู่ใน `#game-ui-overlay` (`z-index: 2`, `pointer-events: none`)

ตำแหน่ง DOM text คำนวณเป็น `%` ของ canvas เพื่อให้ responsive:
```javascript
el.style.left = `${(x / W) * 100}%`;
el.style.top  = `${(y / H) * 100}%`;
el.style.fontSize = `${(fontSize / H) * 100}%`;
el.style.transform = 'translate(-50%, -50%)';
```

### `js/modules/leaderboard-service.js` — Leaderboard Cloud + Local
- `submit(entry)` → บันทึกลง localStorage → ลอง sync Supabase → fallback ถ้าพัง
- `fetchEntries()` → merge local + cloud entries
- `isCloudAvailable()` → เช็คสถานะการเชื่อมต่อ
- `getRank(score, maxLevel)` → หาอันดับ
- `healthCheck()` → ทดสอบ Supabase API

### `js/modules/player-profile.js` — Player Profile (localStorage)
- `getName()`, `setName(name)`, `hasName()`
- Validate: 2-16 ตัวอักษร, trim whitespace

### `js/utils/viewport.js` — Responsive 3 Tiers
- `getDeviceTier()` → `'phone'` (< 768px) | `'tablet'` (768-1200px) | `'desktop'` (> 1200px)
- `getGameDimensions(config)` → `{ width, height, scaleMode, cssBg, tier }`
- Phone: 720×1280 portrait + CSS scale to fit
- Tablet: orientation-aware + CSS scale
- Desktop: native 1280×720
- `applyDisplayLayout(dims)` → CSS `transform: scale(...)` + centering

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
  3. Wall bounce: ถ้า x<0 หรือ x+w>W → สะท้อน vx
  4. Horizontal drift: item.x += item.vx
  5. Friction: item.vx *= 0.998
  6. Floor: if (y+h >= floor):
       - กระดอน: vy = -vy * bounce (0.55)
       - ถ้าน้อยมาก: destroy
  7. Rotation: rect → item.shapeObj.angle = item.rotation (circle skip)
  8. SYNC POS ทุกเฟรม:
       - circle: shapeObj.pos = vec2(x + w/2, y + h/2)  // anchor center
       - rect:   shapeObj.pos = vec2(x, y)                // anchor topleft
       - textObj: pos = vec2(x + w/2, y + h/2 + 2)

  9. ถ้าไม่มี items เหลือ + spawnTimer > 30:
       - spawnNextQuestion()

อัปเดต HUD (Score, Lives, Combo, Progress)
```

### Boss Level Logic
```
questionCount++
if (questionCount % 10 === 0):
  isBoss = true
  flashMsg('BOSS LEVEL!')
  ถ้า random > 0.5:
    Speed Rush → createSingleQuestion()
  ถ้า random <= 0.5:
    Multi-Target → createMultiQuestion()  // 2 โจทย์ ซ้าย+ขวา
```

### Pause/Resume Flow
```
คลิก PAUSE หรือกด P/Esc:
  ├─ uiManager.togglePause()
  ├─ ถ้า paused: _showPauseOverlay() (rect มืด + RESUME + MENU)
  └─ ถ้า resumed: _hidePauseOverlay()

คลิก RESUME:
  └─ _togglePause()

คลิก MENU:
  └─ uiManager.paused = false → k.go('main-menu')
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
**Fix:** ใน `_gameUpdate()` sync `item.shapeObj.pos` ทุกเฟรม แล้ว DOM click ใช้ pos จริง

### Bug: Circle text offset (แก้แล้ว)
**Root cause:** Kaboom circle ใช้ `anchor: center` แต่ sync pos ใช้ topleft origin
**Fix:** ใน `_gameUpdate()` ตรวจ `item.shape === 'circle'` → offset pos + w/2, + h/2

### Bug: Progress "ข้อที่ 0/10" (แก้แล้ว)
**Root cause:** `questionCount % 10` → เมื่อ questionCount=10 ได้ค่า 0
**Fix:** `((questionCount - 1) % 10) + 1` → 1→1, 10→10, 11→1

### Bug: `aria-hidden` on focused element (แก้แล้ว)
**Root cause:** `#game-ui-overlay` มี `aria-hidden="true"` ตลอดเวลา แม้มี DOM panel ที่มี focus
**Fix:** toggle `aria-hidden="false"` เมื่อเปิด panel, `aria-hidden="true"` เมื่อปิด

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
    "game": { "name": "Math Kids Game", "version": "1.2.0", "language": "th" },
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
    "leaderboard": {
        "enabled": true,
        "maxEntries": 50,
        "supabaseUrl": "https://<project>.supabase.co",
        "supabaseAnonKey": "eyJ...",
        "table": "leaderboard"
    },
    "audio": { ... },
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
console.log('ITEMS:', this.fallingItems.length);
for (const item of this.fallingItems) {
    console.log('  item', item.value, item.shape, 'at', item.x, item.y);
}
```

### Performance
- ใช้ `destroy()` ทุก object ที่ไม่ใช้ → avoid memory leaks
- `_clearAll()` ต้องล้างทั้ง `gameObjects` (รวม DOM) + `fallingItems`
- ใช้ `setTimeout` น้อยที่สุด → ใช้ `_gameUpdate()` event แทน
- DOM overlay text ใช้ `el.remove()` ใน wrapper `destroy()`