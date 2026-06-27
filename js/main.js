/**
 * Main Entry Point
 * เชื่อมต่อทุกส่ว่นเขาด้วนกน
 */

import kaboom from 'https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs';
import { GameEngine } from './engine/game-engine.js';

// ============================================
// State
// ============================================
const state = {
    difficulty: 1,
    multiplayer: false,
    settings: {
        bgmVolume: 0.5,
        sfxVolume: 0.7,
        itemSpeed: 'normal',
    },
};

// ============================================
// DOM Elements
// ============================================
const screens = {
    menu: document.getElementById('menuScreen'),
    game: document.getElementById('gameScreen'),
    boss: document.getElementById('bossScreen'),
    settings: document.getElementById('settingsScreen'),
    gameOver: document.getElementById('gameOverScreen'),
};

// ============================================
// Initialize
// ============================================
async function init() {
    // Load config
    const config = await loadConfig();
    
    // Create game engine
    window.gameEngine = new GameEngine(kaboom);
    await window.gameEngine.init({
        ...config,
        multiplayer: state.multiplayer,
    });

    // Setup UI handlers
    setupUIHandlers();
    
    console.log('🎮 Math Kids Game Ready!');
}

/**
 * โหลด game-config.json
 */
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
        difficulty: { levels: [{ maxNumber: 10, spawnInterval: 3000 }] },
        gameplay: {
            startingLives: 3,
            pointsPerCorrect: 10,
        },
        audio: { bgmVolume: 0.5, sfxVolume: 0.7 },
    };
}

// ============================================
// UI Handlers
// ============================================
function setupUIHandlers() {
    // Start button
    document.getElementById('btnStart').addEventListener('click', () => {
        startGame();
    });

    // Settings button
    document.getElementById('btnSettings').addEventListener('click', () => {
        showScreen('settings');
    });

    // Back from settings
    document.getElementById('btnBackFromSettings').addEventListener('click', () => {
        showScreen('menu');
    });

    // Restart button
    document.getElementById('btnRestart').addEventListener('click', () => {
        restartGame();
    });

    // Menu button
    document.getElementById('btnMenu').addEventListener('click', () => {
        showScreen('menu');
        if (window.gameEngine) {
            window.gameEngine.stopGame();
        }
    });

    // Difficulty buttons
    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = parseInt(btn.dataset.diff);
        });
    });

    // Volume sliders
    document.getElementById('bgmVolume').addEventListener('input', (e) => {
        state.settings.bgmVolume = e.target.value / 100;
    });

    document.getElementById('sfxVolume').addEventListener('input', (e) => {
        state.settings.sfxVolume = e.target.value / 100;
    });

    // Item speed selector
    document.getElementById('itemSpeed').addEventListener('change', (e) => {
        state.settings.itemSpeed = e.target.value;
        updateFallSpeed(e.target.value);
    });

    // Multiplayer toggle
    document.getElementById('mpToggle').addEventListener('change', (e) => {
        state.multiplayer = e.target.checked;
    });
}

// ============================================
// Screen Management
// ============================================
function showScreen(screenName) {
    Object.values(screens).forEach(s => s && s.classList.remove('active'));
    
    switch (screenName) {
        case 'menu':
            screens.menu.classList.add('active');
            break;
        case 'game':
            screens.game.classList.add('active');
            break;
        case 'boss':
            screens.boss.classList.add('active');
            break;
        case 'settings':
            screens.settings.classList.add('active');
            break;
        case 'gameOver':
            screens.gameOver.classList.add('active');
            break;
    }
}

// ============================================
// Game Control
// ============================================
function startGame() {
    showScreen('game');
    if (window.gameEngine) {
        window.gameEngine.startGame(state.difficulty);
    }
}

function restartGame() {
    showScreen('game');
    if (window.gameEngine) {
        window.gameEngine.startGame(state.difficulty);
    }
}

function updateFallSpeed(speed) {
    // Map speed setting to fall velocity
    const speeds = { slow: 100, normal: 150, fast: 250 };
    // This would be passed to FallingItem module
    console.log('Item speed set to:', speeds[speed]);
}

// ============================================
// Boot
// ============================================
init();
