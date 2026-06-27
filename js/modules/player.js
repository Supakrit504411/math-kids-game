/**
 * Player Module
 * จัดการตัวละครผู้เล่น (Physics, Movement, Animation)
 */

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.speed = 300;
        this.direction = 'right';
        this.isMoving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.touchArea = null;
        this.spriteObj = null;
    }

    /**
     * สร้างตัวละครในฉาก (Kaboom.js)
     */
    create(options = {}) {
        const { sprite = 'character', color = '#FF6B6B' } = options;

        this.spriteObj = this.scene.add({
            pos: vec2(this.x, this.y),
            area: new Area(this.width, this.height),
            color: color,
            anchor: 'center',
            name: 'player',
        });

        return this.spriteObj;
    }

    /**
     * อัปเดตตำแหน่ง (เรียกทุก frame)
     */
    update(dt) {
        this.animTimer += dt;
        if (this.animTimer > 0.15) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }
    }

    /**
     * เคลื่อนที่ไปทางซ้าย
     */
    moveLeft() {
        this.x -= this.speed * 0.016;
        this.direction = 'left';
        this.isMoving = true;
    }

    /**
     * เคลื่อนที่ไปทางขวา
     */
    moveRight() {
        this.x += this.speed * 0.016;
        this.direction = 'right';
        this.isMoving = true;
    }

    /**
     * หยุดเคลื่อนที่
     */
    stop() {
        this.isMoving = false;
    }

    /**
     * ไปยังตำแหน่งที่กำหนด (สำหรับ touch/click)
     */
    moveTo(x, y) {
        this.x = x;
        this.y = y;
        this.isMoving = true;
    }

    /**
     * ตรวจสอบการชนกับวัตถุอื่น
     */
    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.width / 2 + other.width / 2);
    }

    /**
     * ได้ตำแหน่งปัจจุบัน
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * รีเซ็ตตำแหน่ง
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.isMoving = false;
        this.animFrame = 0;
    }
}
