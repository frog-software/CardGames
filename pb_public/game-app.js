/**
 * Main Game Application
 */

class GameApp {
    constructor() {
        this.pb = new PocketBase('http://127.0.0.1:8090');
        this.api = new GameAPIService(this.pb);
        this.currentTableId = null;
        this.currentGameState = null;
        this.selectedCards = [];
        this.botManager = null;
        this.fourColorRuleId = null;
        this.unsubscribers = [];
    }

    async init() {
        // Check if already logged in
        if (this.api.isLoggedIn()) {
            this.showScreen('lobby-screen');
            this.updateUserInfo();
            await this.loadRooms();
        } else {
            this.showScreen('login-screen');
        }

        // Load game rules
        try {
            const rules = await this.api.getGameRules();
            const fourColorRule = rules.find(r => r.logic_file === 'four_color_card.js');
            if (fourColorRule) {
                this.fourColorRuleId = fourColorRule.id;
                this.log(`✓ Found Four Color Card rule: ${fourColorRule.name}`);
            }
        } catch (error) {
            this.log(`✗ Error loading game rules: ${error.message}`, 'error');
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    log(message, type = 'info') {
        const logEl = document.getElementById('game-log');
        if (!logEl) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const div = document.createElement('div');
        div.style.color = type === 'error' ? '#f44' : type === 'success' ? '#4f4' : '#0f0';
        div.textContent = `[${timestamp}] ${message}`;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
        
        console.log(`[${timestamp}] ${message}`);
    }

    // ========== Authentication ==========

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await this.api.login(email, password);
            this.log('✓ Login successful', 'success');
            this.showScreen('lobby-screen');
            this.updateUserInfo();
            await this.loadRooms();
        } catch (error) {
            this.log(`✗ Login failed: ${error.message}`, 'error');
            alert('登录失败 Login failed: ' + error.message);
        }
    }

