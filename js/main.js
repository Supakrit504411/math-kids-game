/**
 * Main Entry Point
 * โหลด Kaboom.js และเริ่มเกม
 */

import { GameEngine } from './engine/game-engine.js';
import {
    getGameDimensions,
    applyDisplayLayout,
    isVirtualKeyboardOpen,
    isPortrait,
} from './utils/viewport.js';

async function init() {
    const kaboomModule = await import('https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs');
    const kaboom = kaboomModule.default;

    const config = await loadConfig();
    const canvas = document.getElementById('gameCanvas');
    const scaleRoot = document.getElementById('game-scale');
    const dims = getGameDimensions(config);

    applyDisplayLayout(dims);

    const k = kaboom({
        width: dims.width,
        height: dims.height,
        canvas,
        root: scaleRoot || document.body,
        stretch: !dims.scaleMode,
        letterbox: false,
        crisp: false,
        pixelDensity: dims.scaleMode ? 1 : Math.min(window.devicePixelRatio || 1, 2),
        background: dims.cssBg ? [0, 0, 0, 0] : [102, 126, 234],
        globals: true,
        font: 'kanit',
    });

    k.loadFont('kanit', 'assets/fonts/Kanit-Regular.ttf');
    k.loadSprite('bg', 'assets/bg.png');
    k.loadSprite('bg-mobile', 'assets/bg-mobile.png');

    await waitKaboomLoad(k);

    document.querySelectorAll('canvas').forEach((c) => {
        if (c !== canvas) c.remove();
    });

    applyDisplayLayout(dims);

    const gameEngine = new GameEngine();
    gameEngine.setConfig(config);
    gameEngine.setDisplayMode(dims);
    gameEngine.sound.enabled = !gameEngine.uiManager.isMuted();
    gameEngine.markAssetsReady();
    window.gameEngine = gameEngine;
    gameEngine.initContext(k, canvas);

    let wasPortrait = isPortrait();

    const refreshLayout = (redrawScene = false) => {
        const nextDims = getGameDimensions(config);
        applyDisplayLayout(nextDims);
        gameEngine.setDisplayMode(nextDims);

        const nowPortrait = isPortrait();
        const orientationChanged = nowPortrait !== wasPortrait;
        wasPortrait = nowPortrait;

        if (
            redrawScene &&
            orientationChanged &&
            !isVirtualKeyboardOpen() &&
            gameEngine.shouldRedrawOnResize?.()
        ) {
            gameEngine.onViewportResize?.();
        }
    };

    k.onResize(() => refreshLayout(true));
    window.addEventListener('orientationchange', () => {
        setTimeout(() => refreshLayout(true), 350);
    });
    window.addEventListener('resize', () => applyDisplayLayout(getGameDimensions(config)));

    console.log('Math Kids Game Ready!', `${dims.width}x${dims.height}`, dims.scaleMode ? 'scale-mode' : 'stretch');
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
