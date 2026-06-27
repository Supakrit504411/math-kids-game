/**
 * GameEngine — Main Loop
 * จดัการ Scene, Update, Draw ด้วย Kaboom.js
 */

import { UIManager } from './modules/ui-manager.js';
import { QuestSystem } from './modules/quest-system.js';
import { NetworkManager } from './network.js';
import { Timer } from '../utils/helpers.js';

export class GameEngine {
    constructor(kaboom) {
        this.kaboom = kaboom;
        this.uiManager = new UIManager();
        this.questSystem = new QuestSystem(this.uiManager, this);
        this.network = new NetworkManager();
        this.gameRunning = false;
        this.currentDifficulty = 1;
        this.items = [];
        this.spawnTimer = 0;
        this.baseSpawnInterval = 3000;
        this.lastQuestion = null;
        this.particles = [];
        this.bgColor = { r: 102, g: 126, b: 234 };
    }

    /**
     * เริ่่ตั้นการเงน
     */
    async init(config) {
        this.config = config;
        this.currentDifficulty = 1;

        // Setup Kaboom
        this.kaboom({
            width: config.display?.width || 1280,
            height: config.display?.height || 720,
            stretch: true,
            crisp: false,
            background: [102, 126, 234],
        });

        // Load fonts
        try {
            await this.kaboom.loadFont('Kanit', 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap');
        } catch (e) {
            console.warn('Font load failed, using default');
        }

        // Setup scenes
        this._setupScenes();

        // Setup multiplayer
        if (config.multiplayer) {
            await this.network.initialize(config);
        }

        console.log('🎮 GameEngine initialized');
    }

    /**
     * ตั้่งค่า Scenes ของ Kaboom
     */
    _setupScenes() {
        this.kaboom.scene('main-menu', () => {
            this._drawMainMenu();
        });

        this.kaboom.scene('game', () => {
            this._drawGameScene();
        });

        this.kaboom.scene('game-over', () => {
            this._drawGameOverScene();
        });

        // Go to menu
        this.kaboom.go('main-menu');
    }

    /**
     * หน้าเมนูหลัก
     */
    _drawMainMenu() {
        // Background gradient
        this.kaboom.add([
            this.kaboom.rect(this.kaboom.width, this.kaboom.height),
            this.kaboom.color(102, 126, 234),
            this.kaboom.area(),
            this.kaboom.fixed(),
        ]);

        // Title
        this.kaboom.add([
            this.kaboom.text('🎮 เกมคณิตศาสตร์สนุกๆ', {
                size: 48,
                font: 'Kanit',
            }),
            this.kaboom.pos(this.kaboom.width / 2, 150),
            this.kaboom.anchor('center'),
            this.kaboom.color(255, 255, 255),
        ]);

        // Decorative floating shapes
        this._addDecorativeShapes();
    }

    /**
     * หน้าเกม
     */
    _drawGameScene() {
        this.gameRunning = true;
        this.items = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.uiManager.reset();

        // Background
        this.kaboom.add([
            this.kaboom.rect(this.kaboom.width, this.kaboom.height),
            this.kaboom.color(102, 126, 234),
            this.kaboom.area(),
            this.kaboom.fixed(),
        ]);

        // Score display in canvas
        this.kaboom.add([
            this.kaboom.text(`⭐ ${this.uiManager.getScore()}`, {
                size: 28,
                font: 'Kanit',
            }),
            this.kaboom.pos(20, 20),
            this.kaboom.color(255, 230, 109),
        ]);

        // Lives
        this.kaboom.add([
            this.kaboom.text(`❤️ ${this.uiManager.getLives()}`, {
                size: 28,
                font: 'Kanit',
            }),
            this.kaboom.pos(this.kaboom.width - 120, 20),
            this.kaboom.color(255, 255, 255),
        ]);

        // Level
        this.kaboom.add([
            this.kaboom.text(`📊 ด่าน ${this.uiManager.getLevel()}`, {
                size: 24,
                font: 'Kanit',
            }),
            this.kaboom.pos(this.kaboom.width / 2, 20),
            this.kaboom.anchor('center'),
            this.kaboom.color(255, 255, 255),
        ]);

        // Click/touch handler
        this.kaboom.onClick(async () => {
            if (!this.gameRunning) return;
            await this._handleInput();
        });

        // Generate first question
        this._generateNewQuestion();

        // Update loop
        this.kaboom.onUpdate(() => {
            this._updateGameLoop();
        });
    }

    /**
     * หน้า Game Over
     */
    _drawGameOverScene() {
        this.gameRunning = false;

        // Background
        this.kaboom.add([
            this.kaboom.rect(this.kaboom.width, this.kaboom.height),
            this.kaboom.color(45, 52, 54),
            this.kaboom.area(),
            this.kaboom.fixed(),
        ]);

        // Game Over text
        this.kaboom.add([
            this.kaboom.text('😢 จบเกมแล้ว!', {
                size: 56,
                font: 'Kanit',
            }),
            this.kaboom.pos(this.kaboom.width / 2, 200),
            this.kaboom.anchor('center'),
            this.kaboom.color(255, 107, 107),
        ]);

        // Final score
        this.kaboom.add([
            this.kaboom.text(`${this.uiManager.getScore()}`, {
                size: 80,
                font: 'Kanit',
            }),
            this.kaboom.pos(this.kaboom.width / 2, 320),
            this.kaboom.anchor('center'),
            this.kaboom.color(255, 230, 109),
        ]);

        // Stats
        this.kaboom.add([
            this.kaboom.text(
                `ถูก: ${this.uiManager.getCorrectCount()} | ผิด: ${this.uiManager.getWrongCount()} | สุงสุด: ${this.uiManager.getHighScore()}`,
                { size: 24, font: 'Kanit' }
            ),
            this.kaboom.pos(this.kaboom.width / 2, 420),
            this.kaboom.anchor('center'),
            this.kaboom.color(255, 255, 255),
        ]);

        // Restart button
        const restartBtn = this.kaboom.add([
            this.kaboom.rect(200, 60, { radius: 16 }),
            this.kaboom.color(255, 107, 107),
            this.kaboom.text('🔄 เล่นอีกครั้ง', { size: 24, font: 'Kanit' }),
            this.kaboom.pos(this.kaboom.width / 2 - 120, 520),
            this.kaboom.anchor('center'),
            this.kaboom.area(),
        ]);

        // Menu button
        const menuBtn = this.kaboom.add([
            this.kaboom.rect(200, 60, { radius: 16 }),
            this.kaboom.color(78, 205, 196),
            this.kaboom.text('🏠 เมนูหลัก', { size: 24, font: 'Kanit' }),
            this.kaboom.pos(this.kaboom.width / 2 + 120, 520),
            this.kaboom.anchor('center'),
            this.kaboom.area(),
        ]);

        restartBtn.onClick(() => {
            this.startGame(this.currentDifficulty);
        });

        menuBtn.onClick(() => {
            this.kaboom.go('main-menu');
            document.getElementById('gameOverScreen').classList.remove('active');
            document.getElementById('menuScreen').classList.add('active');
        });
    }

    /**
     * ตกแต่งเมนูด้วยรูปร่างลอย
     */
    _addDecorativeShapes() {
        const colors = [
            this.kaboom.rgb(255, 107, 107),
            this.kaboom.rgb(78, 205, 196),
            this.kaboom.rgb(255, 230, 109),
            this.kaboom.rgb(107, 203, 119),
        ];

        for (let i = 0; i < 8; i++) {
            const shape = this.kaboom.add([
                this.kaboom.circle(20 + Math.random() * 30),
                colors[Math.floor(Math.random() * colors.length)],
                this.kaboom.pos(
                    Math.random() * this.kaboom.width,
                    Math.random() * this.kaboom.height
                ),
                this.kaboom.opacity(0.3),
                this.kaboom.rotate(Math.random() * 360),
            ]);

            // Floating animation
            this.kaboom.onUpdate(() => {
                shape.pos.y -= 10;
                if (shape.pos.y < -50) {
                    shape.pos.y = this.kaboom.height + 50;
                    shape.pos.x = Math.random() * this.kaboom.width;
                }
            });
        }
    }

    /**
     * Game Loop หลัก
     */
    _updateGameLoop() {
        if (!this.gameRunning) return;

        // Spawn timer
        this.spawnTimer += 16; // ~60fps
        
        const interval = this.questSystem.getSpawnInterval(this.baseSpawnInterval);
        
        if (this.spawnTimer >= interval) {
            this.spawnTimer = 0;
            this._generateNewQuestion();
        }

        // Update particles
        this._updateParticles(0.016);
    }

    /**
     * สร้งโจทย์ใหม
     */
    async _generateNewQuestion() {
        // TODO: Load MathGame dynamically
        // For now, use inline generation
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * Math.min(this.currentDifficulty + 1, 3))];
        
