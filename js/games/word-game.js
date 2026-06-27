/**
 * WordGame — ระบบคำศัพท์
 * Extends QuestionEngine
 * Challenge shape: { text, answer, options }
 */

import { QuestionEngine } from '../engine/question-engine.js';
import { shuffleArray } from '../utils/helpers.js';

export class WordGame extends QuestionEngine {
    constructor(difficultyLevel = 1) {
        super(difficultyLevel);
        this.type = 'word';
        this.wordBank = this._getDefaultWords();
    }

    _getDefaultWords() {
        return [
            { word: 'ดอกไม้', hint: 'สิ่งสวยงามที่มีสีต่างๆ' },
            { word: 'แมว', hint: 'สัตว์เลี้ยงตัวเล็ก' },
            { word: 'โรงเรียน', hint: 'ที่เรียนหนังสือ' },
            { word: 'หนังสือ', hint: 'มีหน้ากระดาษอ่านได้' },
            { word: 'ผลไม้', hint: 'กินอร่อย มีวิตามิน' },
        ];
    }

    getNextChallenge() {
        const entry = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
        const correct = entry.word;
        const options = this._generateWordOptions(correct);

        return {
            text: `คำใดถูกต้อง?\nคำใบ้: ${entry.hint}`,
            answer: correct,
            options,
        };
    }

    checkAnswer(selectedOption) {
        if (!this.currentChallenge) return false;
        return selectedOption === this.currentChallenge.answer;
    }

    _generateWordOptions(correct) {
        const options = new Set([correct]);
        // สร้างคำหลอกโดยสลับตัวอักษร
        const chars = correct.split('');
        let safety = 0;
        while (options.size < 5 && safety < 30) {
            safety++;
            const shuffled = shuffleArray(chars).join('');
            if (shuffled !== correct) options.add(shuffled);
        }
        // ถ้าสลับไม่ได้ผล ใช้คำอื่นใน bank
        if (options.size < 5) {
            for (const w of this.wordBank) {
                if (w.word !== correct) options.add(w.word);
                if (options.size >= 5) break;
            }
        }
        return shuffleArray([...options]).slice(0, 5);
    }
}
