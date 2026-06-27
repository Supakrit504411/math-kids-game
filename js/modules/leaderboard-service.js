/**
 * LeaderboardService — อันดับคะแนน (local + optional cloud)
 * แต่ละรายการ: ชื่อ, คะแนน, ระดับความยาก, level สูงสุด
 */

const LOCAL_KEY = 'mathKidsLeaderboard';
const MAX_LOCAL = 100;

export class LeaderboardService {
    constructor(config) {
        this.config = config?.leaderboard || {};
        this.maxEntries = this.config.maxEntries || MAX_LOCAL;
    }

    _loadLocal() {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (!raw) return [];
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    _saveLocal(entries) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, this.maxEntries)));
        } catch (e) { }
    }

    _sort(entries) {
        return [...entries].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
            return new Date(b.playedAt) - new Date(a.playedAt);
        });
    }

    /** @param {{ playerName, score, difficulty, difficultyName, maxLevel }} entry */
    async submit(entry) {
        const record = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            playerName: entry.playerName,
            score: entry.score,
            difficulty: entry.difficulty,
            difficultyName: entry.difficultyName,
            maxLevel: entry.maxLevel,
            playedAt: new Date().toISOString(),
        };

        const local = this._sort([record, ...this._loadLocal()]);
        this._saveLocal(local);

        if (this.config.supabaseUrl && this.config.supabaseAnonKey) {
            try {
                await this._submitCloud(record);
            } catch (e) {
                console.warn('Cloud leaderboard sync failed:', e);
            }
        }

        return this.getRank(record.score, record.maxLevel, local);
    }

    async _submitCloud(record) {
        const url = `${this.config.supabaseUrl}/rest/v1/${this.config.table || 'leaderboard'}`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: this.config.supabaseAnonKey,
                Authorization: `Bearer ${this.config.supabaseAnonKey}`,
                Prefer: 'return=minimal',
            },
            body: JSON.stringify(record),
        });
    }

    async fetchEntries() {
        let entries = this._loadLocal();

        if (this.config.supabaseUrl && this.config.supabaseAnonKey) {
            try {
                const cloud = await this._fetchCloud();
                entries = this._merge(entries, cloud);
            } catch (e) {
                console.warn('Cloud leaderboard fetch failed:', e);
            }
        }

        return this._sort(entries).slice(0, this.maxEntries);
    }

    async _fetchCloud() {
        const table = this.config.table || 'leaderboard';
        const url = `${this.config.supabaseUrl}/rest/v1/${table}?select=*&order=score.desc,maxLevel.desc&limit=${this.maxEntries}`;
        const res = await fetch(url, {
            headers: {
                apikey: this.config.supabaseAnonKey,
                Authorization: `Bearer ${this.config.supabaseAnonKey}`,
            },
        });
        if (!res.ok) throw new Error('fetch failed');
        return await res.json();
    }

    _merge(a, b) {
        const map = new Map();
        [...a, ...b].forEach((e) => map.set(e.id || `${e.playerName}_${e.playedAt}`, e));
        return [...map.values()];
    }

    getRank(score, maxLevel, entries) {
        const sorted = this._sort(entries || this._loadLocal());
        const idx = sorted.findIndex((e) => e.score === score && e.maxLevel === maxLevel);
        return idx >= 0 ? idx + 1 : sorted.length + 1;
    }

    getDifficultyLabel(level, config) {
        const levels = config?.difficulty?.levels;
        if (levels && levels[level - 1]) return levels[level - 1].name;
        return ['ง่าย', 'ปานกลาง', 'ยาก'][level - 1] || 'ง่าย';
    }
}
