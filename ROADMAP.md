# 🗺️ Roadmap - แผนการพัฒนา

## ✅ เสร็จแล้ว (v1.0)
- [x] หน้าเมนู (START, SETTINGS)
- [x] หน้าเล่นเกม (HUD, BACK button)
- [x] Falling items + gravity + bounce
- [x] DOM click handler (hit test ถูกต้อง)
- [x] Score, Lives, Combo system
- [x] Level up (ทุก 50 คะแนน)
- [x] Boss level ทุก 10 ข้อ (Speed Rush + Multi-Target)
- [x] Sound effects (Web Audio API)
- [x] Thai TTS (SpeechSynthesis)
- [x] Difficulty levels (1-3)
- [x] High score (localStorage)
- [x] Game Over screen
- [x] Settings screen
- [x] Documentation (README, STRUCTURE, DEVELOPMENT, API, STATS)

## ✅ เสร็จแล้ว (v1.1 — UX + Architecture cleanup)
- [x] **Pause/Resume** - ปุ่ม PAUSE + ปุ่ม Pause ใน HUD, hotkey `P`/`Esc`, pause overlay
- [x] **Restart จาก Game Over** - ปุ่ม "เล่นอีกครั้ง"
- [x] **แสดงคำตอบที่ถูก** เมื่อตอบผิด (เขียว ~1.5 วิ)
- [x] **Tutorial overlay** - ครั้งแรกเล่น (localStorage)
- [x] **Audio mute toggle** - ปุ่ม MUTE/SND + persist ใน localStorage
- [x] **Touch/responsive** - `touch-action: manipulation`, falling items เล็กลงบนจอแคบ
- [x] **Progress indicator** - "ข้อที่ X / 10"
- [x] **MathGame refactor** - ย้าย math logic ไป `js/games/math-game.js` extends QuestionEngine
- [x] **ลบ dead code** - `js/modules/player.js`, `js/modules/falling-item.js`
- [x] **QuestSystem rewrite** - เป็น achievement tracker + banner
- [x] **WordGame** - แก้ typos, interface ตรง QuestionEngine
- [x] **Config flow** - `game-config.json` v1.1.0, `main.js` ส่งผ่าน `setConfig()`
- [x] **พื้นหลัง** - ดาวน์โหลด bg.png (~2MB) → `loadSprite('bg')` + overlay มืด
- [x] **ฟอนต์ Kanit** - `loadFont('kanit', ...)` สำหรับข้อความ
- [x] **Particle effects** - ระเบิดตอนถูก + level up + combo

## ✅ เสร็จแล้ว (v1.1.1 — Font fix)
- [x] **HTML overlay สำหรับข้อความไทย** - แก้ `IndexSizeError: getImageData source width is 0`
  - `_addDomText()` สร้าง `<div>` ใน `#game-ui-overlay` (z-index 2)
  - `_addText()` เลือก DOM อัตโนมัติเมื่อข้อความมี non-ASCII
  - ข้อความ ASCII ยังใช้ Kaboom text ตามเดิม

## 🚧 กำลังทำ / ค้างอยู่
- [ ] **ไฟล์เสียงจริง** - แทนที่ procedural SFX ด้วย mp3 (มี config path แล้วใน `audio.sounds`)
- [ ] **WordGame ในเมนู** - ปัจจุบัน MathGame เป็น default; ยังไม่มีปุ่มเลือกโหมด
- [ ] **Animations** - ปุ่ม hover, item entrance, screen transitions
- [ ] **UI polish** - progress bar กราฟิก, อนิเมชัน

## 🌟 ระยะกลาง (v1.2)
- [ ] **Player character** - animated sprite
- [ ] **Power-ups** - 2x score, slow motion, extra life
- [ ] **Stats screen** - accuracy, streaks, history
- [ ] **Quest expansion** - achievements เพิ่ม, badges
- [ ] **PWA** - manifest + service worker สำหรับ offline

## 🚀 ระยะไกล (v2.0)
- [ ] **Multiplayer จริง** - Supabase integration (placeholder อยู่ใน `network.js`)
  - [ ] Create/join room
  - [ ] Sync questions
  - [ ] Real-time score board
  - [ ] Host/guest logic
- [ ] **Leaderboard** - global ranking
- [ ] **Accounts** - login, save progress
- [ ] **More game modes**:
  - [ ] Time attack
  - [ ] Survival (infinite)
  - [ ] Practice (no timer)
  - [ ] Daily challenge

## 📱 ระยะยาว (v3.0)
- [ ] **Mobile app** - PWA / Capacitor
- [ ] **Offline mode** - IndexedDB
- [ ] **Analytics** - track performance
- [ ] **Adaptive difficulty** - AI ปรับความยากตามผู้เล่น
- [ ] **Content updates** - ใหม่ทุกเดือน
- [ ] **Custom avatars** - player customization
- [ ] **Social features** - share scores, challenge friends

## 🐛 Bugs ที่ทราบ
| Bug | Severity | Status | Notes |
|-----|----------|--------|-------|
| Thai voice fallback เป็น English | Low | Known | ใช้ English ถ้า OS ไม่มี Thai TTS voice |
| `kaboom` config บางค่ายัง hard-coded | Low | Known | ส่วนใหญ่อ่านจาก config แล้ว |
| WordGame ยังไม่เชื่อมปุ่มเลือกโหมด | Low | Planned | v1.2 |
| Multiplayer เป็น stub | Medium | Known | v2.0 |

## 📊 Metrics ความสำเร็จ
- [x] เกมเล่นได้ครบ 1 รอบไม่มี crash (หลังแก้ IndexSizeError)
- [ ] Frame rate > 55fps เสมอ
- [x] ไม่มี console errors (ใน flow หลัก)
- [x] คลิก response < 100ms
- [ ] Thai voice ทำงาน 80% ของเวลา (ขึ้น OS)
- [ ] Multiplayer latency < 200ms (v2.0)

## 🗓️ Timeline (เป้าหมาย)
- **มิถุนายน 2026**: v1.1 ✅ (UX + architecture + bg + font fix)
- **กรกฎาคม 2026**: v1.2 (player, power-ups, stats, PWA)
- **สิงหาคม 2026**: v2.0 (Multiplayer)
- **กันยายน 2026**: v3.0 (Mobile + social)

## 🤝 Contributing
1. Fork repo
2. สร้าง branch ใหม่
3. แก้ไขใน branch นั้น
4. Test ก่อน commit (run `npx serve .` → เล่นครบรอบ)
5. สร้าง PR พร้อมคำอธิบาย

## 📝 Notes
- โปรเจคนี้เริ่มต้นด้วย Cursor AI Agent
- ทุกไฟล์ควร comment เป็นภาษาไทย
- ใช้ Kaboom.js v3000.0.1 (ES module)
- ไม่ใช้ frameworks อื่น (pure Vanilla JS)
- Multiplayer ใช้ Supabase Realtime (ฟรี tier)
