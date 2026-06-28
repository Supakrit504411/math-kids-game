/**
 * Viewport — จัดการ responsive display แบบ 3 tiers (phone / tablet / desktop)
 * - Phone: scale to fill screen พร้อมแถบว่างถ้า aspect ratio ไม่ตรง
 * - Tablet: scale + letterbox ถ้าจำเป็น
 * - Desktop: native canvas size
 */

export const MOBILE_W = 720;
export const MOBILE_H = 1280;
export const DESKTOP_W = 1280;
export const DESKTOP_H = 720;

/** @returns {'phone'|'tablet'|'desktop'} */
export function getDeviceTier() {
    const w = window.innerWidth;
    const tabletMax = 1200;

    // Phone: narrow screens
    if (w < 768) return 'phone';
    // Desktop: wide non-touch screens
    if (w >= tabletMax && !('ontouchstart' in window)) return 'desktop';
    // Tablet: medium-width or touch-enabled wide screens
    return 'tablet';
}

export function isPortrait() {
    return window.innerHeight >= window.innerWidth;
}

export function isVirtualKeyboardOpen() {
    if (!window.visualViewport) return false;
    return window.visualViewport.height < window.innerHeight * 0.78;
}

/**
 * @returns {{
 *   width: number,
 *   height: number,
 *   scaleMode: boolean,
 *   cssBg: boolean,
 *   tier: 'phone'|'tablet'|'desktop'
 * }}
 */
export function getGameDimensions(config) {
    const tier = getDeviceTier();
    const portrait = isPortrait();
    const cfgW = config?.display?.width || DESKTOP_W;
    const cfgH = config?.display?.height || DESKTOP_H;

    if (tier === 'phone') {
        // Phone: always portrait layout 720x1280
        return {
            width: MOBILE_W,
            height: MOBILE_H,
            scaleMode: true,
            cssBg: portrait,
            tier,
        };
    }

    if (tier === 'tablet') {
        // Tablet: use orientation-aware canvas size
        if (portrait) {
            return {
                width: MOBILE_W,
                height: MOBILE_H,
                scaleMode: true,
                cssBg: true,
                tier,
            };
        }
        return {
            width: cfgW,
            height: cfgH,
            scaleMode: true,
            cssBg: false,
            tier,
        };
    }

    // Desktop: native size, no scale
    return {
        width: cfgW,
        height: cfgH,
        scaleMode: false,
        cssBg: false,
        tier,
    };
}

/**
 * จัด wrapper + scale ให้พอดีกับ viewport
 * - Phone/Tablet: scale to fit พร้อม maintain aspect ratio (contain)
 * - Desktop: no transform
 */
export function applyDisplayLayout(dims) {
    const container = document.getElementById('game-container');
    const wrapper = document.getElementById('game-scale');
    const canvas = document.getElementById('gameCanvas');
    if (!container || !wrapper) return;

    if (dims.scaleMode) {
        const scaleX = window.innerWidth / dims.width;
        const scaleY = window.innerHeight / dims.height;
        // Use contain (fit-inside) so nothing gets cut off
        const scale = Math.min(scaleX, scaleY);

        wrapper.style.width = `${dims.width}px`;
        wrapper.style.height = `${dims.height}px`;
        wrapper.style.transform = `scale(${scale})`;
        container.classList.add('use-scale');
        container.classList.toggle('mobile-portrait-bg', !!(dims.cssBg && dims.tier === 'phone'));

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