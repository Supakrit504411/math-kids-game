/**
 * UIManager Module
 * จดัการ Score, Lives, Level Up, และ UI อื่นๆ
 */

export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.highScore = this._loadHighScore();
    }

    /**
     * เริ่มเกมใหม่
     */
    reset() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this._updateHUD();
    }

    /**
     * ตอบถุก
     */
    onCorrect(points) {
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        this.correctCount++;

        // Combo bonus
        const comboBonus = this.combo > 2 ? this.combo * 2 : 0;
        this.score += points + comboBonus;

        // Check level up
        this._checkLevelUp();
        this._updateHUD();
    }

    /**
     * ตอบผิด
     */
    onWrong() {
        this.combo = 0;
        this.wrongCount++;
        this.lives--;
        this._updateHUD();

        if (this.lives <= 0) {
            this.onGameOver();
        }
    }

    /**
     * เลื่อนด่าน
     */
    levelUp() {
        this.level++;
        this.combo = 0;
        this._updateHUD();
    }

    /**
     * Game Over
     */
    onGameOver() {
        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this._saveHighScore();
        }
    }

    /**
     * ตรวจสอบเลื่อนด่าน
     */
    _checkLevelUp() {
        const threshold = this.level * 50;
        if (this.score >= threshold) {
            this.levelUp();
        }
    }

    /**
     * อัปเดต HUD บนหน้าจอ
     */
    _updateHUD() {
        const scoreEl = document.getElementById('scoreValue');
        const livesEl = document.getElementById('livesValue');
        const levelEl = document.getElementById('levelValue');
        const comboEl = document.getElementById('comboValue');

        if (scoreEl) scoreEl.textContent = this.score;
        if (livesEl) livesEl.textContent = this.lives;
        if (levelEl) levelEl.textContent = this.level;
        if (comboEl) comboEl.textContent = this.combo;

        // สีเปลี่ยนตาม combo
        if (comboEl) {
            if (this.combo >= 5) {
                comboEl.style.color = '#FFE66D';
            } else if (this.combo >= 3) {
                comboEl.style.color = '#6BCB77';
            } else {
                comboEl.style.color = 'white';
            }
        }

        // สีเปลี่ยนตาม lives
        if (livesEl) {
            if (this.lives <= 1) {
                livesEl.parentElement.style.color = '#FF6B6B';
            } else {
                livesEl.parentElement.style.color = 'white';
            }
        }
    }

    /**
     * แสดงข้อมล Game Over
     */
    showGameOver(callback) {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('correctCount').textContent = this.correctCount;
        document.getElementById('wrongCount').textContent = this.wrongCount;
        document.getElementById('highScore').textContent = this.highScore;

        if (callback) callback();
    }

    /**
     * High Score (localStorage)
     */
    _loadHighScore() {
        try {
            return parseInt(localStorage.getItem('mathKidsHighScore')) || 0;
        } catch {
            return 0;
        }
    }

    _saveHighScore() {
        try {
            localStorage.setItem('mathKidsHighScore', this.score.toString());
        } catch {}
    }

    /**
     * Getter
     */
    getScore() { return this.score; }
    getLives() { return this.lives; }
    getLevel() { return this.level; }
    getCombo() { return this.combo; }
    getCorrectCount() { return this.correctCount; }
    getWrongCount() { return this.wrongCount; }
    getMaxCombo() { return this.maxCombo; }
    getHighScore() { return this.highScore; }
}
