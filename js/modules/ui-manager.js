/**
 * UIManager Module
 * จัดการ Score, Lives, Level Up, Combo, Mute, Pause
 */

const HS_KEY = 'mathKidsHighScore';
const MUTE_KEY = 'mathKidsMuted';
const TUT_KEY = 'mathKidsTutorialSeen';

export class UIManager {
    constructor() {
        this.reset();
        this.highScore = this._loadHighScore();
        this.muted = this._loadMuted();
        this.tutorialSeen = this._loadTutorialSeen();
    }

    reset() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.questionCount = 0;
        this.paused = false;
        this.bossThreshold = 10;
    }

    nextQuestion() {
        this.questionCount++;
    }

    getProgressInRound() {
        // 0..1 ภายในรอบ 10 ข้อก่อน boss
        const idx = this.questionCount % this.bossThreshold;
        return idx === 0 ? 1 : idx / this.bossThreshold;
    }

    onCorrect(points) {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.correctCount++;
        const comboBonus = this.combo > 2 ? this.combo * 2 : 0;
        this.score += points + comboBonus;
        this._checkLevelUp();
    }

    onWrong() {
        this.combo = 0;
        this.wrongCount++;
        this.lives--;
        if (this.lives <= 0) this.onGameOver();
    }

    levelUp() {
        this.level++;
        this.combo = 0;
    }

    onGameOver() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this._saveHighScore();
        }
    }

    togglePause() {
        this.paused = !this.paused;
        return this.paused;
    }

    toggleMute() {
        this.muted = !this.muted;
        this._saveMuted();
        return this.muted;
    }

    markTutorialSeen() {
        this.tutorialSeen = true;
        try { localStorage.setItem(TUT_KEY, '1'); } catch (e) { }
    }

    _checkLevelUp() {
        const threshold = this.level * 50;
        if (this.score >= threshold) this.levelUp();
    }

    _loadHighScore() {
        try { return parseInt(localStorage.getItem(HS_KEY)) || 0; } catch (e) { return 0; }
    }

    _saveHighScore() {
        try { localStorage.setItem(HS_KEY, String(this.score)); } catch (e) { }
    }

    _loadMuted() {
        try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
    }

    _saveMuted() {
        try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch (e) { }
    }

    _loadTutorialSeen() {
        try { return localStorage.getItem(TUT_KEY) === '1'; } catch (e) { return false; }
    }

    getScore() { return this.score; }
    getLives() { return this.lives; }
    getLevel() { return this.level; }
    getCombo() { return this.combo; }
    getCorrectCount() { return this.correctCount; }
    getWrongCount() { return this.wrongCount; }
    getMaxCombo() { return this.maxCombo; }
    getHighScore() { return this.highScore; }
    getQuestionCount() { return this.questionCount; }
    isMuted() { return this.muted; }
    isPaused() { return this.paused; }
    hasSeenTutorial() { return this.tutorialSeen; }
}
