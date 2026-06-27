/**
 * PlayerProfile — เก็บชื่อเล่นผู้เล่น
 */

const NAME_KEY = 'mathKidsPlayerName';
const MAX_LEN = 16;
const MIN_LEN = 2;

export class PlayerProfile {
    getName() {
        try {
            return (localStorage.getItem(NAME_KEY) || '').trim();
        } catch (e) {
            return '';
        }
    }

    hasName() {
        return this.getName().length >= MIN_LEN;
    }

    /** @returns {{ ok: boolean, error?: string }} */
    setName(raw) {
        const name = String(raw || '').trim().slice(0, MAX_LEN);
        if (name.length < MIN_LEN) {
            return { ok: false, error: `ชื่อต้องมีอย่างน้อย ${MIN_LEN} ตัวอักษร` };
        }
        if (!/^[\u0E00-\u0E7Fa-zA-Z0-9_\-\s]+$/.test(name)) {
            return { ok: false, error: 'ใช้ได้เฉพาะ ไทย อังกฤษ ตัวเลข _ -' };
        }
        try {
            localStorage.setItem(NAME_KEY, name);
        } catch (e) {
            return { ok: false, error: 'บันทึกชื่อไม่ได้' };
        }
        return { ok: true };
    }

    clearName() {
        try { localStorage.removeItem(NAME_KEY); } catch (e) { }
    }
}
