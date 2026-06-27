/**
 * MathGame — ระบบโจทย์คณิตศาสตร์
 * Extends QuestionEngine
 * Challenge shape: { text, answer, options }
 */

import { QuestionEngine } from '../engine/question-engine.js';

export class MathGame extends QuestionEngine {
    constructor(difficultyLevel = 1) {
        super(difficultyLevel);
        this.type = 'math';
    }

    getNextChallenge() {
        let num1 = this.getRandomNumber();
        let num2 = this.getRandomNumber();
        const ops = this._getOperations();
        const op = ops[Math.floor(Math.random() * ops.length)];

        let answer;
        switch (op) {
            case '+':
                answer = num1 + num2;
                break;
            case '-':
                if (num1 < num2) { const t = num1; num1 = num2; num2 = t; }
                answer = num1 - num2;
                break;
            case '*':
                answer = num1 * num2;
                break;
            default:
                answer = num1 + num2;
        }

        const text = `${num1} ${op} ${num2} = ?`;
        const options = this.createOptions(answer, 6);

        return { text, answer, options };
    }

    checkAnswer(selectedOption) {
        if (!this.currentChallenge) return false;
        return parseInt(selectedOption) === parseInt(this.currentChallenge.answer);
    }

    _getOperations() {
        switch (parseInt(this.difficultyLevel)) {
            case 1: return ['+'];
            case 2: return ['+', '-'];
            case 3: return ['+', '-', '*'];
            default: return ['+'];
        }
    }
}
