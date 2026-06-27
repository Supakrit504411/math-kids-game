/**
 * WordGame — ระบบคำศัพท์ (เตรียมสำหรับอนาคต)
 * Extends QuestionEngine
 * 
 * ใช้งาน: แทนที่ wordBank ด้วย JSON จริง หรอดึงจาก API
 */

import { QuestionEngine } from '../engine/question-engine.js';
import { splitWord, shuffleArray } from '../utils/helpers.js';

export class WordGame extends QuestionEngine {
    constructor(difficultyLevel = 1) {
        super(difficultyLevel);
        this.type = 'word';
        this.wordBank = this._getDefaultWords();
    }

    /**
     * ศูนยคำศัพท์ (แทนที่จะโหลดจาก JSON/AI ในอนาคต)
     */
    _getDefaultWords() {
        return [
            { word: 'ดอกไม้', hint: '🌸 สิ่งสวยงามที่มีสีต่างๆ', syllables: ['ดอก', 'ไม้'] },
            { word: 'แมว', hint: '🐱 สัตว์เลี้ยงตัวเล็ก miaow', syllables: ['แม้ว'] },
            { word: 'โรงเรียน', hint: '🏫 ที่เรียนหนังสือ', syllables: ['เริ่ยน', 'สอน'] },
            { word: 'หนังสือ', hint: '📖 มีหน้ากระดาษอ่านได้', syllables: ['หนั่ง', 'นัง'] },
            { word: 'ผลไม้', hint: '🍎 กินอร่อย มีวิตามิน', syllables: ['ผล', 'ไม้'] },
        ];
    }

    getNextChallenge() {
        const entry = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
        const correctWord = entry.word;
        
        // สรุ่่มผสมคำใหผิด
        const shuffled = this._shuffleSyllables(entry.syllables);
        const options = this._generateWordOptions(shuffled, correctWord);

        return {
            question: 'สะกดคำวา?',
            hint: entry.hint,
            correctAnswer: correctWord,
            options: options
        };
    }

    checkAnswer(selectedOption) {
        return selectedOption === this.currentChallenge.correctAnswer;
    }

    /**
     * สรุ่่มผสมพยางคใหผิด
     */
    _shuffleSyllables(syllables) {
        let attempt;
        do {
            attempt = shuffleArray(syllables);
        } while (attempt.join('') === syllables.join(''));
        return attempt;
    }

    /**
     * สร้งตวัเลือกคำ (ถูก + ผิด)
     */
    _generateWordOptions(shuffled, correct) {
        const options = new Set([correct]);
        
        // เพิ่มคำผิดจากการผสม
        const mixed1 = shuffled.join('');
        if (mixed1 !== correct) options.add(mixed1);

        // สร้างคำผิดเพิ่มเติม
        const extraChars = ['ะ', 'า', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู'];
        for (let i = 0; i < 3; i++) {
            let fake = correct;
            if (fake.length > 2) {
                const idx = Math.floor(Math.random() * (fake.length - 1)) + 1;
                fake = fake.slice(0, idx) + extraChars[Math.floor(Math.random() * extraChars.length)] + fake.slice(idx);
            }
            if (fake !== correct) options.add(fake);
        }

        return shuffleArray([...options].slice(0, 5));
    }
}
