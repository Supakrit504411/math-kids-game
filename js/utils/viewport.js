/**
 * Viewport helpers — ให้เกมเต็มจอบนมือถือ (aspect ratio ตรง viewport)
 */

export function getContainerSize() {
    const el = document.getElementById('game-container');
    const vv = window.visualViewport;
    const vw = vv?.width || window.innerWidth;
    const vh = vv?.height || window.innerHeight;
    if (el) {
        return {
            width: Math.max(1, el.clientWidth || vw),
            height: Math.max(1, el.clientHeight || vh),
        };
    }
    return { width: Math.max(1, vw), height: Math.max(1, vh) };
}

/** คำนวณ logical size ให้สัดส่วนตรง viewport → ไม่มี letterbox */
export function getGameDimensions(config) {
    const { width: vw, height: vh } = getContainerSize();
    const isPortrait = vh >= vw;
    const isMobile = vw <= 900 || ('ontouchstart' in window && vw <= 1024);

    if (isMobile || isPortrait) {
        const gameW = 720;
        const gameH = Math.max(480, Math.round(gameW * vh / vw));
        return { width: gameW, height: gameH };
    }

    return {
        width: config?.display?.width || 1280,
        height: config?.display?.height || 720,
    };
}

/** บังคับ canvas ขยายเต็ม container (Kaboom อาจ set inline size ไม่ตรง) */
export function syncCanvasToContainer(canvas) {
    if (!canvas) return;
    const { width, height } = getContainerSize();
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.display = 'block';
}
