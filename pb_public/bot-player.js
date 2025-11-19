/**
 * Bot Player Logic for Four Color Card Game
 * Simple AI that makes valid moves
 */

class BotPlayer {
    constructor(apiService, botEmail, tableId) {
        this.api = apiService;
        this.botEmail = botEmail;
        this.tableId = tableId;
        this.isActive = false;
        this.botUserId = null;
        this.currentGameState = null;
        this.unsubscribers = [];
    }

    async initialize() {
        // Get bot user ID
        const users = await this.api.pb.collection('users').getFullList({
            filter: `email = "${this.botEmail}"`
        });
        
        if (users.length === 0) {
            throw new Error('Bot user not found');
        }
        
        this.botUserId = users[0].id;
        console.log(`[Bot ${this.botEmail}] Initialized with ID: ${this.botUserId}`);
    }

    start() {
        this.isActive = true;
        
        // Subscribe to game state changes
        const unsub1 = this.api.subscribeToGameActions(this.tableId, (data) => {
            if (this.isActive && data.action === 'create') {
                this.handleGameAction(data.record);
            }
        });
        
        const unsub2 = this.api.subscribeToTable(this.tableId, (data) => {
            if (this.isActive) {
                this.handleTableUpdate(data.record);
            }
        });
        
        this.unsubscribers.push(unsub1, unsub2);
        
        console.log(`[Bot ${this.botEmail}] Started and listening for actions`);
    }

    stop() {
        this.isActive = false;
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        console.log(`[Bot ${this.botEmail}] Stopped`);
    }

    async handleTableUpdate(table) {
        // Check if game state exists and update it
        if (table.current_game) {
            try {
                this.currentGameState = await this.api.getGameState(table.current_game);
            } catch (error) {
                console.error(`[Bot ${this.botEmail}] Error getting game state:`, error);
            }
        }
    }

