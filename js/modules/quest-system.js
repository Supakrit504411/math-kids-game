/**
 * QuestSystem — ระบบความสำเร็จ/ภารกิจ (Achievements)
 * ติดตามความคืบหน้าของผู้เล่นและปลดล็อกเหรียญ
 *
 * หมายเหตุ: ระบบ Boss level จัดการอยู่ใน GameEngine โดยตรง
 * คลาสนี้มีหน้าที่แค่ tracking + แจ้งเตือนเมื่อปลดล็อก achievement
 */

const ACH_KEY = 'mathKidsAchievements';

export class QuestSystem {
    constructor() {
        this.achievements = [
            { id: 'firstCorrect', name: 'เริ่มต้นดี!', desc: 'ตอบถูกครั้งแรก', unlocked: false },
            { id: 'combo5', name: 'มือฉมัง', desc: 'ทำ Combo 5 ติดต่อกัน', unlocked: false },
            { id: 'combo10', name: 'เซียนคณิต', desc: 'ทำ Combo 10 ติดต่อกัน', unlocked: false },
            { id: 'score100', name: 'ร้อยคะแนน', desc: 'ทำคะแนนถึง 100', unlocked: false },
            { id: 'score500', name: 'ห้าร้อยคะแนน', desc: 'ทำคะแนนถึง 500', unlocked: false },
            { id: 'bossBeaten', name: 'ปราบบอส', desc: 'ผ่าน Boss Level สำเร็จ', unlocked: false },
            { id: 'level5', name: 'เลเวล 5', desc: 'เลื่อนเลเวลถึง 5', unlocked: false },
            { id: 'noMistake', name: 'ไร้ที่ติ', desc: 'ตอบถูก 10 ข้อติด', unlocked: false },
        ];
        this._load();
        this.pendingNotifications = [];
    }

    /** อัปเดตสถานะจาก UIManager — เรียกหลัง onCorrect/onWrong */
    update(uiManager, event) {
        const newlyUnlocked = [];
        const check = (id, cond) => {
            const a = this.achievements.find(x => x.id === id);
            if (a && !a.unlocked && cond) {
                a.unlocked = true;
                newlyUnlocked.push(a);
            }
        };

        check('firstCorrect', uiManager.getCorrectCount() >= 1);
        check('combo5', uiManager.getCombo() >= 5);
        check('combo10', uiManager.getCombo() >= 10);
        check('score100', uiManager.getScore() >= 100);
        check('score500', uiManager.getScore() >= 500);
        check('level5', uiManager.getLevel() >= 5);
        check('noMistake', uiManager.getCorrectCount() >= 10 && uiManager.getWrongCount() === 0);
        if (event === 'bossCleared') check('bossBeaten', true);

        if (newlyUnlocked.length > 0) {
            this._save();
            this.pendingNotifications.push(...newlyUnlocked);
        }
        return newlyUnlocked;
    }

    /** ดึงการแจ้งเตือนที่ค้างอยู่ (เรียกจาก game loop เพื่อแสดง) */
    popNotification() {
        return this.pendingNotifications.shift() || null;
    }

    getUnlocked() {
        return this.achievements.filter(a => a.unlocked);
    }

    getAll() {
        return this.achievements;
    }

    _load() {
        try {
            const raw = localStorage.getItem(ACH_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (Array.isArray(saved)) {
                saved.forEach(s => {
                    const a = this.achievements.find(x => x.id === s.id);
                    if (a) a.unlocked = !!s.unlocked;
                });
            }
        } catch (e) { }
    }

    _save() {
        try {
            localStorage.setItem(ACH_KEY, JSON.stringify(
                this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked }))
            ));
        } catch (e) { }
    }
}
