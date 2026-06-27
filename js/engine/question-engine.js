/**
 * QuestionEngine — Base Class
 * ทุกเกมต้อง extend คลาสนี้
 * Challenge shape มาตรฐาน: { text, answer, options }
 */

import { generateOptions, getRandomInt } from '../utils/helpers.js';

export class QuestionEngine {
    constructor(difficultyLevel) {
        this.difficultyLevel = difficultyLevel || 1;
        this.type = 'abstract';
        this.currentChallenge = null;
        this.totalQuestionsAnswered = 0;
        this.correctAnswers = 0;
    }

    /** ต้อง override ใน subclass — คืน { text, answer, options } */
    getNextChallenge() {
        throw new Error('getNextChallenge() must be implemented by subclass');
    }

    /** ต้อง override ใน subclass */
    checkAnswer(selectedOption) {
        throw new Error('checkAnswer() must be implemented by subclass');
    }

    generateQuestion() {
        this.currentChallenge = this.getNextChallenge();
        this.totalQuestionsAnswered++;
        return this.currentChallenge;
    }

    validateAnswer(selectedOption) {
        const isCorrect = this.checkAnswer(selectedOption);
        if (isCorrect) this.correctAnswers++;
        return isCorrect;
    }

    /** สร้างตัวเลือกคำตอบ (รวมคำตอบที่ถูก) */
    createOptions(correctAnswer, count = 6) {
        return generateOptions(parseInt(correctAnswer), count, this._getOptionRange());
    }

    _getOptionRange() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return 5;
            case 2: return 10;
            case 3: return 20;
            default: return 5;
        }
    }

    getRandomNumber() {
        return getRandomInt(1, this._getMaxNumber());
    }

    _getMaxNumber() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return 10;
            case 2: return 20;
            case 3: return 50;
            default: return 10;
        }
    }

    setDifficulty(level) {
        this.difficultyLevel = level;
    }

    resetStats() {
        this.totalQuestionsAnswered = 0;
        this.correctAnswers = 0;
        this.currentChallenge = null;
    }

    getAccuracy() {
        if (this.totalQuestionsAnswered === 0) return 0;
        return Math.round((this.correctAnswers / this.totalQuestionsAnswered) * 100);
    }
}
