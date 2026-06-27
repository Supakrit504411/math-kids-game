/**
 * FallingItem Module
 * จดัการไอเทมที่ตกลงมา (คำตอบ/คำศัพท์)
 * มี Physics เบาๆ: แรงโน้มถ่วง, กระดอน, หายไป
 */

export class FallingItem {
    constructor(scene, x, y, text, isCorrect) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.text = text;
        this.isCorrect = !!isCorrect;
        this.width = 80;
        this.height = 80;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 800;
        this.bounceFactor = 0.3;
        this.fallSpeed = 150;
        this.alive = true;
        this.opacity = 1;
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.picked = false;
        this.spriteObj = null;
        this.labelObj = null;
    }

    /**
     * สร้งไอเทมในฉาก (Kaboom.js)
     */
    create(color = '#4ECDC4') {
        const obj = this.scene.add({
            pos: vec2(this.x, this.y),
            area: new Area(this.width, this.height),
            circle: true,
            color: color,
            opacity: this.opacity,
            anchor: 'center',
            name: 'falling-item',
        });

        // เพิ่มข้อความ
        const label = this.scene.add(text(this.text, {
            size: 24,
            font: 'bold',
            color: color === '#4ECDC4' ? '#2d3436' : '#fff',
        }), {
            pos: vec2(0, 0),
            anchor: 'center',
        });

        this.spriteObj = obj;
        this.labelObj = label;

        return { sprite: obj, label: label };
    }

    /**
     * อัปเดตสถานะทุก frame
     */
    update(dt) {
        if (!this.alive) return;

        // แกรวิต
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;

        // กระดอนเมื่อบนน
        if (this.y > 600) {
            this.y = 600;
            this.vy *= -this.bounceFactor;
            this.vx *= 0.8;

            // หยุดกระดอนเมื่่อานแรง
            if (Math.abs(this.vy) < 20) {
                this.vy = 0;
                this.opacity -= dt * 0.5;
                if (this.opacity <= 0) {
                    this.destroy();
                }
            }
        }

        // Shake effect
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            this.shakeAmount = 5;
        } else {
            this.shakeAmount = 0;
        }

        // Update Kaboom object position
        if (this.spriteObj) {
            const shakeX = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
            const shakeY = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
            this.spriteObj.pos = vec2(this.x + shakeX, this.y + shakeY);
            this.spriteObj.opacity = this.opacity;
        }
        if (this.labelObj) {
            const shakeX = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
            const shakeY = this.shakeAmount > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
            this.labelObj.pos = vec2(this.x + shakeX, this.y + shakeY);
            this.labelObj.opacity = this.opacity;
        }
    }

    /**
     * ทำลายไอเทม
     */
    destroy() {
        this.alive = false;
        if (this.spriteObj) this.spriteObj.remove();
        if (this.labelObj) this.labelObj.remove();
    }

    /**
     * แสดงเอฟเฟกตการตอบถุก (ระเบิดเปนอนุภาค)
     */
    showSuccessEffect() {
        if (this.spriteObj) {
            this.spriteObj.color = '#6BCB77';
            this.spriteObj.scale = vec2(1.3, 1.3);
        }
        // Fade out
        const fadeOut = setInterval(() => {
            this.opacity -= 0.05;
            if (this.opacity <= 0) {
                clearInterval(fadeOut);
                this.destroy();
            }
        }, 30);
    }

    /**
     * แสดงเอฟเฟกตการตอบผิด (สั่น + สีแดง)
     */
    showErrorEffect() {
        if (this.spriteObj) {
            this.spriteObj.color = '#FF6B6B';
        }
        this.shakeDuration = 0.5;
        
        setTimeout(() => {
            if (this.alive) {
                this.opacity = 0;
                this.destroy();
            }
        }, 400);
    }

    /**
     * เริ่ตกลงมา
     */
    startFalling(speed) {
        this.fallSpeed = speed || 150;
        this.vy = this.fallSpeed;
    }
}
