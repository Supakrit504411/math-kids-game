/**
 * Main Entry Point
 * โหลด Kaboom.js และเริ่มเกม
 */

import { GameEngine } from './engine/game-engine.js';

/** ขนาด logical ของเกม — มือถือแนวตั้งใช้ 720x1280 เพื่อ layout ที่เหมาะกับจอ */
function getGameDimensions(config) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isPortrait = vh > vw;
    const isMobile = vw <= 900 || 'ontouchstart' in window;

    if (isMobile && isPortrait) {
        return { width: 720, height: 1280 };
    }
    return {
        width: config.display?.width || 1280,
        height: config.display?.height || 720,
    };
}

async function init() {
    const kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs');
    const kaboom = kaboomModule.default;

    const config = await loadConfig();
    const canvas = document.getElementById('gameCanvas');
    const root = document.getElementById('game-container');
    const dims = getGameDimensions(config);

    const k = kaboom({
        width: dims.width,
        height: dims.height,
        canvas,
        root: root || document.body,
        stretch: true,
        letterbox: false,
        crisp: false,
        background: [102, 126, 234],
        globals: true,
        font: 'kanit',
    });

    // ลงทะเบียน assets ก่อน — ต้องรอ onLoad ก่อนสร้าง text (โดยเฉพาะภาษาไทย)
    k.loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf');
    k.loadSprite('bg', 'assets/bg.png');

    await waitKaboomLoad(k);

    const gameEngine = new GameEngine();
    gameEngine.setConfig(config);
    gameEngine.sound.enabled = !gameEngine.uiManager.isMuted();
    gameEngine.markAssetsReady();
    window.gameEngine = gameEngine;
    gameEngine.initContext(k, canvas);

    // รีเฟรช layout เมื่อหมุนจอ / resize (มือถือ)
    k.onResize(() => {
        gameEngine.onViewportResize?.();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => gameEngine.onViewportResize?.(), 150);
    });

    console.log('Math Kids Game Ready!', `${dims.width}x${dims.height}`);
}

/** รอจน Kaboom โหลด font + sprite เสร็จ */
function waitKaboomLoad(k) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            resolve();
        };
        k.onLoad(finish);
        // สำรอง: ถ้าโหลดเสร็จแล้วหรือ onLoad ไม่ fire
        setTimeout(finish, 5000);
    });
}

async function loadConfig() {
    try {
        const response = await fetch('config/game-config.json');
        return await response.json();
    } catch (error) {
        console.warn('Using default config:', error);
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        display: { width: 1280, height: 720 },
        difficulty: {
            levels: [
                { name: 'ง่าย', maxNumber: 10, operations: ['+'], spawnInterval: 3000 },
                { name: 'ปานกลาง', maxNumber: 20, operations: ['+', '-'], spawnInterval: 2500 },
                { name: 'ยาก', maxNumber: 50, operations: ['+', '-', '*'], spawnInterval: 2000 },
            ],
        },
        gameplay: {
            startingLives: 3,
            pointsPerCorrect: 10,
        },
        audio: { bgmVolume: 0.5, sfxVolume: 0.7 },
    };
}

init();
