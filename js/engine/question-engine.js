/**
 * QuestionEngine — Abstract Base Class
 * ทุกเกมต้อง extend คลาสนี้ เพื่อกำหนดกฎเฉพาะเกม
 */

import { generateOptions, getRandomInt } from '../utils/helpers.js';

export abstract class QuestionEngine {
    constructor(difficultyLevel = 1) {
        this.difficultyLevel = difficultyLevel;
        this.type = 'abstract';
        this.currentChallenge = null;
        this.totalQuestionsAnswered = 0;
        this.correctAnswers = 0;
    }

    /**
     * Abstract method — เกมตางๆ ต้อง override
     * สร้ง challenge (โจทย์ + ตัวเลือก) ใหม่
     */
    abstract getNextChallenge(): object;

    /**
     * Abstract method — เกมตางๆ ต้อง override
     * ตรวจสอบคำตอบ
     */
    abstract checkAnswer(selectedOption: string): boolean;

    /**
     * สร้งโจทย์ใหม่อัตโนมัติตามความยาก
     */
    generateQuestion() {
        this.currentChallenge = this.getNextChallenge();
        this.totalQuestionsAnswered++;
        return this.currentChallenge;
    }

    /**
     * ตรวจสอบคำตอบ และอัปเดตสถิต
     */
    validateAnswer(selectedOption) {
        const isCorrect = this.checkAnswer(selectedOption);
        if (isCorrect) {
            this.correctAnswers++;
        }
        return isCorrect;
    }

    /**
     * สร้งตัวเลือกคำตอบ
     */
    createOptions(correctAnswer) {
        const count = 5;
        return generateOptions(parseInt(correctAnswer), count, this._getOptionRange());
    }

    /**
     * ช่วงห่างของตัวเลขหลอก (ปรับตามความยาก)
     */
    _getOptionRange() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return 5;
            case 2: return 10;
            case 3: return 20;
            default: return 5;
        }
    }

    /**
     * สุ่มตัวเลขวั่ว
     */
    getRandomNumber() {
        const maxNum = this._getMaxNumber();
        return getRandomInt(1, maxNum);
    }

    _getMaxNumber() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return 10;
            case 2: return 20;
            case 3: return 50;
            default: return 10;
        }
    }

    /**
     * อัปเดตความยาก
     */
    setDifficulty(level) {
        this.difficultyLevel = level;
    }

    /**
     * รีเซ็ตสถิต
     */
    resetStats() {
        this.totalQuestionsAnswered = 0;
        this.correctAnswers = 0;
        this.currentChallenge = null;
    }

    /**
     * สถิต
     */
    getAccuracy() {
        if (this.totalQuestionsAnswered === 0) return 0;
        return Math.round((this.correctAnswers / this.totalQuestionsAnswered) * 100);
    }
}
