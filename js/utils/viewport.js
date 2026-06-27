/**
 * Viewport — มือถือใช้ขนาดคงที่ 720×1280 แล้ว scale ด้วย CSS (เชื่อถือได้กว่า Kaboom stretch)
 */

export const MOBILE_W = 720;
export const MOBILE_H = 1280;

export function isMobileDevice() {
    return window.innerWidth <= 900 || ('ontouchstart' in window && window.innerWidth <= 1024);
}

export function isPortrait() {
    return window.innerHeight >= window.innerWidth;
}

export function isVirtualKeyboardOpen() {
    if (!window.visualViewport) return false;
    return window.visualViewport.height < window.innerHeight * 0.78;
}

/** @returns {{ width, height, scaleMode, cssBg }} */
export function getGameDimensions(config) {
    const portrait = isPortrait();
    const mobile = isMobileDevice();

    if (mobile || portrait) {
        return {
            width: MOBILE_W,
            height: MOBILE_H,
            scaleMode: true,
            cssBg: portrait,
        };
    }

    return {
        width: config?.display?.width || 1280,
        height: config?.display?.height || 720,
        scaleMode: false,
        cssBg: false,
    };
}

/** จัด wrapper + scale ให้เต็มจอ */
export function applyDisplayLayout(dims) {
    const container = document.getElementById('game-container');
    const wrapper = document.getElementById('game-scale');
    const canvas = document.getElementById('gameCanvas');
    if (!container || !wrapper) return;

    if (dims.scaleMode) {
        const scale = Math.min(
            window.innerWidth / dims.width,
            window.innerHeight / dims.height
        );
        wrapper.style.width = `${dims.width}px`;
        wrapper.style.height = `${dims.height}px`;
        wrapper.style.transform = `scale(${scale})`;
        container.classList.add('use-scale');
        container.classList.toggle('mobile-portrait-bg', !!dims.cssBg);
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.left = '0';
            canvas.style.top = '0';
            canvas.style.position = 'absolute';
        }
    } else {
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.transform = 'none';
        container.classList.remove('use-scale', 'mobile-portrait-bg');
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
        }
    }
}