    async register() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await this.api.register(email, password);
            this.log('✓ Registration successful', 'success');
            this.showScreen('lobby-screen');
            this.updateUserInfo();
            await this.loadRooms();
        } catch (error) {
            this.log(`✗ Registration failed: ${error.message}`, 'error');
            alert('注册失败 Registration failed: ' + error.message);
        }
    }

    logout() {
        this.api.logout();
        this.showScreen('login-screen');
        this.log('✓ Logged out', 'info');
    }

    updateUserInfo() {
        const user = this.api.getCurrentUser();
        if (user) {
            document.getElementById('user-name').textContent = user.email;
        }
    }

    // ========== Lobby ==========

    async loadRooms() {
        try {
            const result = await this.api.getTables(this.fourColorRuleId);
            const rooms = result.items;

            const roomsList = document.getElementById('rooms-list');
            
            if (rooms.length === 0) {
                roomsList.innerHTML = '<p>暂无房间 No rooms available</p>';
            } else {
                roomsList.innerHTML = rooms.map(room => {
                    const rule = room.expand?.rule;
                    const players = room.expand?.players || [];
                    
                    return `
                        <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
                            <strong>${this.escapeHtml(room.name)}</strong>
                            <span class="status-badge status-${room.status}">${room.status}</span>
                            <br>
                            <small>玩家 Players: ${players.length}/4</small>
                            <button onclick="app.joinRoom('${room.id}')" ${room.status !== 'waiting' ? 'disabled' : ''}>
                                加入 Join
                            </button>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            this.log(`✗ Error loading rooms: ${error.message}`, 'error');
        }
    }

    async createRoom() {
        const name = document.getElementById('room-name').value;
        
        if (!name) {
            alert('请输入房间名 Please enter room name');
            return;
        }

        if (!this.fourColorRuleId) {
            alert('游戏规则未加载 Game rule not loaded');
            return;
        }

        try {
            const table = await this.api.createTable(name, this.fourColorRuleId);
            this.log(`✓ Room created: ${name}`, 'success');
            this.currentTableId = table.id;
            await this.enterRoom(table.id);
        } catch (error) {
            this.log(`✗ Error creating room: ${error.message}`, 'error');
            alert('创建房间失败 Failed to create room: ' + error.message);
        }
    }

    async joinRoom(tableId) {
        try {
            await this.api.joinTable(tableId);
            this.log('✓ Joined room', 'success');
            this.currentTableId = tableId;
            await this.enterRoom(tableId);
        } catch (error) {
            this.log(`✗ Error joining room: ${error.message}`, 'error');
            alert('加入房间失败 Failed to join room: ' + error.message);
        }
    }

    async enterRoom(tableId) {
        this.showScreen('game-screen');
        this.currentTableId = tableId;

        // Load table info
        const table = await this.api.getTable(tableId);
        document.getElementById('room-title').textContent = table.name;

        // Subscribe to updates
        this.setupSubscriptions(tableId);

        // Update UI
        await this.updateRoomUI();
    }

    async leaveRoom() {
        if (this.botManager) {
            this.botManager.stopAll();
        }
        
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        if (this.currentTableId) {
            try {
                await this.api.leaveTable(this.currentTableId);
            } catch (error) {
                this.log(`✗ Error leaving room: ${error.message}`, 'error');
            }
        }

        this.currentTableId = null;
        this.showScreen('lobby-screen');
        await this.loadRooms();
    }

    setupSubscriptions(tableId) {
        // Subscribe to table updates
        const unsub1 = this.api.subscribeToTable(tableId, (data) => {
            this.handleTableUpdate(data.record);
        });

        // Subscribe to game actions
        const unsub2 = this.api.subscribeToGameActions(tableId, (data) => {
            if (data.action === 'create') {
                this.handleGameAction(data.record);
            }
        });

        this.unsubscribers.push(unsub1, unsub2);
    }

    async handleTableUpdate(table) {
        this.log(`⟳ Table updated: status=${table.status}`, 'info');
        await this.updateRoomUI();
    }

    async handleGameAction(action) {
        this.log(`► Action: ${action.action_type} by player`, 'info');
        await this.updateGameState();
    }

    async updateRoomUI() {
        if (!this.currentTableId) return;

        const table = await this.api.getTable(this.currentTableId);
        
        // Update status
        const statusEl = document.getElementById('game-status');
        statusEl.textContent = table.status === 'waiting' ? '等待中' : 
                              table.status === 'playing' ? '游戏中' : '已结束';
        statusEl.className = `status-badge status-${table.status}`;

        if (table.status === 'waiting') {
            // Show waiting area
            document.getElementById('waiting-area').classList.remove('hidden');
            document.getElementById('playing-area').classList.add('hidden');
            
            // Get player list - handle both expanded and non-expanded cases
            let players = [];
            if (table.expand?.players && Array.isArray(table.expand.players)) {
                players = table.expand.players;
            } else if (Array.isArray(table.players)) {
                // Players not expanded, fetch them
                try {
                    const playerPromises = table.players.map(id => 
                        this.api.pb.collection('users').getOne(id).catch(() => null)
                    );
                    const fetchedPlayers = await Promise.all(playerPromises);
                    players = fetchedPlayers.filter(p => p !== null);
                } catch (error) {
                    console.error('Error fetching players:', error);
                    players = [];
                }
            }
            
            const playerStates = table.player_states || {};
            
            document.getElementById('waiting-players').innerHTML = players.length > 0 
                ? players.map(p => {
                    const state = playerStates[p.id] || {};
                    const readyIcon = state.ready ? '✓' : '○';
                    const botLabel = state.is_bot ? ' 🤖' : '';
                    return `<div>${readyIcon} ${this.escapeHtml(p.email)}${botLabel}</div>`;
                  }).join('')
                : '<div>等待玩家加入... Waiting for players...</div>';

            // Enable start button if all ready and 4 players
            const allReady = players.every(p => playerStates[p.id]?.ready);
            document.getElementById('start-btn').disabled = !(allReady && players.length === 4);

        } else if (table.status === 'playing') {
            // Show game area
            document.getElementById('waiting-area').classList.add('hidden');
            document.getElementById('playing-area').classList.remove('hidden');
            
            // Start bots if not already started
            if (!this.botManager && table.expand?.players) {
                this.botManager = new BotManager(this.api, this.currentTableId);
                
                const currentUser = this.api.getCurrentUser();
                const playerStates = table.player_states || {};
                
                for (const player of table.expand.players) {
                    if (player.id !== currentUser.id && playerStates[player.id]?.is_bot) {
                        await this.botManager.addBot(player.email);
                    }
                }
                
                this.botManager.startAll();
                this.log('✓ Bot players started', 'success');
            }

            await this.updateGameState();
        }
    }

    async updateGameState() {
        if (!this.currentTableId) return;

        const table = await this.api.getTable(this.currentTableId);
        
        if (!table.current_game) {
            this.log('No active game state', 'info');
            return;
        }

        const gameState = await this.api.getGameState(table.current_game);
        this.currentGameState = gameState;

        const currentUser = this.api.getCurrentUser();
        const isMyTurn = gameState.current_player_turn === currentUser.id;

        // Update players list
        const players = table.expand?.players || [];
        document.getElementById('players-list').innerHTML = players.map(p => {
            const isActive = gameState.current_player_turn === p.id;
            const handCount = gameState.player_hands[p.id]?.length || 0;
            const melds = gameState.player_melds[p.id] || {};
            const meldCount = (melds.kan?.length || 0) + (melds.peng?.length || 0) + 
                            (melds.chi?.length || 0) + (melds.kai?.length || 0);
            
            return `
                <div class="player-card ${isActive ? 'active' : ''} ${p.id !== currentUser.id ? 'bot' : ''}">
                    <strong>${this.escapeHtml(p.email)}</strong> ${isActive ? '▶' : ''}
                    <br>
                    <small>手牌: ${handCount} | 明牌组: ${meldCount}</small>
                </div>
            `;
        }).join('');

        // Update hand
        const hand = gameState.player_hands[currentUser.id] || [];
        document.getElementById('hand-count').textContent = hand.length;
        document.getElementById('hand-cards').innerHTML = hand.map((card, idx) => 
            `<span class="card ${card.suit} ${this.selectedCards.includes(idx) ? 'selected' : ''}" 
                   onclick="app.toggleCardSelection(${idx})">
                ${this.getCardDisplay(card)}
            </span>`
        ).join('');

        // Update discard pile
        const discardPile = gameState.discard_pile || [];
        const lastCard = discardPile[discardPile.length - 1];
        document.getElementById('discard-pile-cards').innerHTML = lastCard 
            ? `<span class="card ${lastCard.suit}">${this.getCardDisplay(lastCard)}</span>`
            : '<small style="color: white;">空 Empty</small>';

        // Update info
        const currentPlayer = players.find(p => p.id === gameState.current_player_turn);
        document.getElementById('current-turn').textContent = currentPlayer?.email || 'Unknown';
        document.getElementById('deck-count').textContent = gameState.deck?.length || 0;
        
        const dealer = players.find(p => p.id === gameState.game_specific_data?.dealer);
        document.getElementById('dealer').textContent = dealer?.email || 'Unknown';

        // Update melds
        const myMelds = gameState.player_melds[currentUser.id] || {};
        const meldsHtml = [];
        if (myMelds.kan?.length) meldsHtml.push(`坎: ${myMelds.kan.length}`);
        if (myMelds.peng?.length) meldsHtml.push(`碰: ${myMelds.peng.length}`);
        if (myMelds.chi?.length) meldsHtml.push(`吃: ${myMelds.chi.length}`);
        if (myMelds.kai?.length) meldsHtml.push(`开: ${myMelds.kai.length}`);
        if (myMelds.yu?.length) meldsHtml.push(`鱼: ${myMelds.yu.length}`);
        
        document.getElementById('your-melds').innerHTML = meldsHtml.length > 0 
            ? meldsHtml.join(' | ') 
            : '无';

        // Update action buttons
        const gsd = gameState.game_specific_data || {};
        const waitingForResponse = gsd.waiting_for_response && 
                                  gsd.response_allowed_players?.includes(currentUser.id);

        document.getElementById('play-btn').disabled = !isMyTurn || waitingForResponse || this.selectedCards.length !== 1;
        document.getElementById('draw-btn').disabled = !isMyTurn || waitingForResponse || (gameState.deck?.length || 0) === 0;
        document.getElementById('chi-btn').disabled = !waitingForResponse;
        document.getElementById('peng-btn').disabled = !waitingForResponse;
        document.getElementById('kai-btn').disabled = !waitingForResponse;
        document.getElementById('hu-btn').disabled = !waitingForResponse;
        document.getElementById('pass-btn').disabled = !waitingForResponse;
    }

    getCardDisplay(card) {
        if (card.type === 'jin_tiao') {
            return card.rank;
        }
        return card.rank;
    }

    toggleCardSelection(idx) {
        const index = this.selectedCards.indexOf(idx);
        if (index > -1) {
            this.selectedCards.splice(index, 1);
        } else {
            this.selectedCards.push(idx);
        }
        this.updateGameState();
    }

    // ========== Game Actions ==========

    async toggleReady() {
        try {
            await this.api.toggleReady(this.currentTableId);
            this.log('✓ Ready status toggled', 'success');
        } catch (error) {
            this.log(`✗ Error toggling ready: ${error.message}`, 'error');
        }
    }

    async addBot(botEmail) {
        try {
            await this.api.addBotPlayer(this.currentTableId, botEmail);
            this.log(`✓ Bot added: ${botEmail}`, 'success');
        } catch (error) {
            this.log(`✗ Error adding bot: ${error.message}`, 'error');
        }
    }

    async startGame() {
        try {
            await this.api.startGame(this.currentTableId);
            this.log('✓ Game started!', 'success');
        } catch (error) {
            this.log(`✗ Error starting game: ${error.message}`, 'error');
            alert('开始游戏失败 Failed to start game: ' + error.message);
        }
    }

    async playCard() {
        if (this.selectedCards.length !== 1) {
            alert('请选择一张牌 Please select one card');
            return;
        }

        const hand = this.currentGameState.player_hands[this.api.getCurrentUser().id];
        const card = hand[this.selectedCards[0]];

        try {
            await this.api.playCards(this.currentTableId, [card]);
            this.selectedCards = [];
            this.log('✓ Card played', 'success');
        } catch (error) {
            this.log(`✗ Error playing card: ${error.message}`, 'error');
            alert('出牌失败 Failed to play card: ' + error.message);
        }
    }

    async drawCard() {
        try {
            await this.api.draw(this.currentTableId);
            this.log('✓ Card drawn', 'success');
        } catch (error) {
            this.log(`✗ Error drawing card: ${error.message}`, 'error');
            alert('抓牌失败 Failed to draw card: ' + error.message);
        }
    }

    async chi() {
        // Simplified - user would need to select cards
        alert('Chi功能需要选择组合 Chi requires selecting combination');
    }

    async peng() {
        try {
            await this.api.peng(this.currentTableId);
            this.log('✓ Peng!', 'success');
        } catch (error) {
            this.log(`✗ Error peng: ${error.message}`, 'error');
            alert('碰牌失败 Failed to peng: ' + error.message);
        }
    }

    async kai() {
        try {
            await this.api.kai(this.currentTableId);
            this.log('✓ Kai!', 'success');
        } catch (error) {
            this.log(`✗ Error kai: ${error.message}`, 'error');
            alert('开牌失败 Failed to kai: ' + error.message);
        }
    }

    async hu() {
        try {
            await this.api.hu(this.currentTableId);
            this.log('✓ Hu! 胡了！', 'success');
            alert('恭喜胡牌！ Congratulations, you won!');
        } catch (error) {
            this.log(`✗ Error hu: ${error.message}`, 'error');
            alert('胡牌失败 Failed to hu: ' + error.message);
        }
    }

    async pass() {
        try {
            await this.api.pass(this.currentTableId);
            this.log('✓ Passed', 'success');
        } catch (error) {
            this.log(`✗ Error passing: ${error.message}`, 'error');
            alert('过牌失败 Failed to pass: ' + error.message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const app = new GameApp();
app.init();
