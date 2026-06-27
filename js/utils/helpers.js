/**
 * Utility Helper Functions
 * ฟังก์ชันช่วย เช่น สุ่มตัวเลข, แปลงเสียง, Timer
 */

/**
 * สุ่มจำนวนเต็มระหว่าง min ถึง max (รวม)
 */
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * สุ่มอาร์เรย์ — คืนค่า elemenที่สุ่มมา 1 ตัว
 */
export function randomFrom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * สร้างตัวเลือกคำตอบหลอก (wrong answers)
 * @param {number} correct - คำตอบที่ถูก
 * @param {number} count - จำนวนตัวเลือกที่ต้องการ (รวมถูกด้วย)
 * @param {number} range - ช่วงห่างของตัวเลขหลอก
 */
export function generateOptions(correct, count = 5, range = 5) {
    const options = new Set();
    options.add(correct);

    while (options.size < count) {
        let wrong;
        const sign = Math.random() > 0.5 ? 1 : -1;
        wrong = correct + (getRandomInt(1, range) * sign);
        if (wrong !== correct && wrong >= 0) {
            options.add(wrong);
        }
    }

    return shuffleArray([...options]);
}

/**
 * สลับลำดับอาร์เรย์ (Fisher-Yates Shuffle)
 */
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * แบ่งคำเป็นพยางค์ (ง่าย ๆ — ใช้เครื่องหมาย '-')
 */
export function splitWord(word) {
    return word.split('-');
}

/**
 * Timer class สำหรับจับเวลา
 */
export class Timer {
    constructor() {
        this._startTime = 0;
        this._elapsed = 0;
        this._paused = false;
    }

    start() {
        this._startTime = performance.now();
        this._paused = false;
        return this;
    }

    pause() {
        if (!this._paused) {
            this._elapsed += performance.now() - this._startTime;
            this._paused = true;
        }
        return this;
    }

    resume() {
        if (this._paused) {
            this._startTime = performance.now();
            this._paused = false;
        }
        return this;
    }

    reset() {
        this._startTime = 0;
        this._elapsed = 0;
        this._paused = false;
        return this;
    }

    getElapsed() {
        if (this._paused) return this._elapsed;
        return performance.now() - this._startTime + this._elapsed;
    }

    getSeconds() {
        return this.getElapsed() / 1000;
    }

    /**
     * รอเป็นเวลา ms แล้วเรียก callback
     */
    static delay(ms, callback) {
        return setTimeout(callback, ms);
    }

    static clear(timerId) {
        clearTimeout(timerId);
    }
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format เวลาจากวินาที เป็น MM:SS
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Lerp (Linear Interpolation)
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}
