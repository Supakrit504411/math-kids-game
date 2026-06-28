/**
 * GameEngine - Full Game Engine
 * - Falling items, Boss levels, Particles, Sound
 * - DOM click + touch + pointer events
 * - Pause/Resume, Restart, Tutorial, Mute
 * - Uses MathGame (QuestionEngine) for question logic
 * - Reads game-config.json values
 */

import { UIManager } from '../modules/ui-manager.js';
import { QuestSystem } from '../modules/quest-system.js';
import { MathGame } from '../games/math-game.js';
import { PlayerProfile } from '../modules/player-profile.js';
import { LeaderboardService } from '../modules/leaderboard-service.js';
import { generateOptions } from '../utils/helpers.js';

// Sound Engine - Web Audio API + SpeechSynthesis (เสียงไทย)
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.speechEnabled = 'speechSynthesis' in window;
    }
    _ensure() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    unlock() {
        try { this._ensure(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { }
    }
    playTone(freq, dur, type) {
        if (!this.enabled) return;
        try {
            this._ensure();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.frequency.value = freq; osc.type = type || 'sine';
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            osc.start(); osc.stop(this.ctx.currentTime + dur);
        } catch (e) { }
    }
    correct() {
        this.playTone(523, 0.12);
        setTimeout(() => this.playTone(659, 0.12), 80);
        setTimeout(() => this.playTone(784, 0.25), 160);
    }
    wrong() { this.playTone(200, 0.3, 'sawtooth'); }
    click() { this.playTone(800, 0.05, 'square'); }
    levelUp() {
        this.playTone(523, 0.15);
        setTimeout(() => this.playTone(659, 0.15), 100);
        setTimeout(() => this.playTone(784, 0.15), 200);
        setTimeout(() => this.playTone(1047, 0.3), 300);
    }
    gameOver() {
        this.playTone(392, 0.3);
        setTimeout(() => this.playTone(330, 0.3), 250);
        setTimeout(() => this.playTone(262, 0.5), 500);
    }
    speak(text) {
        if (!this.speechEnabled || !this.enabled) return;
        try {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang.startsWith('th'));
            const u = new SpeechSynthesisUtterance(text);
            if (voice) { u.voice = voice; u.lang = 'th-TH'; }
            else { u.lang = 'en-US'; }
            u.rate = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
        } catch (e) { }
    }
}

export class GameEngine {
    constructor() {
        this.uiManager = new UIManager();
        this.playerProfile = new PlayerProfile();
        this.leaderboardService = null;
        this.sound = new SoundEngine();
        this.questSystem = new QuestSystem();
        this.mathGame = null; // สร้างตอน startGame ตาม difficulty
        this.gameRunning = false;
        this.currentDifficulty = 1;
        this.spawnTimer = 0;
        this.baseSpawnInterval = 3000;
        this.questionCount = 0;
        this.isBoss = false;
        this.multiQuestion = [];
        this.currentQuestion = '';
        this.correctAnswer = 0;
        this.fallingItems = [];
        this.gameObjects = [];
        this.scoreTextObj = null;
        this.livesTextObj = null;
        this.questionTextObj = null;
        this.comboTextObj = null;
        this.progressTextObj = null;
        this.bossNotifyObj = null;
        this.pauseOverlayObjs = [];
        this.clickableAreas = [];
        this.config = null;
        this.canvas = null;
        this.clickHandlerBound = this._onCanvasPointer.bind(this);
        this.keyHandlerBound = this._onKeyDown.bind(this);
        this._showingAnswer = false;
        this._bgLoaded = false;
        this.domPanels = [];
        this._lastGameResult = null;
        this._blockViewportRefresh = false;
        this._bgMobileLoaded = true;
        this._displayMode = { scaleMode: false, cssBg: false };
        this._deviceTier = 'desktop';
    }

    setDeviceTier(tier) {
        this._deviceTier = tier || 'desktop';
    }

    setDisplayMode(dims) {
        this._displayMode = dims || { scaleMode: false, cssBg: false };
    }

    _useCssMobileBg() {
        return !!this._displayMode?.cssBg;
    }

    setConfig(config) {
        this.config = config || null;
        this.leaderboardService = new LeaderboardService(this.config);
    }

    /** เรียกจาก main.js หลัง k.onLoad (font + bg พร้อมแล้ว) */
    markAssetsReady() {
        this._bgLoaded = true;
    }

    initContext(k, canvasEl) {
        this.k = k;
        this.canvas = canvasEl || document.getElementById('gameCanvas');
        setTimeout(() => {
            const canvas = this.canvas || document.querySelector('canvas');
            if (canvas) {
                canvas.addEventListener('pointerdown', this.clickHandlerBound, { capture: true, passive: true });
                canvas.style.touchAction = 'manipulation';
                console.log('Canvas pointer handler attached');
            } else {
                console.error('No canvas found!');
            }
            window.addEventListener('keydown', this.keyHandlerBound);
        }, 200);
        this._setupScenes();
        console.log('GameEngine initialized');
    }

    /** เรียกเมื่อหมุนจอ — ไม่ redraw ตอนกรอกชื่อ/คีย์บอร์ดเปิด */
    shouldRedrawOnResize() {
        if (this._blockViewportRefresh) return false;
        if (this._currentSceneName === 'enter-name' || this._currentSceneName === 'leaderboard') {
            return false;
        }
        const active = document.activeElement;
        if (active && active.closest?.('.dom-panel')) return false;
        return true;
    }

    onViewportResize() {
        if (!this.k || !this._currentSceneName) return;
        if (!this.shouldRedrawOnResize()) return;
        const scene = this._currentSceneName;
        if (scene === 'game' && this.gameRunning) {
            const diff = this.currentDifficulty;
            const qCount = this.questionCount;
            const wasPaused = this.uiManager.isPaused();
            this.k.go('game');
            this.currentDifficulty = diff;
            this.questionCount = qCount;
            if (wasPaused) this._togglePause();
        } else {
            this.k.go(scene);
        }
    }

    /** @returns {'phone'|'tablet'|'desktop'} */
    _getLayoutTier() {
        return this._deviceTier || 'desktop';
    }

    /** @returns {boolean} — true for phone/tablet (scaled devices) */
    _isScaledDevice() {
        return this._getLayoutTier() !== 'desktop';
    }

    /**
     * คืนค่า size ตาม tier
     * @param {Object} sizes - { phone, tablet, desktop } หรือ { phone, desktop } (tablet ใช้ desktop)
     * @returns {number}
     */
    _tierSize(sizes) {
        const tier = this._getLayoutTier();
        if (tier === 'phone') return sizes.phone;
        if (tier === 'tablet') return sizes.tablet ?? sizes.desktop;
        return sizes.desktop;
    }

    _addBackground() {
        if (!this._bgLoaded) return;
        const W = this.k.width();
        const H = this.k.height();

        if (this._useCssMobileBg()) {
            this._addRect(0, 0, W, H, [0, 0, 30, 90], 0);
            return;
        }

        const spriteKey = (this._isScaledDevice() && this._bgMobileLoaded) ? 'bg-mobile' : 'bg';
        const sx = spriteKey === 'bg-mobile' ? W / 720 : W / 1280;
        const sy = spriteKey === 'bg-mobile' ? H / 1280 : H / 720;
        const bg = this.k.add([
            this.k.sprite(spriteKey),
            this.k.pos(W / 2, H / 2),
            this.k.anchor('center'),
            this.k.scale(sx, sy),
            this.k.z(-1),
        ]);
        this.gameObjects.push(bg);
        return bg;
    }