        let answer;
        switch (op) {
            case '+': answer = num1 + num2; break;
            case '-':
                if (num1 < num2) [num1, num2] = [num2, num1];
                answer = num1 - num2;
                break;
            case '*': answer = num1 * num2; break;
        }

        const symbol = op === '*' ? '×' : op;
        const question = `${num1} ${symbol} ${num2} = ?`;

        // Generate options
        const options = new Set([answer.toString()]);
        while (options.size < 6) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const wrong = answer + offset;
            if (wrong !== answer && wrong >= 0) {
                options.add(wrong.toString());
            }
        }
        const optionsArr = Array.from(options).sort(() => Math.random() - 0.5);

        this.lastQuestion = {
            question: question,
            correctAnswer: answer.toString(),
            options: optionsArr
        };

        // Update HUD
        document.getElementById('questionText').textContent = question;

        // Broadcast to multiplayer
        if (this.network.isConnected) {
            await this.network.broadcastChallenge(this.lastQuestion);
        }
    }

    /**
     * จัดการ Input (Touch/Click)
     */
    async _handleInput() {
        if (!this.lastQuestion) return;

        // Random correct/wrong for demo (actual implementation uses collision)
        const isCorrect = Math.random() > 0.3;

        if (isCorrect) {
            this._onCorrect();
        } else {
            this._onWrong();
        }
    }

    /**
     * ตอบถุก
     */
    _onCorrect() {
        const multiplier = this.questSystem.getPointsMultiplier();
        const points = 10 * multiplier;
        this.uiManager.onCorrect(points);

        // Create success particles
        this._createExplosion(this.kaboom.width / 2, this.kaboom.height / 2, '#6BCB77');

        // Next question
        this._generateNewQuestion();

        // Check boss
        this.questSystem.checkBossTrigger(
            this.uiManager.getCorrectCount() + this.uiManager.getWrongCount()
        );

        // Broadcast score
        if (this.network.isConnected) {
            this.network.broadcastScore(this.uiManager.getScore());
        }
    }

    /**
     * ตอบผิด
     */
    _onWrong() {
        this.uiManager.onWrong();
        this._createExplosion(this.kaboom.width / 2, this.kaboom.height / 2, '#FF6B6B');

        if (this.uiManager.getLives() <= 0) {
            this._gameOver();
        } else {
            this._generateNewQuestion();
        }
    }

    /**
     * Game Over
     */
    _gameOver() {
        this.gameRunning = false;
        this.uiManager.onGameOver();
        this.kaboom.go('game-over');
        document.getElementById('gameOverScreen').classList.add('active');
        
        this.uiManager.showGameOver();
    }

    /**
     * สร้งอนุภาคระเบิด
     */
    _createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.5) * 400,
                life: 1,
                color: color,
                size: 5 + Math.random() * 10,
            });
        }
    }

    /**
     * อัปเดตอนุภาค
     */
    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Draw particle
            const particle = this.kaboom.add([
                this.kaboom.circle(p.size / 2),
                this.kaboom.color(...this._hexToRgb(p.color)),
                this.kaboom.pos(p.x, p.y),
                this.kaboom.opacity(p.life),
            ]);

            this.kaboom.onDestroy(particle, () => {});
        }
    }

    /**
     * แปลง Hex เป็น RGB
     */
    _hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    /**
     * เริ่่เกม
     */
    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.baseSpawnInterval = [3000, 2500, 2000][difficulty - 1] || 3000;
        this.kaboom.go('game');
        document.getElementById('menuScreen').classList.remove('active');
        document.getElementById('gameOverScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
    }

    /**
     * หยุดเกม
     */
    stopGame() {
        this.gameRunning = false;
        this.items.forEach(item => item.destroy());
        this.items = [];
    }
}
