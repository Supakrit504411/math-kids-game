/**
 * Network Module (Multiplayer Placeholder)
 * เตรียมโครงสร้งการ Sync ระหว่ง 2 เครื่อง
 * ใช Supabase Realtime / Firebase
 */

export class NetworkManager {
    constructor() {
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.remoteScores = {};
        this.remoteChallenge = null;
        this.listeners = {};
        this._supabaseClient = null;
    }

    /**
     * เริ่ต้อน (พร้อม Supabase)
     * TODO: เติ่ Supabase URL และ Key ใน game-config.json
     */
    async initialize(config) {
        // TODO: Import Supabase client
        // import { createClient } from '@supabase/supabase-js';
        // this._supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
        console.log('Network initialized (placeholder)');
        return Promise.resolve();
    }

    /**
     * สร้งห้องเล่น
     */
    async createRoom() {
        this.isHost = true;
        this.roomId = 'room_' + Date.now();
        this.playerId = 'host_' + this.roomId;
        this.isConnected = true;
        
        console.log(`🏠 Created room: ${this.roomId}`);
        this._emit('roomCreated', { roomId: this.roomId, playerId: this.playerId });
        return { roomId: this.roomId, playerId: this.playerId };
    }

    /**
     * เข้าร่วมห้อง
     */
    async joinRoom(roomId) {
        this.isHost = false;
        this.roomId = roomId;
        this.playerId = 'guest_' + Date.now();
        this.isConnected = true;

        console.log(`🤝 Joined room: ${roomId}`);
        this._emit('roomJoined', { roomId: roomId, playerId: this.playerId });
        return true;
    }

    /**
     * ส่งข้อมล Challenge ไปหา Guest
     */
    async broadcastChallenge(challenge) {
        if (!this.isConnected || !this.isHost) return;

        this.remoteChallenge = challenge;
        
        // TODO: Supabase insert
        // await this._supabaseClient
        //     .from('games')
        //     .update({ current_challenge: challenge })
        //     .eq('room_id', this.roomId);

        console.log('📡 Broadcasting challenge:', challenge);
        this._emit('challengeUpdated', challenge);
    }

    /**
     * ส่งคะแนนไป
     */
    async broadcastScore(score) {
        if (!this.isConnected) return;

        this.remoteScores[this.playerId] = score;

        // TODO: Supabase update
        // await this._supabaseClient
        //     .from('games')
        //     .update({ scores: this.remoteScores })
        //     .eq('room_id', this.roomId);

        console.log('📡 Broadcasting score:', score);
        this._emit('scoreUpdated', { playerId: this.playerId, score: score });
    }

    /**
     * รับข้อมลจาก Host (Guest เรียก)
     */
    async syncFromHost() {
        if (this.isHost) return;

        // TODO: Supabase subscribe
        // const { data } = await this._supabaseClient
        //     .from('games')
        //     .select('*')
        //     .eq('room_id', this.roomId)
        //     .single();

        console.log('📥 Synced from host');
    }

    /**
     * Subscribe event
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Emit event
     */
    _emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.isConnected = false;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.remoteScores = {};
        console.log('🔌 Disconnected');
    }

    /**
     * สถานะการเชื่่อมต่อ
     */
    getStatus() {
        return {
            connected: this.isConnected,
            isHost: this.isHost,
            roomId: this.roomId,
            playerId: this.playerId
        };
    }
}
