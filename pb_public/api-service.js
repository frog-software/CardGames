/**
 * API Service for Four Color Card Game
 * Wraps PocketBase API calls with game-specific logic
 */

class GameAPIService {
    constructor(pb) {
        this.pb = pb;
    }

    // ========== Authentication ==========
    
    async login(email, password) {
        return await this.pb.collection('users').authWithPassword(email, password);
    }

    async register(email, password, username) {
        const user = await this.pb.collection('users').create({
            email: email,
            password: password,
            passwordConfirm: password,
            username: username || email.split('@')[0],
            emailVisibility: true
        });
        // Auto-login after register
        await this.login(email, password);
        return user;
    }

    logout() {
        this.pb.authStore.clear();
    }

    getCurrentUser() {
        return this.pb.authStore.model;
    }

    isLoggedIn() {
        return this.pb.authStore.isValid;
    }

    // ========== Game Rules ==========
    
    async getGameRules() {
        return await this.pb.collection('game_rules').getFullList({
            sort: 'name'
        });
    }

    async getGameRule(ruleId) {
        return await this.pb.collection('game_rules').getOne(ruleId);
    }

    // ========== Tables ==========
    
    async getTables(gameRuleId = null) {
        // Simplified filter without complex OR conditions
        let filter = '';
        if (gameRuleId) {
            filter = `rule = "${gameRuleId}"`;
        }
        
        return await this.pb.collection('tables').getList(1, 50, {
            filter: filter,
            expand: 'rule,owner,players',
            sort: '-created'
        });
    }

    async getTable(tableId) {
        return await this.pb.collection('tables').getOne(tableId, {
            expand: 'rule,owner,players,current_game'
        });
    }

    async createTable(name, ruleId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Must be logged in to create table');
        }

        return await this.pb.collection('tables').create({
            name: name,
            rule: ruleId,
            owner: currentUser.id,
            status: 'waiting',
            players: [currentUser.id],
            is_private: false,
            player_states: {
                [currentUser.id]: {
                    ready: false,
                    score: 0,
                    is_bot: false
                }
            }
        });
    }

    async joinTable(tableId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Must be logged in to join table');
        }

        const table = await this.getTable(tableId);
        
        // Check if already in table
        if (table.players.includes(currentUser.id)) {
            return table;
        }

        // Add player
        const players = [...table.players, currentUser.id];
        const playerStates = table.player_states || {};
        playerStates[currentUser.id] = {
            ready: false,
            score: 0,
            is_bot: false
        };

        return await this.pb.collection('tables').update(tableId, {
            players: players,
            player_states: playerStates
        });
    }

    async leaveTable(tableId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Must be logged in');
        }

        const table = await this.getTable(tableId);
        
        // Remove player
        const players = table.players.filter(p => p !== currentUser.id);
        const playerStates = table.player_states || {};
        delete playerStates[currentUser.id];

        return await this.pb.collection('tables').update(tableId, {
            players: players,
            player_states: playerStates
        });
    }

    async toggleReady(tableId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Must be logged in');
        }

        const table = await this.getTable(tableId);
        const playerStates = table.player_states || {};

        if (playerStates[currentUser.id]) {
            playerStates[currentUser.id].ready = !playerStates[currentUser.id].ready;
        }

        return await this.pb.collection('tables').update(tableId, {
            player_states: playerStates
        });
    }

    async addBotPlayer(tableId, botEmail) {
        const table = await this.getTable(tableId);
        
        // Get or create bot user
        let botUser;
        try {
            const users = await this.pb.collection('users').getFullList({
                filter: `email = "${botEmail}"`
            });
            if (users && users.length > 0) {
                botUser = users[0];
            }
        } catch (error) {
            // Error getting users
        }
        
        // Create bot user if doesn't exist
        if (!botUser) {
            const botName = botEmail.split('@')[0];
            const botPassword = 'bot_' + Math.random().toString(36).substring(7);
            botUser = await this.pb.collection('users').create({
                email: botEmail,
                password: botPassword,
                passwordConfirm: botPassword,
                username: botName,
                emailVisibility: true
            });
        }

        // Add bot to table
        if (!table.players.includes(botUser.id)) {
            const players = [...table.players, botUser.id];
            const playerStates = table.player_states || {};
            playerStates[botUser.id] = {
                ready: true,
                score: 0,
                is_bot: true
            };

            return await this.pb.collection('tables').update(tableId, {
                players: players,
                player_states: playerStates
            });
        }

        return table;
    }

    async startGame(tableId) {
        const table = await this.getTable(tableId);
        const rule = await this.getGameRule(table.rule);
        
        // Create initial game state by calling backend
        // The backend should handle this via JavaScript logic
        // For now, we'll update table status and let backend hooks handle it
        
        return await this.pb.collection('tables').update(tableId, {
            status: 'playing'
        });
    }

    // ========== Game State ==========
    
    async getGameState(gameStateId) {
        return await this.pb.collection('game_states').getOne(gameStateId);
    }

    async getCurrentGameState(tableId) {
        const table = await this.getTable(tableId);
        if (!table.current_game) {
            return null;
        }
        return await this.getGameState(table.current_game);
    }

    // ========== Game Actions ==========
    
    async performAction(tableId, actionType, actionData = {}) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            throw new Error('Must be logged in');
        }

        const table = await this.getTable(tableId);
        
        if (!table.current_game) {
            throw new Error('No active game');
        }

        // Get sequence number
        const actions = await this.pb.collection('game_actions').getList(1, 1, {
            filter: `table = "${tableId}"`,
            sort: '-sequence_number'
        });

        const sequenceNumber = actions.items.length > 0 
            ? actions.items[0].sequence_number + 1 
            : 1;

        // Create action
        return await this.pb.collection('game_actions').create({
            table: tableId,
            game_state: table.current_game,
            player: currentUser.id,
            sequence_number: sequenceNumber,
            action_type: actionType,
            action_data: actionData
        });
    }

    async playCards(tableId, cards) {
        return await this.performAction(tableId, 'play_cards', { cards });
    }

    async draw(tableId) {
        return await this.performAction(tableId, 'draw', {});
    }

    async chi(tableId, cards, pattern) {
        return await this.performAction(tableId, 'chi', { cards, pattern });
    }

    async peng(tableId) {
        return await this.performAction(tableId, 'peng', {});
    }

    async kai(tableId) {
        return await this.performAction(tableId, 'kai', {});
    }

    async hu(tableId) {
        return await this.performAction(tableId, 'hu', {});
    }

    async pass(tableId) {
        return await this.performAction(tableId, 'pass', {});
    }

    // ========== Real-time Subscriptions ==========
    
    subscribeToTable(tableId, callback) {
        return this.pb.collection('tables').subscribe(tableId, callback);
    }

    subscribeToGameActions(tableId, callback) {
        return this.pb.collection('game_actions').subscribe('*', (data) => {
            if (data.record.table === tableId) {
                callback(data);
            }
        }, {
            filter: `table = "${tableId}"`
        });
    }

    subscribeToGameState(gameStateId, callback) {
        return this.pb.collection('game_states').subscribe(gameStateId, callback);
    }

    unsubscribeAll() {
        this.pb.collection('tables').unsubscribe();
        this.pb.collection('game_actions').unsubscribe();
        this.pb.collection('game_states').unsubscribe();
    }
}