    async handleGameAction(action) {
        // Wait a bit to simulate thinking
        await this.sleep(500 + Math.random() * 1000);
        
        try {
            // Get current game state
            const table = await this.api.getTable(this.tableId);
            if (!table.current_game) {
                return;
            }
            
            const gameState = await this.api.getGameState(table.current_game);
            this.currentGameState = gameState;
            
            // Check if it's this bot's turn
            if (gameState.current_player_turn !== this.botUserId) {
                return;
            }
            
            // Decide action based on game state
            await this.makeMove(gameState);
            
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error handling action:`, error);
        }
    }

    async makeMove(gameState) {
        const gsd = gameState.game_specific_data;
        
        // If waiting for response (someone played a card)
        if (gsd.waiting_for_response && gsd.response_allowed_players.includes(this.botUserId)) {
            await this.respondToPlay(gameState);
        } else {
            // It's our turn to play or draw
            await this.playTurn(gameState);
        }
    }

    async respondToPlay(gameState) {
        // Simple strategy: usually pass, sometimes try to peng/chi/hu
        
        const lastCard = gameState.last_play?.cards[0];
        if (!lastCard) {
            await this.pass();
            return;
        }
        
        const hand = gameState.player_hands[this.botUserId];
        
        // Check for hu (10% chance to try)
        if (Math.random() < 0.1) {
            try {
                console.log(`[Bot ${this.botEmail}] Attempting hu...`);
                await this.hu();
                return;
            } catch (error) {
                // Hu failed, continue
            }
        }
        
        // Check for peng (30% chance to try if we have 2+ matching cards)
        const matchingCards = hand.filter(c => 
            c.suit === lastCard.suit && c.rank === lastCard.rank
        );
        
        if (matchingCards.length >= 2 && Math.random() < 0.3) {
            try {
                console.log(`[Bot ${this.botEmail}] Attempting peng...`);
                await this.peng();
                return;
            } catch (error) {
                // Peng failed, continue
            }
        }
        
        // Check for chi (20% chance to try)
        if (Math.random() < 0.2) {
            try {
                console.log(`[Bot ${this.botEmail}] Attempting chi...`);
                // Try to find valid chi combination
                const chiResult = this.findChiCombination(lastCard, hand);
                if (chiResult) {
                    await this.chi(chiResult.cards, chiResult.pattern);
                    return;
                }
            } catch (error) {
                // Chi failed, continue
            }
        }
        
        // Default: pass
        console.log(`[Bot ${this.botEmail}] Passing...`);
        await this.pass();
    }

    async playTurn(gameState) {
        // If we just drew a card, we need to discard
        if (gameState.last_play?.type === 'draw' && gameState.last_play.player === this.botUserId) {
            await this.discardCard(gameState);
        } else {
            // Draw a card
            await this.drawCard(gameState);
        }
    }

    async drawCard(gameState) {
        try {
            console.log(`[Bot ${this.botEmail}] Drawing card...`);
            
            // Login as bot temporarily
            const currentAuth = this.api.pb.authStore.token;
            const currentModel = this.api.pb.authStore.model;
            
            // Get bot user
            const botUser = await this.api.pb.collection('users').getFullList({
                filter: `email = "${this.botEmail}"`
            });
            
            if (botUser.length > 0) {
                // Create action directly via API
                const table = await this.api.getTable(this.tableId);
                
                // Get sequence number
                const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                    filter: `table = "${this.tableId}"`,
                    sort: '-sequence_number'
                });
                
                const sequenceNumber = actions.items.length > 0 
                    ? actions.items[0].sequence_number + 1 
                    : 1;
                
                await this.api.pb.collection('game_actions').create({
                    table: this.tableId,
                    game_state: table.current_game,
                    player: this.botUserId,
                    sequence_number: sequenceNumber,
                    action_type: 'draw',
                    action_data: {}
                });
            }
            
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error drawing card:`, error);
        }
    }

    async discardCard(gameState) {
        const hand = gameState.player_hands[this.botUserId];
        
        if (!hand || hand.length === 0) {
            console.log(`[Bot ${this.botEmail}] No cards to discard`);
            return;
        }
        
        // Simple strategy: discard a random card
        const cardToDiscard = hand[Math.floor(Math.random() * hand.length)];
        
        try {
            console.log(`[Bot ${this.botEmail}] Discarding card:`, cardToDiscard);
            
            const table = await this.api.getTable(this.tableId);
            
            // Get sequence number
            const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                filter: `table = "${this.tableId}"`,
                sort: '-sequence_number'
            });
            
            const sequenceNumber = actions.items.length > 0 
                ? actions.items[0].sequence_number + 1 
                : 1;
            
            await this.api.pb.collection('game_actions').create({
                table: this.tableId,
                game_state: table.current_game,
                player: this.botUserId,
                sequence_number: sequenceNumber,
                action_type: 'play_cards',
                action_data: { cards: [cardToDiscard] }
            });
            
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error discarding card:`, error);
        }
    }

    async pass() {
        try {
            const table = await this.api.getTable(this.tableId);
            
            const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                filter: `table = "${this.tableId}"`,
                sort: '-sequence_number'
            });
            
            const sequenceNumber = actions.items.length > 0 
                ? actions.items[0].sequence_number + 1 
                : 1;
            
            await this.api.pb.collection('game_actions').create({
                table: this.tableId,
                game_state: table.current_game,
                player: this.botUserId,
                sequence_number: sequenceNumber,
                action_type: 'pass',
                action_data: {}
            });
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error passing:`, error);
        }
    }

    async peng() {
        try {
            const table = await this.api.getTable(this.tableId);
            
            const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                filter: `table = "${this.tableId}"`,
                sort: '-sequence_number'
            });
            
            const sequenceNumber = actions.items.length > 0 
                ? actions.items[0].sequence_number + 1 
                : 1;
            
            await this.api.pb.collection('game_actions').create({
                table: this.tableId,
                game_state: table.current_game,
                player: this.botUserId,
                sequence_number: sequenceNumber,
                action_type: 'peng',
                action_data: {}
            });
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error peng:`, error);
            throw error;
        }
    }

    async chi(cards, pattern) {
        try {
            const table = await this.api.getTable(this.tableId);
            
            const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                filter: `table = "${this.tableId}"`,
                sort: '-sequence_number'
            });
            
            const sequenceNumber = actions.items.length > 0 
                ? actions.items[0].sequence_number + 1 
                : 1;
            
            await this.api.pb.collection('game_actions').create({
                table: this.tableId,
                game_state: table.current_game,
                player: this.botUserId,
                sequence_number: sequenceNumber,
                action_type: 'chi',
                action_data: { cards, pattern }
            });
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error chi:`, error);
            throw error;
        }
    }

    async hu() {
        try {
            const table = await this.api.getTable(this.tableId);
            
            const actions = await this.api.pb.collection('game_actions').getList(1, 1, {
                filter: `table = "${this.tableId}"`,
                sort: '-sequence_number'
            });
            
            const sequenceNumber = actions.items.length > 0 
                ? actions.items[0].sequence_number + 1 
                : 1;
            
            await this.api.pb.collection('game_actions').create({
                table: this.tableId,
                game_state: table.current_game,
                player: this.botUserId,
                sequence_number: sequenceNumber,
                action_type: 'hu',
                action_data: {}
            });
        } catch (error) {
            console.error(`[Bot ${this.botEmail}] Error hu:`, error);
            throw error;
        }
    }

    findChiCombination(lastCard, hand) {
        // Try to find valid chi patterns
        // This is simplified - should check against actual game rules
        
        // Try same suit sequence (车马炮 or 将士象)
        const sameSuitCards = hand.filter(c => c.suit === lastCard.suit);
        
        // Check for 车马炮
        const hasJu = sameSuitCards.some(c => c.rank === '车');
        const hasMa = sameSuitCards.some(c => c.rank === '马');
        const haoPao = sameSuitCards.some(c => c.rank === '炮');
        
        if (lastCard.rank === '车' && hasMa && haoPao) {
            return {
                cards: [
                    sameSuitCards.find(c => c.rank === '马'),
                    sameSuitCards.find(c => c.rank === '炮')
                ],
                pattern: { type: 'sequence', points: 1 }
            };
        }
        
        return null;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Bot Manager to control multiple bots
 */
class BotManager {
    constructor(apiService, tableId) {
        this.api = apiService;
        this.tableId = tableId;
        this.bots = [];
    }

    async addBot(botEmail) {
        const bot = new BotPlayer(this.api, botEmail, this.tableId);
        await bot.initialize();
        this.bots.push(bot);
        return bot;
    }

    startAll() {
        this.bots.forEach(bot => bot.start());
    }

    stopAll() {
        this.bots.forEach(bot => bot.stop());
    }
}
