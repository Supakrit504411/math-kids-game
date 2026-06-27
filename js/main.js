/**
 * Main Entry Point
 * โหลด Kaboom.js และเริ่มเกม
 */

import { GameEngine } from './engine/game-engine.js';
import { getGameDimensions, syncCanvasToContainer } from './utils/viewport.js';

async function init() {
    const kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs');
    const kaboom = kaboomModule.default;

    const config = await loadConfig();
    const canvas = document.getElementById('gameCanvas');
    const root = document.getElementById('game-container');
    const dims = getGameDimensions(config);

    syncCanvasToContainer(canvas);

    const k = kaboom({
        width: dims.width,
        height: dims.height,
        canvas,
        root: root || document.body,
        stretch: true,
        letterbox: false,
        crisp: false,
        pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
        background: [102, 126, 234],
        globals: true,
        font: 'kanit',
    });

    k.loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf');
    k.loadSprite('bg', 'assets/bg.png');

    await waitKaboomLoad(k);

    syncCanvasToContainer(canvas);

    // ลบ canvas ซ้ำถ้า Kaboom สร้างเพิ่ม
    document.querySelectorAll('canvas').forEach((c) => {
        if (c !== canvas) c.remove();
    });

    const gameEngine = new GameEngine();
    gameEngine.setConfig(config);
    gameEngine.sound.enabled = !gameEngine.uiManager.isMuted();
    gameEngine.markAssetsReady();
    window.gameEngine = gameEngine;
    gameEngine.initContext(k, canvas);

    const refreshLayout = () => {
        syncCanvasToContainer(canvas);
        gameEngine.onViewportResize?.();
    };

    k.onResize(refreshLayout);
    window.addEventListener('orientationchange', () => setTimeout(refreshLayout, 200));
    window.addEventListener('resize', () => syncCanvasToContainer(canvas));
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', refreshLayout);
    }

    console.log('Math Kids Game Ready!', `${dims.width}x${dims.height}`);
}

function waitKaboomLoad(k) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            resolve();
        };
        k.onLoad(finish);
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
        gameplay: { startingLives: 3, pointsPerCorrect: 10 },
        audio: { bgmVolume: 0.5, sfxVolume: 0.7 },
        leaderboard: { enabled: true, maxEntries: 50 },
    };
}

init();