    _onKeyDown(e) {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (this.k && this.gameRunning !== undefined && this._currentSceneName === 'game') {
                this._togglePause();
            }
        }
    }

    _onCanvasPointer(e) {
        // ปลดล็อกเสียงตอนมี user gesture แรก
        this.sound.unlock();
        if (e.pointerType === 'touch') e.preventDefault();

        const canvas = e.currentTarget || this.canvas || e.target;
        const rc = canvas.getBoundingClientRect();
        const gameW = this.k.width();
        const gameH = this.k.height();
        const clickX = ((e.clientX - rc.left) / rc.width) * gameW;
        const clickY = ((e.clientY - rc.top) / rc.height) * gameH;

        // 1) Falling items
        for (let i = this.fallingItems.length - 1; i >= 0; i--) {
            const item = this.fallingItems[i];
            if (!item.alive) continue;

            let hit = false;
            if (item.shape === 'circle') {
                // Circle hit test: distance from center < radius
                const cx = item.x + item.w / 2;
                const cy = item.y + item.h / 2;
                const r = item.w / 2;
                const dx = clickX - cx;
                const dy = clickY - cy;
                hit = (dx * dx + dy * dy) <= (r * r);
            } else {
                // Rectangle hit test (default)
                const ox = item.shapeObj.pos.x;
                const oy = item.shapeObj.pos.y;
                hit = clickX >= ox && clickX <= ox + item.w &&
                      clickY >= oy && clickY <= oy + item.h;
            }

            if (hit) {
                try { item.actionFn(); } catch (err) { console.error(err); }
                this.sound.click();
                return;
            }
        }

        // 2) Static clickable areas
        for (let i = this.clickableAreas.length - 1; i >= 0; i--) {
            const area = this.clickableAreas[i];
            if (clickX >= area.x && clickX <= area.x + area.w &&
                clickY >= area.y && clickY <= area.y + area.h) {
                try { area.action(); } catch (err) { console.error(err); }
                this.sound.click();
                return;
            }
        }
    }

    _addClickable(x, y, w, h, action) {
        this.clickableAreas.push({ x, y, w, h, action });
    }

    _clearClickables() {
        this.clickableAreas = [];
    }

    /** ข้อความ non-ASCII (ไทย) — ใช้ DOM แทน Kaboom text เพื่อหลีกเลี่ยง getImageData width 0 */
    _addDomText(str, x, y, size, colorVal) {
        const W = this.k.width();
        const H = this.k.height();
        const el = document.createElement('div');
        el.className = 'game-dom-text';
        el.textContent = str;
        const [r, g, b] = colorVal || [255, 255, 255];
        const fontSize = size || 32;
        // ใช้ % ของ parent (#game-scale) height แทน vh — ทำให้ขนาดสัมพันธ์กับ canvas จริง
        // เมื่อ wrapper ถูก CSS scale() ขนาดจะถูกปรับอัตโนมัติ
        const fontSizePercent = (fontSize / H) * 100;
        el.style.cssText = `
            position: absolute;
            left: ${(x / W) * 100}%;
            top: ${(y / H) * 100}%;
            font-size: ${fontSizePercent}%;
            color: rgb(${r}, ${g}, ${b});
            transform: translate(-50%, -50%);
            white-space: nowrap;
            pointer-events: none;
            font-family: 'Kanit', sans-serif;
            line-height: 1;
            text-align: center;
        `;
        this._getDomOverlay().appendChild(el);
        const wrapper = {
            isDom: true,
            _el: el,
            destroy() { el.remove(); },
        };
        Object.defineProperty(wrapper, 'text', {
            get() { return el.textContent; },
            set(v) { el.textContent = v; },
            enumerable: true,
        });
        this.gameObjects.push(wrapper);
        return wrapper;
    }

    _addText(str, x, y, size, colorVal) {
        const k = this.k;
        let safeStr = (str === '' || str == null) ? ' ' : String(str);
        // ลบ emoji (Kanit ไม่มี glyph → measureText width 0)
        safeStr = safeStr.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
        if (!safeStr) safeStr = ' ';
        // Kaboom formatText ล้มเมื่อ glyph ไทยมี measureText width = 0
        if (/[^\x00-\x7F]/.test(safeStr)) {
            return this._addDomText(safeStr, x, y, size, colorVal);
        }
        const obj = k.add([
            k.text(safeStr, { size: size || 32 }),
            k.pos(x, y),
            k.anchor('center'),
        ]);
        if (colorVal) obj.color = k.rgb(colorVal[0], colorVal[1], colorVal[2]);
        this.gameObjects.push(obj);
        return obj;
    }

    _addRect(x, y, w, h, colorVal, radius) {
        const k = this.k;
        const obj = k.add([k.rect(w, h, { radius: radius || 0 }), k.pos(x, y)]);
        if (colorVal) {
            obj.color = k.rgb(colorVal[0], colorVal[1], colorVal[2]);
            if (colorVal.length >= 4) obj.opacity = colorVal[3] / 255;
        }
        this.gameObjects.push(obj);
        return obj;
    }

    _addCircle(x, y, radius, colorVal) {
        const k = this.k;
        const obj = k.add([
            k.circle(radius),
            k.pos(x, y),
        ]);
        if (colorVal) obj.color = k.rgb(colorVal[0], colorVal[1], colorVal[2]);
        this.gameObjects.push(obj);
        return obj;
    }

    _clearAll() {
        this._destroyDomPanels();
        for (const obj of this.gameObjects) {
            if (obj && obj.destroy) try { obj.destroy(); } catch (e) { }
        }
        for (const item of this.fallingItems) {
            if (item.shapeObj && item.shapeObj.destroy) try { item.shapeObj.destroy(); } catch (e) { }
            if (item.textObj && item.textObj.destroy) try { item.textObj.destroy(); } catch (e) { }
        }
        this.gameObjects = [];
        this.fallingItems = [];
        this.clickableAreas = [];
        this.scoreTextObj = null;
        this.livesTextObj = null;
        this.questionTextObj = null;
        this.comboTextObj = null;
        this.progressTextObj = null;
        this.bossNotifyObj = null;
        this.pauseOverlayObjs = [];
    }

    _destroyDomPanels() {
        for (const el of this.domPanels) {
            if (el && el.remove) try { el.remove(); } catch (e) { }
        }
        this.domPanels = [];
        if (!document.querySelector('.dom-panel .dom-input:focus')) {
            this._blockViewportRefresh = false;
        }
        // Re-hide overlay from screen readers when no panels are visible
        const overlay = document.getElementById('game-ui-overlay');
        if (overlay) overlay.setAttribute('aria-hidden', 'true');
    }

    _getDomOverlay() {
        let el = document.getElementById('game-ui-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'game-ui-overlay';
            el.setAttribute('aria-hidden', 'true');
            document.getElementById('game-container')?.appendChild(el) || document.body.appendChild(el);
        }
        return el;
    }

    _showNameEntryPanel(onDone) {
        this._destroyDomPanels();
        this._blockViewportRefresh = true;

        const overlay = this._getDomOverlay();
        overlay.setAttribute('aria-hidden', 'false');
        const panel = document.createElement('div');
        panel.className = 'dom-panel dom-panel--name';
        panel.innerHTML = `
            <h2>ลงชื่อเล่น</h2>
            <p class="hint">ใส่ชื่อของคุณเพื่อบันทึกคะแนนและแข่งขันอันดับ</p>
            <input class="dom-input" type="text" maxlength="16" placeholder="ชื่อเล่น 2-16 ตัว" autocomplete="nickname" inputmode="text" enterkeyhint="done" />
            <div class="dom-error"></div>
            <div class="dom-btn-row">
                <button type="button" class="dom-btn dom-btn-primary" data-action="save">บันทึกและเล่น</button>
            </div>
        `;
        overlay.appendChild(panel);
        this.domPanels.push(panel);

        const input = panel.querySelector('.dom-input');
        const errEl = panel.querySelector('.dom-error');
        if (this.playerProfile.getName()) input.value = this.playerProfile.getName();

        const finish = () => {
            this._blockViewportRefresh = false;
            this._destroyDomPanels();
        };

        const save = () => {
            const result = this.playerProfile.setName(input.value);
            if (!result.ok) {
                errEl.textContent = result.error;
                return;
            }
            finish();
            if (onDone) onDone();
        };

        panel.querySelector('[data-action="save"]').addEventListener('click', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
        });
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!panel.contains(document.activeElement)) {
                    this._blockViewportRefresh = false;
                }
            }, 200);
        });

        requestAnimationFrame(() => {
            try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        });
    }

    async _showLeaderboardPanel() {
        this._destroyDomPanels();
        this._blockViewportRefresh = true;
        const entries = this.leaderboardService
            ? await this.leaderboardService.fetchEntries()
            : [];

        const overlay = this._getDomOverlay();
        overlay.setAttribute('aria-hidden', 'false');
        const panel = document.createElement('div');
        panel.className = 'dom-panel';

        let rows = '';
        if (entries.length === 0) {
            rows = '<div class="leaderboard-empty">ยังไม่มีคะแนน — เริ่มเล่นเพื่อขึ้นอันดับ!</div>';
        } else {
            rows = entries.map((e, i) => {
                const rank = i + 1;
                const topClass = rank <= 3 ? `top${rank}` : '';
                const date = e.playedAt ? new Date(e.playedAt).toLocaleDateString('th-TH') : '-';
                return `<tr class="${topClass}">
                    <td>${rank}</td>
                    <td>${this._escapeHtml(e.playerName)}</td>
                    <td>${e.score}</td>
                    <td>${this._escapeHtml(e.difficultyName || '-')}</td>
                    <td>Lv.${e.maxLevel || 1}</td>
                    <td>${date}</td>
                </tr>`;
            }).join('');
        }

        const cloudNote = this.leaderboardService?.isCloudAvailable()
            ? 'อันดับรวมจากทุกผู้เล่น'
            : (this.config?.leaderboard?.supabaseUrl
                ? 'ระบบคลาวด์ไม่พร้อมใช้งาน — แสดงอันดับบนเครื่องนี้'
                : 'อันดับบนเครื่องนี้ (ตั้งค่า Supabase เพื่อแข่งขันรวม)');

        panel.innerHTML = `
            <h2>กระดานผู้นำ</h2>
            <p class="hint">${cloudNote}</p>
            <div class="leaderboard-scroll">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>ชื่อ</th>
                            <th>คะแนน</th>
                            <th>ระดับ</th>
                            <th>Level</th>
                            <th>วันที่</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p class="leaderboard-note">คะแนนแยกตามระดับ: ง่าย / ปานกลาง / ยาก</p>
            <div class="dom-btn-row">
                <button type="button" class="dom-btn dom-btn-secondary" data-action="back">กลับ</button>
                <button type="button" class="dom-btn dom-btn-accent" data-action="rename">เปลี่ยนชื่อ</button>
            </div>
        `;
        overlay.appendChild(panel);
        this.domPanels.push(panel);

        panel.querySelector('[data-action="back"]').addEventListener('click', () => {
            this._blockViewportRefresh = false;
            this._destroyDomPanels();
            this.k.go('main-menu');
        });
        panel.querySelector('[data-action="rename"]').addEventListener('click', () => {
            this._blockViewportRefresh = false;
            this._destroyDomPanels();
            this.k.go('enter-name');
        });
    }

    _escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async _submitGameResult() {
        if (!this.leaderboardService || !this.playerProfile.hasName()) return null;
        const diffName = this.leaderboardService.getDifficultyLabel(this.currentDifficulty, this.config);
        const entry = {
            playerName: this.playerProfile.getName(),
            score: this.uiManager.getScore(),
            difficulty: this.currentDifficulty,
            difficultyName: diffName,
            maxLevel: this.uiManager.getLevel(),
        };
        this._lastGameResult = entry;
        try {
            const rank = await this.leaderboardService.submit(entry);
            return rank;
        } catch (e) {
            console.warn('Leaderboard submit failed:', e);
            return null;
        }
    }

    _setupScenes() {
        const k = this.k;
        k.scene('enter-name', () => { this._currentSceneName = 'enter-name'; this._drawEnterNameScene(); });
        k.scene('main-menu', () => { this._currentSceneName = 'main-menu'; this._drawMainMenu(); });
        k.scene('leaderboard', () => { this._currentSceneName = 'leaderboard'; this._drawLeaderboardScene(); });
        k.scene('game', () => { this._currentSceneName = 'game'; this._drawGameScene(); });
        k.scene('settings', () => { this._currentSceneName = 'settings'; this._drawSettings(); });
        k.scene('game-over', () => { this._currentSceneName = 'game-over'; this._drawGameOverScene(); });

        if (!this.playerProfile.hasName()) {
            k.go('enter-name');
        } else {
            k.go('main-menu');
        }
    }

    _drawEnterNameScene() {
        this._clearAll();
        const W = this.k.width();
        const H = this.k.height();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 140], 0);
        this._addText('MATH KIDS', W / 2, H * 0.18, this._tierSize({ phone: 48, desktop: 64 }), [255, 230, 109]);
        this._showNameEntryPanel(() => this.k.go('main-menu'));
    }

    _drawLeaderboardScene() {
        this._clearAll();
        const W = this.k.width();
        const H = this.k.height();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 140], 0);
        this._showLeaderboardPanel();
    }

    _getDiffConfig(level) {
        if (this.config && this.config.difficulty && this.config.difficulty.levels) {
            return this.config.difficulty.levels[level - 1] || this.config.difficulty.levels[0];
        }
        const defaults = [
            { name: 'ง่าย', maxNumber: 10, operations: ['+'], spawnInterval: 3000 },
            { name: 'ปานกลาง', maxNumber: 20, operations: ['+', '-'], spawnInterval: 2500 },
            { name: 'ยาก', maxNumber: 50, operations: ['+', '-', '*'], spawnInterval: 2000 },
        ];
        return defaults[level - 1] || defaults[0];
    }

    // ====== MAIN MENU ======
    _drawMainMenu() {
        this._clearAll();
        this.isBoss = false;
        const W = this.k.width();
        const H = this.k.height();
        const tier = this._getLayoutTier();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 120], 0);

        const titleSize = this._tierSize({ phone: 64, tablet: 80, desktop: 96 });
        const titleY = this._tierSize({ phone: 100, tablet: 115, desktop: 130 });
        this._addText('MATH', W * 0.35, titleY, titleSize, [255, 107, 107]);
        this._addText('KIDS', W * 0.65, titleY, titleSize, [78, 205, 196]);
        this._addText('เกมเรียนคณิตศาสตร์สนุกๆ!', W / 2, this._tierSize({ phone: 170, tablet: 190, desktop: 210 }), this._tierSize({ phone: 24, tablet: 27, desktop: 30 }), [255, 255, 255]);

        const playerName = this.playerProfile.getName();
        if (playerName) {
            this._addText('สวัสดี, ' + playerName + '!', W / 2, this._tierSize({ phone: 200, tablet: 220, desktop: 240 }), this._tierSize({ phone: 20, tablet: 22, desktop: 24 }), [255, 215, 0]);
        }

        const btnW = this._tierSize({ phone: Math.min(280, W - 48), tablet: 320, desktop: 280 });
        const btnH = this._tierSize({ phone: 58, tablet: 65, desktop: 72 });
        const btnX = W / 2 - btnW / 2;
        const startY = this._tierSize({ phone: 240, tablet: 270, desktop: 310 });
        const gap = this._tierSize({ phone: 16, tablet: 20, desktop: 24 });

        this._addRect(btnX, startY, btnW, btnH, [255, 80, 80], 14);
        this._addText('START GAME', W / 2, startY + btnH / 2 + 2, this._tierSize({ phone: 26, tablet: 29, desktop: 32 }), [255, 255, 255]);
        this._addClickable(btnX, startY, btnW, btnH, () => {
            if (!this.playerProfile.hasName()) {
                this.k.go('enter-name');
                return;
            }
            this.questionCount = 0;
            this.isBoss = false;
            this.k.go('game');
        });

        const lbY = startY + btnH + gap;
        this._addRect(btnX, lbY, btnW, btnH, [255, 200, 60], 14);
        this._addText('LEADERBOARD', W / 2, lbY + btnH / 2 + 2, this._tierSize({ phone: 24, tablet: 26, desktop: 28 }), [40, 40, 60]);
        this._addClickable(btnX, lbY, btnW, btnH, () => this.k.go('leaderboard'));

        const settingsY = lbY + btnH + gap;
        this._addRect(btnX, settingsY, btnW, btnH, [100, 180, 255], 14);
        this._addText('SETTINGS', W / 2, settingsY + btnH / 2 + 2, this._tierSize({ phone: 26, tablet: 29, desktop: 32 }), [255, 255, 255]);
        this._addClickable(btnX, settingsY, btnW, btnH, () => this.k.go('settings'));

        // ปุ่ม Mute (เปิด/ปิดเสียง)
        const muteSize = 60;
        const muteX = W - muteSize - 20, muteY = 20;
        this._addRect(muteX, muteY, muteSize, muteSize, [60, 60, 90], 8);
        this._addText(this.uiManager.isMuted() ? 'MUTE' : 'SND', muteX + muteSize / 2, muteY + muteSize / 2 + 2, 16, [255, 255, 255]);
        this._addClickable(muteX, muteY, muteSize, muteSize, () => {
            this.uiManager.toggleMute();
            this.sound.enabled = !this.uiManager.isMuted();
            this.k.go('main-menu');
        });

        const hs = this.uiManager.getHighScore();
        if (hs > 0) this._addText('High Score: ' + hs, W / 2, settingsY + btnH + this._tierSize({ phone: 40, tablet: 55, desktop: 70 }), this._tierSize({ phone: 22, tablet: 24, desktop: 26 }), [255, 215, 0]);
    }

    // ====== GAME SCENE ======
    _drawGameScene() {
        this._clearAll();
        this.gameRunning = true;
        this.spawnTimer = 0;
        this.uiManager.reset();
        this.questionCount = 0;
        this.isBoss = false;
        this._showingAnswer = false;

        const W = this.k.width();
        const H = this.k.height();
        const tier = this._getLayoutTier();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 120], 0);

        this.mathGame = new MathGame(this.currentDifficulty);

        const hudY = this._tierSize({ phone: 36, tablet: 44, desktop: 50 });
        const hudSize = this._tierSize({ phone: 20, tablet: 24, desktop: 26 });
        this.scoreTextObj = this._addText('Score: 0', this._tierSize({ phone: 90, tablet: 130, desktop: 160 }), hudY, hudSize, [255, 255, 255]);
        this.livesTextObj = this._addText('Lives: 3', W - this._tierSize({ phone: 90, tablet: 130, desktop: 160 }), hudY, hudSize, [255, 255, 255]);
        this.comboTextObj = this._addText('', W / 2, this._tierSize({ phone: 68, tablet: 76, desktop: 85 }), this._tierSize({ phone: 18, tablet: 20, desktop: 22 }), [255, 215, 0]);
        this.progressTextObj = this._addText('ข้อที่ 0 / 10', W / 2, H - this._tierSize({ phone: 28, tablet: 24, desktop: 20 }), this._tierSize({ phone: 18, tablet: 19, desktop: 20 }), [255, 255, 255]);

        // BACK button (ซ้ายบน)
        const backW = this._tierSize({ phone: 64, tablet: 72, desktop: 70 });
        const backH = this._tierSize({ phone: 32, tablet: 36, desktop: 34 });
        this._addRect(8, 8, backW, backH, [80, 80, 120], 6);
        this._addText('BACK', 8 + backW / 2, 8 + backH / 2 + 2, this._tierSize({ phone: 14, tablet: 15, desktop: 17 }), [255, 255, 255]);
        this._addClickable(8, 8, backW, backH, () => this.k.go('main-menu'));

        // PAUSE button (ขวาบน)
        const pauseW = this._tierSize({ phone: 64, tablet: 68, desktop: 70 });
        const pauseH = this._tierSize({ phone: 32, tablet: 36, desktop: 34 });
        const pauseX = W - pauseW - 8;
        const pauseY = this._tierSize({ phone: 48, tablet: 60, desktop: 70 });
        this._addRect(pauseX, pauseY, pauseW, pauseH, [80, 80, 120], 6);
        this._addText('PAUSE', pauseX + pauseW / 2, pauseY + pauseH / 2 + 2, this._tierSize({ phone: 14, tablet: 15, desktop: 16 }), [255, 255, 255]);
        this._addClickable(pauseX, pauseY, pauseW, pauseH, () => this._togglePause());

        // Mute button
        const muteBtnY = this._tierSize({ phone: 44, tablet: 50, desktop: 55 });
        this._addRect(8, muteBtnY, backW, backH, [60, 60, 90], 6);
        this._addText(this.uiManager.isMuted() ? 'MUTE' : 'SND', 8 + backW / 2, muteBtnY + backH / 2 + 2, this._tierSize({ phone: 12, tablet: 13, desktop: 14 }), [255, 255, 255]);
        this._addClickable(8, muteBtnY, backW, backH, () => {
            this.uiManager.toggleMute();
            this.sound.enabled = !this.uiManager.isMuted();
            this.k.go('game');
        });

        // Tutorial overlay ครั้งแรก
        if (!this.uiManager.hasSeenTutorial()) {
            this._showTutorial();
            this.uiManager.markTutorialSeen();
            // หลังปิด tutorial แล้วค่อยเริ่มเกม
            return;
        }

        this._flashMsg('Get Ready!', 1200);
        setTimeout(() => {
            if (this.gameRunning && !this.uiManager.isPaused()) this._spawnQuestion();
        }, 1000);
        this.k.onUpdate(() => this._gameUpdate());
    }

    _showTutorial() {
        const W = this.k.width();
        const H = this.k.height();
        const tier = this._getLayoutTier();
        // พื้นหลังมืด
        const bg = this._addRect(0, 0, W, H, [0, 0, 0, 180], 0);
        // กล่อง — responsive ตาม tier
        const boxW = this._tierSize({ phone: Math.min(520, W - 40), tablet: 580, desktop: 600 });
        const boxH = this._tierSize({ phone: 300, tablet: 310, desktop: 320 });
        const boxX = W / 2 - boxW / 2, boxY = H / 2 - boxH / 2;
        this._addRect(boxX, boxY, boxW, boxH, [40, 50, 80], 14);
        this._addText('วิธีเล่น', W / 2, boxY + 50, this._tierSize({ phone: 38, tablet: 41, desktop: 44 }), [255, 230, 109]);
        this._addText('ตัวเลขจะตกลงมาจากด้านบน', W / 2, boxY + 120, this._tierSize({ phone: 20, tablet: 22, desktop: 24 }), [255, 255, 255]);
        this._addText('คลิก/แตะคำตอบที่ถูกต้อง', W / 2, boxY + 160, this._tierSize({ phone: 20, tablet: 22, desktop: 24 }), [255, 255, 255]);
        this._addText('ตอบผิดจะเสียชีวิต ตอบถูกติดต่อกันจะได้ Combo!', W / 2, boxY + 200, this._tierSize({ phone: 18, tablet: 20, desktop: 22 }), [255, 200, 100]);
        // ปุ่มเริ่ม
        const okW = 200, okH = 50;
        const okX = W / 2 - okW / 2, okY = boxY + boxH - 70;
        this._addRect(okX, okY, okW, okH, [100, 220, 100], 10);
        this._addText('เริ่มเล่น!', W / 2, okY + okH / 2 + 2, 22, [255, 255, 255]);
        this._addClickable(okX, okY, okW, okH, () => {
            this._clearAll();
            this._drawGameSceneNoTutorial();
        });
    }

    _drawGameSceneNoTutorial() {
        const W = this.k.width();
        const H = this.k.height();
        const tier = this._getLayoutTier();
        this.gameRunning = true;
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 120], 0);
        const hudY = this._tierSize({ phone: 36, tablet: 44, desktop: 50 });
        const hudSize = this._tierSize({ phone: 20, tablet: 24, desktop: 26 });
        this.scoreTextObj = this._addText('Score: 0', this._tierSize({ phone: 90, tablet: 130, desktop: 160 }), hudY, hudSize, [255, 255, 255]);
        this.livesTextObj = this._addText('Lives: 3', W - this._tierSize({ phone: 90, tablet: 130, desktop: 160 }), hudY, hudSize, [255, 255, 255]);
        this.comboTextObj = this._addText('', W / 2, this._tierSize({ phone: 68, tablet: 76, desktop: 85 }), this._tierSize({ phone: 18, tablet: 20, desktop: 22 }), [255, 215, 0]);
        this.progressTextObj = this._addText('ข้อที่ 0 / 10', W / 2, H - this._tierSize({ phone: 28, tablet: 24, desktop: 20 }), this._tierSize({ phone: 18, tablet: 19, desktop: 20 }), [255, 255, 255]);
        const backW = this._tierSize({ phone: 64, tablet: 72, desktop: 70 });
        const backH = this._tierSize({ phone: 32, tablet: 36, desktop: 34 });
        this._addRect(8, 8, backW, backH, [80, 80, 120], 6);
        this._addText('BACK', 8 + backW / 2, 8 + backH / 2 + 2, this._tierSize({ phone: 14, tablet: 15, desktop: 17 }), [255, 255, 255]);
        this._addClickable(8, 8, backW, backH, () => this.k.go('main-menu'));
        const pauseW = this._tierSize({ phone: 64, tablet: 68, desktop: 70 });
        const pauseH = this._tierSize({ phone: 32, tablet: 36, desktop: 34 });
        const pauseX = W - pauseW - 8;
        const pauseY = this._tierSize({ phone: 48, tablet: 60, desktop: 70 });
        this._addRect(pauseX, pauseY, pauseW, pauseH, [80, 80, 120], 6);
        this._addText('PAUSE', pauseX + pauseW / 2, pauseY + pauseH / 2 + 2, this._tierSize({ phone: 14, tablet: 15, desktop: 16 }), [255, 255, 255]);
        this._addClickable(pauseX, pauseY, pauseW, pauseH, () => this._togglePause());
        const muteBtnY = this._tierSize({ phone: 44, tablet: 50, desktop: 55 });
        this._addRect(8, muteBtnY, backW, backH, [60, 60, 90], 6);
        this._addText(this.uiManager.isMuted() ? 'MUTE' : 'SND', 8 + backW / 2, muteBtnY + backH / 2 + 2, this._tierSize({ phone: 12, tablet: 13, desktop: 14 }), [255, 255, 255]);
        this._addClickable(8, muteBtnY, backW, backH, () => {
            this.uiManager.toggleMute();
            this.sound.enabled = !this.uiManager.isMuted();
            this.k.go('game');
        });
        this._flashMsg('Get Ready!', 1200);
        setTimeout(() => {
            if (this.gameRunning && !this.uiManager.isPaused()) this._spawnQuestion();
        }, 1000);
        this.k.onUpdate(() => this._gameUpdate());
    }

    _togglePause() {
        if (!this.gameRunning && !this.uiManager.isPaused()) return;
        const paused = this.uiManager.togglePause();
        if (paused) {
            this._showPauseOverlay();
            try { window.speechSynthesis.cancel(); } catch (e) { }
        } else {
            this._hidePauseOverlay();
        }
    }

    _showPauseOverlay() {
        const W = this.k.width();
        const H = this.k.height();
        const bg = this._addRect(0, 0, W, H, [0, 0, 0, 160], 0);
        const title = this._addText('PAUSED', W / 2, H / 2 - 60, 60, [255, 255, 100]);
        const btnW = 220, btnH = 60;
        const rX = W / 2 - btnW - 20, rY = H / 2 + 10;
        const resumeBtn = this._addRect(rX, rY, btnW, btnH, [100, 220, 100], 12);
        const resumeTxt = this._addText('RESUME', rX + btnW / 2, rY + btnH / 2 + 2, 22, [255, 255, 255]);
        this._addClickable(rX, rY, btnW, btnH, () => this._togglePause());

        const mX = W / 2 + 20, mY = H / 2 + 10;
        const menuBtn = this._addRect(mX, mY, btnW, btnH, [200, 200, 210], 12);
        const menuTxt = this._addText('MENU', mX + btnW / 2, mY + btnH / 2 + 2, 22, [0, 0, 0]);
        this._addClickable(mX, mY, btnW, btnH, () => {
            this.uiManager.paused = false;
            this.k.go('main-menu');
        });
        this.pauseOverlayObjs = [bg, title, resumeBtn, resumeTxt, menuBtn, menuTxt];
    }

    _hidePauseOverlay() {
        for (const obj of this.pauseOverlayObjs) {
            if (obj && obj.destroy) try { obj.destroy(); } catch (e) { }
        }
        this.pauseOverlayObjs = [];
        // ลบ clickables ที่เกี่ยวกับ pause (RESUME, MENU ใน overlay)
        // แบบง่าย: filter เฉพาะที่ยังอยู่ในขอบเขต overlay
        // แต่เนื่องจาก overlay อยู่กลางจอ เรา filter ออกตาม y
        const H = this.k.height();
        this.clickableAreas = this.clickableAreas.filter(a => {
            const inOverlay = (a.y >= H / 2 - 60 && a.y <= H / 2 + 80);
            return !inOverlay;
        });
    }

    _flashMsg(msg, dur) {
        if (this.bossNotifyObj && this.bossNotifyObj.destroy) {
            try { this.bossNotifyObj.destroy(); } catch (e) { }
        }
        this.bossNotifyObj = this._addText(msg, this.k.width() / 2, 360, 52, [255, 255, 100]);
        if (dur) setTimeout(() => {
            if (this.bossNotifyObj && this.bossNotifyObj.destroy) {
                try { this.bossNotifyObj.destroy(); } catch (e) { }
                this.bossNotifyObj = null;
            }
        }, dur);
    }

    _spawnQuestion() {
        if (!this.gameRunning || this.uiManager.isPaused()) return;
        this.questionCount++;
        this.uiManager.questionCount = this.questionCount;
        if (this.questionCount % 10 === 0 && this.questionCount > 0) {
            this._startBossLevel();
            return;
        }
        this._createSingleQuestion();
    }

    _startBossLevel() {
        this.isBoss = true;
        this._flashMsg('BOSS LEVEL!', 2000);
        this.sound.speak('บอสเลเวล');
        const t = Math.random() > 0.5 ? 'rush' : 'multi';
        setTimeout(() => {
            if (!this.gameRunning || this.uiManager.isPaused()) return;
            if (t === 'rush') {
                this._flashMsg('SPEED RUSH!', 1500);
                this._createSingleQuestion();
            } else {
                this._flashMsg('MULTI-TARGET!', 1500);
                this._createMultiQuestion();
            }
        }, 1500);
    }

    _createSingleQuestion() {
        this.multiQuestion = [];
        // ใช้ MathGame แทน _makeQuestion ในตัว
        const challenge = this.mathGame.generateQuestion();
        this.currentQuestion = challenge.text;
        this.correctAnswer = challenge.answer;

        if (this.questionTextObj && this.questionTextObj.destroy) {
            try { this.questionTextObj.destroy(); } catch (e) { }
        }
        this.questionTextObj = this._addText(
            this.currentQuestion,
            this.k.width() / 2,
            this._tierSize({ phone: 110, tablet: 120, desktop: 130 }),
            this._tierSize({ phone: 40, tablet: 46, desktop: 52 }),
            [255, 255, 255]
        );
        this.sound.speak(this.currentQuestion.replace('?', ''));

        // challenge.options มาจาก MathGame.createOptions แล้ว
        this._spawnFallingItems(challenge.options, challenge.answer);
    }

    _createMultiQuestion() {
        this.multiQuestion = [];
        if (this.questionTextObj && this.questionTextObj.destroy) {
            try { this.questionTextObj.destroy(); } catch (e) { }
        }
        this.questionTextObj = null;
        const W = this.k.width();
        for (let i = 0; i < 2; i++) {
            const ch = this.mathGame.generateQuestion();
            this.multiQuestion.push(ch);
            const qx = i === 0 ? W * 0.3 : W * 0.7;
            this._addText(ch.text, qx, 130, 38, [255, 255, 100]);
            // ตัวเลือกน้อยกว่า (3) สำหรับ multi
            const opts = generateOptions(ch.answer, 3, 4);
            this._spawnFallingItems(opts, ch.answer, i);
        }
    }

    _spawnFallingItems(options, correctAnswer, side) {
        const W = this.k.width();
        const itemSize = this._tierSize({ phone: Math.min(72, (W - 48) / 6 - 8), tablet: 90, desktop: 110 });
        const itemHeight = this._tierSize({ phone: 48, tablet: 52, desktop: 60 });
        const gap = this._tierSize({ phone: 8, tablet: 16, desktop: 25 });
        const textSize = this._tierSize({ phone: 22, tablet: 25, desktop: 28 });

        // สีสันหลากหลาย — สุ่มสีต่อเนื่อง
        const COLOR_PALETTE = [
            [255, 107, 107], // แดง
            [78, 205, 196],  // ฟ้า
            [255, 230, 109], // เหลือง
            [107, 203, 119], // เขียว
            [255, 159, 67],  // ส้ม
            [162, 155, 254], // ม่วง
            [255, 105, 180], // ชมพู
            [95, 205, 228],  // ฟ้าอ่อน
        ];

        let spawnAreaX, spawnAreaW;
        if (side !== undefined) {
            spawnAreaX = side === 0 ? 0 : W / 2;
            spawnAreaW = W / 2;
        } else {
            spawnAreaX = 20;
            spawnAreaW = W - 40;
        }

        const totalWidth = options.length * (itemSize + gap) - gap;
        const startX = spawnAreaX + (spawnAreaW - totalWidth) / 2;

        options.forEach((opt, i) => {
            const x = startX + i * (itemSize + gap);
            const isCorrect = parseInt(opt) === parseInt(correctAnswer);
            const startY = -(50 + Math.random() * 200);

            // สุ่มรูปร่าง: rect (50%) หรือ circle (50%)
            const isCircle = Math.random() < 0.5;
            const shape = isCircle ? 'circle' : 'rect';

            // สุ่มสีจาก palette (หมุนวน)
            const shapeColor = COLOR_PALETTE[i % COLOR_PALETTE.length];

            let shapeObj;
            let w = itemSize;
            let h = itemHeight;

            if (isCircle) {
                const radius = Math.min(itemSize, itemHeight) / 2;
                // วงกลมใช้ item size เป็น diameter
                w = radius * 2;
                h = radius * 2;
                // Kaboom circle ใช้ anchor center — สร้างที่ center ของ bounding box
                shapeObj = this._addCircle(x + radius, startY + radius, radius, shapeColor);
            } else {
                const border = Math.random() < 0.4 ? 4 : Math.random() < 0.3 ? 14 : 8;
                shapeObj = this._addRect(x, startY, w, h, shapeColor, border);
            }

            const textObj = this._addText(String(opt), x + w / 2, startY + h / 2 + 2, textSize, [255, 255, 255]);

            // initial horizontal velocity — gentle drift (reduced for stability)
            const vx = (Math.random() - 0.5) * 1.2;

            const fallItem = {
                shapeObj, textObj,
                x, y: startY, w, h,
                value: parseInt(opt),
                isCorrect,
                vx,
                vy: 0,
                bounce: 0.55,
                alive: true, clicked: false,
                side: side !== undefined ? side : -1,
                shape, // 'rect' or 'circle'
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
            };

            this.fallingItems.push(fallItem);

            fallItem.actionFn = () => {
                if (!fallItem.alive) return;
                try { this._onItemClick(fallItem); } catch (err) { console.error(err); }
            };
        });
    }

    _onItemClick(item) {
        if (!this.gameRunning || this.uiManager.isPaused() || this._showingAnswer) return;
        if (item.isCorrect) {
            this.uiManager.onCorrect(10);
            this.questSystem.update(this.uiManager, 'correct');
            this.sound.correct();
            this.sound.speak('ถูกต้อง!');
            this._spawnParticles(item.x + item.w / 2, item.y + item.h / 2, [100, 220, 100]);
            if (item.shapeObj) item.shapeObj.color = this.k.rgb(50, 255, 50);
            setTimeout(() => {
                this._destroyItem(item);
                this._clearFallingItems();
                this._updateHUD();
                this._nextQuestion();
            }, 400);
        } else {
            this.uiManager.onWrong();
            this.questSystem.update(this.uiManager, 'wrong');
            this.sound.wrong();
            this.sound.speak('ผิด!');
            this._shakeItem(item);
            // แสดงคำตอบที่ถูก ก่อนเคลียร์
            this._showCorrectAnswer();
            setTimeout(() => {
                this._destroyItem(item);
                this._clearFallingItems();
                this._updateHUD();
                if (this.uiManager.getLives() <= 0) {
                    this.gameRunning = false;
                    this.isBoss = false;
                    this._showingAnswer = false;
                    this.sound.gameOver();
                    this.k.go('game-over');
                } else {
                    this._nextQuestion();
                }
            }, 1500);
        }
    }

    _showCorrectAnswer() {
        this._showingAnswer = true;
        for (const item of this.fallingItems) {
            if (!item.alive) continue;
            if (item.isCorrect && item.shapeObj) {
                item.shapeObj.color = this.k.rgb(50, 255, 50);
            }
        }
        setTimeout(() => { this._showingAnswer = false; }, 1500);
    }

    _destroyItem(item) {
        item.alive = false;
        if (item.shapeObj && item.shapeObj.destroy) try { item.shapeObj.destroy(); } catch (e) { }
        if (item.textObj && item.textObj.destroy) try { item.textObj.destroy(); } catch (e) { }
    }

    _clearFallingItems() {
        for (let i = this.fallingItems.length - 1; i >= 0; i--) {
            const item = this.fallingItems[i];
            if (!item.alive) { this.fallingItems.splice(i, 1); continue; }
            this._destroyItem(item);
            this.fallingItems.splice(i, 1);
        }
    }

    _nextQuestion() {
        const wasBoss = this.isBoss;
        setTimeout(() => {
            if (wasBoss) this.isBoss = false;
            this._spawnQuestion();
        }, wasBoss ? 500 : 300);
    }

    _shakeItem(item) {
        if (!item.shapeObj) return;
        let count = 0;
        const origX = item.x;
        const shapeOrigX = item.shape === 'circle' ? origX + item.w / 2 : origX;
        const textOrigX = origX + item.w / 2;
        const iv = setInterval(() => {
            if (!item.alive) { clearInterval(iv); return; }
            const offset = count % 2 === 0 ? 8 : -8;
            item.shapeObj.pos.x = shapeOrigX + offset;
            item.textObj.pos.x = textOrigX + offset;
            count++;
            if (count > 6) {
                clearInterval(iv);
                if (item.alive) {
                    item.shapeObj.pos.x = shapeOrigX;
                    item.textObj.pos.x = textOrigX;
                }
            }
        }, 50);
    }

    _spawnParticles(px, py, col) {
        const k = this.k;
        const ps = [];
        for (let i = 0; i < 14; i++) {
            const p = this._addRect(px, py, 7, 7, col, 3);
            const a = (Math.PI * 2 / 14) * i;
            const sp = 3 + Math.random() * 3;
            ps.push({ obj: p, x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 35 });
        }
        const handle = k.onUpdate(() => {
            let alive = false;
            for (const p of ps) {
                if (p.life <= 0) continue;
                alive = true;
                p.x += p.vx; p.y += p.vy; p.vy += 0.2;
                p.obj.pos = k.vec2(p.x, p.y);
                p.life--;
                if (p.life <= 0 && p.obj.destroy) try { p.obj.destroy(); } catch (e) { }
            }
            if (!alive) handle.cancel();
        });
    }

    _updateHUD() {
        if (this.scoreTextObj) this.scoreTextObj.text = 'Score: ' + this.uiManager.getScore();
        if (this.livesTextObj) this.livesTextObj.text = 'Lives: ' + this.uiManager.getLives();
        const c = this.uiManager.getCombo();
        // ใช้ช่องว่างแทน empty string เพื่อป้องกัน Kaboom getImageData error
        if (this.comboTextObj) this.comboTextObj.text = c > 1 ? 'Combo x' + c + '!' : ' ';
        // Progress indicator
        if (this.progressTextObj) {
            const inRound = this.questionCount % 10;
            this.progressTextObj.text = `ข้อที่ ${inRound} / 10`;
        }
    }

    _showPendingAchievement() {
        const a = this.questSystem.popNotification();
        if (!a) return;
        // แสดงแบนเนอร์ achievement ด้านบน
        const W = this.k.width();
        const banner = this._addRect(W / 2 - 200, 110, 400, 50, [255, 200, 0], 8);
        const txt = this._addText('* ' + a.name + ' - ' + a.desc, W / 2, 135, 18, [0, 0, 0]);
        this.sound.levelUp();
        setTimeout(() => {
            if (banner && banner.destroy) try { banner.destroy(); } catch (e) { }
            if (txt && txt.destroy) try { txt.destroy(); } catch (e) { }
        }, 2500);
    }

    _gameUpdate() {
        if (!this.gameRunning || this.uiManager.isPaused()) return;
        const k = this.k;
        const floor = k.height() - 60; // เผื่อ progress bar ด้านล่าง
        const W = k.width();

        for (let i = this.fallingItems.length - 1; i >= 0; i--) {
            const item = this.fallingItems[i];
            if (!item.alive) {
                this.fallingItems.splice(i, 1);
                continue;
            }
            // gravity
            item.vy += 0.15;
            item.y += item.vy;
            // horizontal drift
            item.x += item.vx;

            // Wall bounce — left/right
            if (item.x <= 0) {
                item.x = 0;
                item.vx = Math.abs(item.vx);
            }
            if (item.x + item.w >= W) {
                item.x = W - item.w;
                item.vx = -Math.abs(item.vx);
            }

            // Floor bounce
            if (item.y + item.h >= floor) {
                item.y = floor - item.h;
                item.vy = -item.vy * item.bounce;
                // bounce horizontal too (less energy loss)
                item.vx *= 0.85;
                if (Math.abs(item.vy) < 0.5) {
                    this._destroyItem(item);
                    this.fallingItems.splice(i, 1);
                    continue;
                }
            }

            // friction — slow horizontal over time
            item.vx *= 0.998;

            // Rotation (skip for circles — spinning a circle looks the same)
            if (item.shape !== 'circle') {
                item.rotation += item.vx * 0.8;
                item.shapeObj.angle = item.rotation;
            }

            // Sync position
            // Rect uses topleft anchor, circle uses center anchor
            if (item.shape === 'circle') {
                item.shapeObj.pos.x = item.x + item.w / 2;
                item.shapeObj.pos.y = item.y + item.h / 2;
            } else {
                item.shapeObj.pos.x = item.x;
                item.shapeObj.pos.y = item.y;
            }
            item.textObj.pos.x = item.x + item.w / 2;
            item.textObj.pos.y = item.y + item.h / 2 + 2;
        }

        this._updateHUD();
        this._showPendingAchievement();

        this.spawnTimer++;
        if (this.fallingItems.length === 0 && this.gameRunning && !this._showingAnswer) {
            if (this.spawnTimer > 30) {
                this.spawnTimer = 0;
                this._spawnQuestion();
            }
        }
    }

    // ====== SETTINGS ======
    _drawSettings() {
        this._clearAll();
        const W = this.k.width();
        const H = this.k.height();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 30, 120], 0);
        this._addText('Settings', W / 2, 130, 60, [255, 255, 100]);

        const btnW = 220, btnH = 65;
        const diffConfig = this.config && this.config.difficulty ? this.config.difficulty.levels : null;
        for (let i = 0; i < 3; i++) {
            const d = i + 1;
            const dX = W / 2 - btnW / 2, dY = 220 + i * 95;
            const sel = d === this.currentDifficulty;
            this._addRect(dX, dY, btnW, btnH, sel ? [100, 220, 100] : [120, 120, 160], 12);
            const dLabel = diffConfig ? diffConfig[i].name : ('Difficulty ' + d);
            this._addText(dLabel + (sel ? ' (เลือก)' : ''), W / 2, dY + btnH / 2 + 2, 24, [255, 255, 255]);
            this._addClickable(dX, dY, btnW, btnH, () => {
                this.currentDifficulty = d;
                this.k.go('settings');
            });
        }

        // Mute toggle
        const muteY = 220 + 3 * 95;
        const muted = this.uiManager.isMuted();
        this._addRect(W / 2 - btnW / 2, muteY, btnW, btnH, muted ? [200, 100, 100] : [100, 180, 100], 12);
        this._addText(muted ? 'เสียง: ปิด' : 'เสียง: เปิด', W / 2, muteY + btnH / 2 + 2, 24, [255, 255, 255]);
        this._addClickable(W / 2 - btnW / 2, muteY, btnW, btnH, () => {
            this.uiManager.toggleMute();
            this.sound.enabled = !this.uiManager.isMuted();
            this.k.go('settings');
        });

        const bX = W / 2 - btnW / 2, bY = muteY + 95;
        this._addRect(bX, bY, btnW, btnH, [255, 100, 100], 12);
        this._addText('BACK', W / 2, bY + btnH / 2 + 2, 26, [255, 255, 255]);
        this._addClickable(bX, bY, btnW, btnH, () => this.k.go('main-menu'));

        const nameY = bY + btnH + 20;
        this._addRect(bX, nameY, btnW, btnH, [180, 140, 255], 12);
        this._addText('เปลี่ยนชื่อเล่น', W / 2, nameY + btnH / 2 + 2, 22, [255, 255, 255]);
        this._addClickable(bX, nameY, btnW, btnH, () => this.k.go('enter-name'));
    }

    // ====== GAME OVER ======
    _drawGameOverScene() {
        this._clearAll();
        this.gameRunning = false;
        this.isBoss = false;

        const W = this.k.width();
        const H = this.k.height();
        const tier = this._getLayoutTier();
        this._addBackground();
        this._addRect(0, 0, W, H, [0, 0, 0, 180], 0);

        const diffName = this.leaderboardService
            ? this.leaderboardService.getDifficultyLabel(this.currentDifficulty, this.config)
            : 'ง่าย';

        this._addText('GAME OVER', W / 2, this._tierSize({ phone: 120, tablet: 140, desktop: 160 }), this._tierSize({ phone: 52, tablet: 60, desktop: 68 }), [255, 80, 80]);
        this._addText('Score: ' + this.uiManager.getScore(), W / 2, this._tierSize({ phone: 190, tablet: 220, desktop: 250 }), this._tierSize({ phone: 32, tablet: 37, desktop: 42 }), [255, 255, 255]);
        this._addText('ระดับ: ' + diffName, W / 2, this._tierSize({ phone: 230, tablet: 265, desktop: 300 }), this._tierSize({ phone: 22, tablet: 25, desktop: 28 }), [255, 215, 0]);
        this._addText('Level สูงสุด: ' + this.uiManager.getLevel(), W / 2, this._tierSize({ phone: 265, tablet: 302, desktop: 340 }), this._tierSize({ phone: 22, tablet: 25, desktop: 28 }), [255, 200, 100]);
        this._addText('Max Combo: ' + this.uiManager.getMaxCombo(), W / 2, this._tierSize({ phone: 300, tablet: 340, desktop: 380 }), this._tierSize({ phone: 20, tablet: 22, desktop: 24 }), [255, 200, 100]);

        const rankY = this._tierSize({ phone: 335, tablet: 378, desktop: 420 });
        const rankTextObj = this._addText('กำลังบันทึกคะแนน...', W / 2, rankY, this._tierSize({ phone: 20, tablet: 22, desktop: 24 }), [100, 220, 100]);

        this._submitGameResult().then((rank) => {
            if (rankTextObj) {
                rankTextObj.text = rank
                    ? 'อันดับของคุณ: #' + rank
                    : 'บันทึกคะแนนแล้ว';
            }
        });

        const hs = this.uiManager.getHighScore();
        if (hs > 0) {
            this._addText('High Score: ' + hs, W / 2, this._tierSize({ phone: 370, tablet: 415, desktop: 460 }), this._tierSize({ phone: 20, tablet: 23, desktop: 26 }), [255, 215, 0]);
        }

        const btnW = this._tierSize({ phone: Math.min(240, W - 48), tablet: Math.min(260, W - 48), desktop: 200 });
        const btnH = this._tierSize({ phone: 54, tablet: 57, desktop: 60 });
        const btnY = this._tierSize({ phone: H - 140, tablet: H - 180, desktop: 450 });

        if (tier !== 'desktop') {
            const pX = W / 2 - btnW / 2;
            this._addRect(pX, btnY, btnW, btnH, [100, 220, 100], 12);
            this._addText('เล่นอีกครั้ง', W / 2, btnY + btnH / 2 + 2, 22, [255, 255, 255]);
            this._addClickable(pX, btnY, btnW, btnH, () => {
                this.questionCount = 0; this.isBoss = false; this.k.go('game');
            });
            const mY = btnY + btnH + 12;
            this._addRect(pX, mY, btnW, btnH, [200, 200, 210], 12);
            this._addText('MENU', W / 2, mY + btnH / 2 + 2, 22, [0, 0, 0]);
            this._addClickable(pX, mY, btnW, btnH, () => this.k.go('main-menu'));
        } else {
            const pX = W / 2 - btnW - 20, pY = btnY;
            this._addRect(pX, pY, btnW, btnH, [100, 220, 100], 12);
            this._addText('เล่นอีกครั้ง', pX + btnW / 2, pY + btnH / 2 + 2, 22, [255, 255, 255]);
            this._addClickable(pX, pY, btnW, btnH, () => {
                this.questionCount = 0; this.isBoss = false; this.k.go('game');
            });
            const mX = W / 2 + 20, mY = btnY;
            this._addRect(mX, mY, btnW, btnH, [200, 200, 210], 12);
            this._addText('MENU', mX + btnW / 2, mY + btnH / 2 + 2, 22, [0, 0, 0]);
            this._addClickable(mX, mY, btnW, btnH, () => this.k.go('main-menu'));
        }
    }

    startGame(difficulty) {
        this.currentDifficulty = difficulty || this.currentDifficulty;
        const diff = this._getDiffConfig(this.currentDifficulty);
        this.baseSpawnInterval = diff.spawnInterval || 3000;
        this.questionCount = 0;
        this.isBoss = false;
        this.k.go('game');
    }
}
