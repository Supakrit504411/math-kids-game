/**
 * Quest/Boss System Module
 * จดัการระบบบอส: Speed Rush และ Multi-Target
 */

import { getRandomInt } from '../utils/helpers.js';

export class QuestSystem {
    constructor(uiManager, gameEngine) {
        this.uiManager = uiManager;
        this.gameEngine = gameEngine;
        this.isBossActive = false;
        this.bossType = null;
        this.questionsSinceLastBoss = 0;
        this.bossThreshold = 10;
        this.bossTimer = null;
        this.bossDuration = 30;
    }

    /**
     * ตรวจสอบว่าต้องเริ่่มบอสหรอ
     */
    checkBossTrigger(totalAnswered) {
        if (!this.isBossActive && totalAnswered > 0 && totalAnswered % this.bossThreshold === 0) {
            this.startBossBattle();
            return true;
        }
        return false;
    }

    /**
     * เริ่่ม Boss Battle
     */
    startBossBattle() {
        this.isBossActive = true;
        this.bossType = this._randomBossType();
        
        // แสดงหน้า Boss
        this._showBossBanner();

        console.log(`🐉 BOSS BATTLE! Type: ${this.bossType}`);

        // ตั้งเวลาบอส
        this.bossTimer = setTimeout(() => {
            this.endBossBattle();
        }, this.bossDuration * 1000);
    }

    /**
     * สรุ่่มประเภทบอส
     */
    _randomBossType() {
        const types = ['speed-rush', 'multi-target'];
        return types[getRandomInt(0, types.length - 1)];
    }

    /**
     * แสดงแบนเนอร์บอส
     */
    _showBossBanner() {
        const menuScreen = document.getElementById('menuScreen');
        const bossScreen = document.getElementById('bossScreen');
        
        if (menuScreen) menuScreen.classList.remove('active');
        if (bossScreen) bossScreen.classList.add('active');

        // ซ่อนหลัง 2 วินาที
        setTimeout(() => {
            if (bossScreen) bossScreen.classList.remove('active');
        }, 2000);
    }

    /**
     * สิ้นสุดบอส
     */
    endBossBattle() {
        this.isBossActive = false;
        this.bossType = null;
        
        if (this.bossTimer) {
            clearTimeout(this.bossTimer);
            this.bossTimer = null;
        }

        console.log('✅ Boss battle ended!');
    }

    /**
     * ได้ความเร็วบอส (วินาทีก่อนตก)
     */
    getSpawnInterval(baseInterval) {
        if (!this.isBossActive) return baseInterval;

        switch (this.bossType) {
            case 'speed-rush':
                return Math.min(baseInterval / 3, 1000); // เร็วกว่า 3 เท่า
            case 'multi-target':
                return baseInterval; // ปกติ แต่มีหลายโจทย์
            default:
                return baseInterval;
        }
    }

    /**
     * จำนวนโจทย์ที่ควรปรากฏบนหน้าจอ
     */
    getMaxQuestionsOnScreen() {
        if (!this.isBossActive) return 5;
        
        switch (this.bossType) {
            case 'multi-target':
                return 8; // หลายโจทย์พรอมกน
            default:
                return 5;
        }
    }

    /**
     * คะแนนคูณบอส
     */
    getPointsMultiplier() {
        return this.isBossActive ? 3 : 1;
    }

    /**
     * รีเซ็ต
     */
    reset() {
        this.isBossActive = false;
        this.bossType = null;
        this.questionsSinceLastBoss = 0;
        if (this.bossTimer) {
            clearTimeout(this.bossTimer);
            this.bossTimer = null;
        }
    }
}
