/**
 * MathGame — ระบบโจทย์คณิตศาสตร์
 * Extends QuestionEngine
 */

import { QuestionEngine } from '../engine/question-engine.js';

export class MathGame extends QuestionEngine {
    constructor(difficultyLevel = 1) {
        super(difficultyLevel);
        this.type = 'math';
    }

    /**
     * สร้างโจทย์ใหม่
     */
    getNextChallenge() {
        const num1 = this.getRandomNumber();
        const num2 = this.getRandomNumber();
        
        let answer, symbol;
        const ops = this._getOperations();

        const opIndex = Math.floor(Math.random() * ops.length);
        const operation = ops[opIndex];

        switch (operation) {
            case '+':
                answer = num1 + num2;
                symbol = '+';
                break;
            case '-':
                if (num1 < num2) [num1, num2] = [num2, num1];
                answer = num1 - num2;
                symbol = '-';
                break;
            case '*':
                answer = num1 * num2;
                symbol = '×';
                break;
            default:
                answer = num1 + num2;
                symbol = '+';
        }

        const options = this.createOptions(answer);

        return {
            question: `${num1} ${symbol} ${num2} = ?`,
            correctAnswer: answer.toString(),
            options: options
        };
    }

    /**
     * ตรวจสอบคำตอบ
     */
    checkAnswer(selectedOption) {
        return selectedOption === this.currentChallenge.correctAnswer;
    }

    /**
     * ได้การดำเนินการตามความยาก
     */
    _getOperations() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return ['+'];
            case 2: return ['+', '-'];
            case 3: return ['+', '-', '*'];
            default: return ['+'];
        }
    }
}
