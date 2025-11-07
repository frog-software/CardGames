// Four Color Card Game Logic
// This file implements the game logic for 四色牌 (Four Color Card)

/**
 * Initialize a new game
 * @param {Object} config - Game configuration from game_rules.config_json
 * @param {Array<string>} playerIds - List of player IDs
 * @returns {Object} Initial game state
 */
function initializeGame(config, playerIds) {
    const deck = createDeck(config);
    const shuffledDeck = shuffleDeck(deck);
    
    // Determine dealer randomly for first game
    const dealerIndex = Math.floor(Math.random() * playerIds.length);
    const dealerId = playerIds[dealerIndex];
    
    // Distribute cards
    const playerHands = {};
    const playerMelds = {};
    const dealerCards = config.setup.initial_cards.dealer;
    const otherCards = config.setup.initial_cards.others;
    
    let deckIndex = 0;
    for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i];
        const cardCount = playerId === dealerId ? dealerCards : otherCards;
        playerHands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + cardCount);
        playerMelds[playerId] = { kan: [], yu: [], kai: [], peng: [], chi: [] };
        deckIndex += cardCount;
    }
    
    // Remaining cards in deck
    const remainingDeck = shuffledDeck.slice(deckIndex);
    
    // Reveal bonus card (the extra card dealer has)
    const bonusCard = playerHands[dealerId][playerHands[dealerId].length - 1];
    const bonusCardValue = calculateBonusCardValue(bonusCard);
    
    return {
        player_hands: playerHands,
        deck: remainingDeck,
        discard_pile: [],
        current_player_turn: dealerId,
        player_melds: playerMelds,
        last_play: null,
        game_specific_data: {
            dealer: dealerId,
            bonus_card: bonusCard,
            bonus_value: bonusCardValue,
            waiting_for_response: false,
            response_allowed_players: []
        }
    };
}

/**
 * Create a deck of Four Color Cards
 */
function createDeck(config) {
    const deck = [];
    const deckDef = config.custom_data.deck_definition;
    
    // Regular cards: suits × ranks
    for (const suit of deckDef.suits) {
        for (const rank of deckDef.ranks) {
            deck.push({ suit: suit, rank: rank, type: 'regular' });
        }
    }
    
    // Special cards (金条): 公侯伯子男
    for (const card of deckDef.special_rank.cards) {
        deck.push({ suit: 'red', rank: card, type: 'jin_tiao' });
    }
    
    return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm
 */
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Calculate bonus card value
 * 黄=1, 红=2, 绿=3, 白=4
 */
function calculateBonusCardValue(card) {
    const values = { yellow: 1, red: 2, green: 3, white: 4 };
    return values[card.suit] || 0;
}

/**
 * Validate play_cards action (playing/discarding cards)
 */
function validatePlay_cards(config, gameState, playerId, actionData) {
    // Check if it's the player's turn
    if (gameState.current_player_turn !== playerId) {
        return { valid: false, message: "Not your turn" };
    }
    
    // Check if waiting for response
    if (gameState.game_specific_data.waiting_for_response) {
        return { valid: false, message: "Waiting for other players to respond" };
    }
    
    // Validate that player has the cards
    const playerHand = gameState.player_hands[playerId];
    const cards = actionData.cards;
    
    if (!cards || cards.length !== 1) {
        return { valid: false, message: "Must play exactly one card" };
    }
    
    const cardToPlay = cards[0];
    const hasCard = playerHand.some(card => 
        card.suit === cardToPlay.suit && card.rank === cardToPlay.rank
    );
    
    if (!hasCard) {
        return { valid: false, message: "You don't have this card" };
    }
    
    return { valid: true, message: "Valid play" };
}

/**
 * Apply play_cards action
 */
function applyPlay_cards(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    const cards = actionData.cards;
    const cardToPlay = cards[0];
    
    // Remove card from player's hand
    const playerHand = [...newState.player_hands[playerId]];
    const cardIndex = playerHand.findIndex(card => 
        card.suit === cardToPlay.suit && card.rank === cardToPlay.rank
    );
    playerHand.splice(cardIndex, 1);
    newState.player_hands[playerId] = playerHand;
    
    // Add to discard pile
    newState.discard_pile = newState.discard_pile || [];
    newState.discard_pile.push(cardToPlay);
    
    // Update last play
    newState.last_play = {
        player: playerId,
        cards: cards,
        timestamp: Date.now()
    };
    
    // Set waiting for response from next player
    const players = Object.keys(newState.player_hands);
    const currentIndex = players.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];
    
    newState.game_specific_data.waiting_for_response = true;
    newState.game_specific_data.response_allowed_players = [nextPlayer];
    newState.current_player_turn = nextPlayer;
    
    return newState;
}

/**
 * Validate chi action (吃牌)
 */
function validateChi(config, gameState, playerId, actionData) {
    // Can only chi from previous player
    const players = Object.keys(gameState.player_hands);
    const currentIndex = players.indexOf(gameState.current_player_turn);
    const prevIndex = (currentIndex - 1 + players.length) % players.length;
    const prevPlayer = players[prevIndex];
    
    if (!gameState.last_play || gameState.last_play.player !== prevPlayer) {
        return { valid: false, message: "Can only chi from previous player" };
    }
    
    // Check if player is allowed to respond
    if (!gameState.game_specific_data.response_allowed_players.includes(playerId)) {
        return { valid: false, message: "Not allowed to respond" };
    }
    
    const lastCard = gameState.last_play.cards[0];
    const playerHand = gameState.player_hands[playerId];
    const cardsToUse = actionData.cards || [];
    
    // Validate chi pattern
    const pattern = identifyChiPattern(config, lastCard, cardsToUse, playerHand);
    if (!pattern) {
        return { valid: false, message: "Invalid chi combination" };
    }
    
    return { valid: true, message: "Valid chi", pattern: pattern };
}

/**
 * Identify chi pattern
 */
function identifyChiPattern(config, responseCard, cardsToUse, playerHand) {
    const chiPatterns = config.custom_data.chi_patterns;
    
    // Check each pattern
    for (const pattern of chiPatterns) {
        if (pattern.type === 'sequence') {
            // Same color sequence (车马炮 or 将士象)
            const allCards = [responseCard, ...cardsToUse];
            const sameSuit = allCards.every(c => c.suit === allCards[0].suit);
            const ranks = allCards.map(c => c.rank).sort();
            const patternRanks = [...pattern.ranks].sort();
            
            if (sameSuit && JSON.stringify(ranks) === JSON.stringify(patternRanks)) {
                return { type: pattern.type, points: pattern.points };
            }
        } else if (pattern.type === 'soldier_diff_3' || pattern.type === 'soldier_diff_4') {
            // Different color soldiers
            const allCards = [responseCard, ...cardsToUse];
            const allSoldiers = allCards.every(c => c.rank === '卒');
            const uniqueSuits = new Set(allCards.map(c => c.suit));
            
            const expectedCount = pattern.type === 'soldier_diff_3' ? 3 : 4;
            if (allSoldiers && uniqueSuits.size === expectedCount && allCards.length === expectedCount) {
                return { type: pattern.type, points: pattern.points };
            }
        } else if (pattern.type === 'single_jiang') {
            // Single 将
            if (responseCard.rank === '将' && cardsToUse.length === 0) {
                return { type: pattern.type, points: pattern.points };
            }
        } else if (pattern.type === 'single_jin_tiao') {
            // Single 金条
            if (responseCard.type === 'jin_tiao' && cardsToUse.length === 0) {
                return { type: pattern.type, points: pattern.points };
            }
        }
    }
    
    return null;
}

/**
 * Apply chi action
 */
function applyChi(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    const lastCard = newState.last_play.cards[0];
    const cardsToUse = actionData.cards || [];
    
    // Remove cards from player's hand
    const playerHand = [...newState.player_hands[playerId]];
    for (const card of cardsToUse) {
        const index = playerHand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (index >= 0) playerHand.splice(index, 1);
    }
    newState.player_hands[playerId] = playerHand;
    
    // Remove last card from discard pile
    newState.discard_pile.pop();
    
    // Add to player's melds
    newState.player_melds[playerId].chi.push({
        cards: [lastCard, ...cardsToUse],
        points: actionData.pattern.points
    });
    
    // Clear waiting state
    newState.game_specific_data.waiting_for_response = false;
    newState.game_specific_data.response_allowed_players = [];
    newState.current_player_turn = playerId;
    
    return newState;
}

/**
 * Validate peng action (碰牌)
 */
function validatePeng(config, gameState, playerId, actionData) {
    if (!gameState.last_play) {
        return { valid: false, message: "No card to peng" };
    }
    
    const lastCard = gameState.last_play.cards[0];
    const playerHand = gameState.player_hands[playerId];
    
    // Count matching cards in hand
    const matchingCards = playerHand.filter(c => 
        c.suit === lastCard.suit && c.rank === lastCard.rank
    );
    
    if (matchingCards.length < 2) {
        return { valid: false, message: "Need at least 2 matching cards to peng" };
    }
    
    return { valid: true, message: "Valid peng" };
}

/**
 * Apply peng action
 */
function applyPeng(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    const lastCard = newState.last_play.cards[0];
    
    // Remove 2 matching cards from player's hand
    const playerHand = [...newState.player_hands[playerId]];
    let removed = 0;
    for (let i = playerHand.length - 1; i >= 0 && removed < 2; i--) {
        if (playerHand[i].suit === lastCard.suit && playerHand[i].rank === lastCard.rank) {
            playerHand.splice(i, 1);
            removed++;
        }
    }
    newState.player_hands[playerId] = playerHand;
    
    // Remove last card from discard pile
    newState.discard_pile.pop();
    
    // Add to player's melds (碰 = 1 point)
    newState.player_melds[playerId].peng.push({
        cards: [lastCard, lastCard, lastCard],
        points: 1
    });
    
    // Clear waiting state
    newState.game_specific_data.waiting_for_response = false;
    newState.game_specific_data.response_allowed_players = [];
    newState.current_player_turn = playerId;
    
    return newState;
}

/**
 * Validate kai action (开牌 - 4th card for kan)
 */
function validateKai(config, gameState, playerId, actionData) {
    if (!gameState.last_play) {
        return { valid: false, message: "No card to kai" };
    }
    
    const lastCard = gameState.last_play.cards[0];
    const playerMelds = gameState.player_melds[playerId];
    
    // Check if player has a kan of this card
    const hasKan = playerMelds.kan.some(kan => 
        kan.cards[0].suit === lastCard.suit && kan.cards[0].rank === lastCard.rank
    );
    
    if (!hasKan) {
        return { valid: false, message: "No matching kan to kai" };
    }
    
    return { valid: true, message: "Valid kai" };
}

/**
 * Apply kai action
 */
function applyKai(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    const lastCard = newState.last_play.cards[0];
    
    // Find and remove the kan
    const playerMelds = { ...newState.player_melds[playerId] };
    const kanIndex = playerMelds.kan.findIndex(kan => 
        kan.cards[0].suit === lastCard.suit && kan.cards[0].rank === lastCard.rank
    );
    
    const kan = playerMelds.kan[kanIndex];
    playerMelds.kan.splice(kanIndex, 1);
    
    // Remove last card from discard pile
    newState.discard_pile.pop();
    
    // Add to player's kai melds (开 = 6 points)
    playerMelds.kai.push({
        cards: [...kan.cards, lastCard],
        points: 6
    });
    
    newState.player_melds[playerId] = playerMelds;
    
    // Clear waiting state
    newState.game_specific_data.waiting_for_response = false;
    newState.game_specific_data.response_allowed_players = [];
    newState.current_player_turn = playerId;
    
    return newState;
}

/**
 * Validate hu action (胡牌 - win)
 */
function validateHu(config, gameState, playerId, actionData) {
    if (!gameState.last_play) {
        return { valid: false, message: "No card to hu" };
    }
    
    const lastCard = gameState.last_play.cards[0];
    const playerHand = [...gameState.player_hands[playerId], lastCard];
    const playerMelds = gameState.player_melds[playerId];
    
    // Check if player can form valid winning hand
    const canWin = checkWinningHand(config, playerHand, playerMelds);
    
    if (!canWin) {
        return { valid: false, message: "Cannot form winning hand" };
    }
    
    return { valid: true, message: "Valid hu" };
}

/**
 * Check if hand can win
 */
function checkWinningHand(config, hand, melds) {
    // Simplified winning condition:
    // All cards must be able to form valid groups (kan, chi combinations)
    // For now, we'll use a simplified check
    
    // Count existing melds
    const totalMeldCards = 
        (melds.kan.length * 3) +
        (melds.peng.length * 3) +
        (melds.kai.length * 4) +
        (melds.yu.length * 4) +
        (melds.chi.reduce((sum, chi) => sum + chi.cards.length, 0));
    
    // Total cards should match
    const totalCards = hand.length + totalMeldCards;
    
    // Basic validation: can form groups of 3 or 4
    // In a real implementation, this would be more complex
    return hand.length % 3 === 0 || hand.length % 3 === 1;
}

/**
 * Apply hu action
 */
function applyHu(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    const lastCard = newState.last_play.cards[0];
    
    // Remove last card from discard pile
    newState.discard_pile.pop();
    
    // Add card to player's hand for final scoring
    newState.player_hands[playerId].push(lastCard);
    
    // Calculate final scores
    const scores = calculateFinalScores(config, newState, playerId);
    newState.game_specific_data.final_scores = scores;
    newState.game_specific_data.winner = playerId;
    newState.game_specific_data.game_ended = true;
    
    return newState;
}

/**
 * Validate draw action (从牌堆抓牌)
 */
function validateDraw(config, gameState, playerId, actionData) {
    // Check if it's the player's turn
    if (gameState.current_player_turn !== playerId) {
        return { valid: false, message: "Not your turn" };
    }
    
    // Check if deck has cards
    if (!gameState.deck || gameState.deck.length === 0) {
        return { valid: false, message: "Deck is empty" };
    }
    
    // Check if we're in draw phase (not waiting for response)
    if (gameState.game_specific_data.waiting_for_response) {
        return { valid: false, message: "Cannot draw while waiting for response" };
    }
    
    return { valid: true, message: "Valid draw" };
}

/**
 * Apply draw action
 */
function applyDraw(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    
    // Draw a card from deck
    const drawnCard = newState.deck.shift();
    newState.player_hands[playerId].push(drawnCard);
    
    // Update last play to the drawn card
    newState.last_play = {
        player: playerId,
        cards: [drawnCard],
        type: 'draw',
        timestamp: Date.now()
    };
    
    return newState;
}

/**
 * Validate pass action (pass on responding)
 */
function validatePass(config, gameState, playerId, actionData) {
    // Check if player is allowed to respond
    if (!gameState.game_specific_data.response_allowed_players.includes(playerId)) {
        return { valid: false, message: "Not allowed to pass" };
    }
    
    return { valid: true, message: "Valid pass" };
}

/**
 * Apply pass action
 */
function applyPass(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    
    // Clear waiting state
    newState.game_specific_data.waiting_for_response = false;
    newState.game_specific_data.response_allowed_players = [];
    
    // If player passed after drawing, the drawn card becomes their play
    if (newState.last_play && newState.last_play.type === 'draw') {
        const drawnCard = newState.last_play.cards[0];
        newState.discard_pile.push(drawnCard);
        
        // Remove from hand
        const playerHand = [...newState.player_hands[playerId]];
        const index = playerHand.findIndex(c => 
            c.suit === drawnCard.suit && c.rank === drawnCard.rank
        );
        if (index >= 0) playerHand.splice(index, 1);
        newState.player_hands[playerId] = playerHand;
        
        // Move to next player
        const players = Object.keys(newState.player_hands);
        const currentIndex = players.indexOf(playerId);
        const nextIndex = (currentIndex + 1) % players.length;
        newState.current_player_turn = players[nextIndex];
    }
    
    return newState;
}

/**
 * Calculate final scores
 */
function calculateFinalScores(config, gameState, winnerId) {
    const scoringRules = config.custom_data.scoring_rules;
    const players = Object.keys(gameState.player_hands);
    const scores = {};
    
    // Calculate winner's score
    const winnerMelds = gameState.player_melds[winnerId];
    let winnerScore = 0;
    
    // Sum up all melds
    winnerScore += winnerMelds.chi.reduce((sum, chi) => sum + chi.points, 0);
    winnerScore += winnerMelds.peng.reduce((sum, peng) => sum + peng.points, 0);
    winnerScore += winnerMelds.kan.reduce((sum, kan) => sum + kan.points, 0);
    winnerScore += winnerMelds.kai.reduce((sum, kai) => sum + kai.points, 0);
    winnerScore += winnerMelds.yu.reduce((sum, yu) => sum + yu.points, 0);
    
    // Check if 大胡 (has kai or yu)
    const isDaHu = winnerMelds.kai.length > 0 || winnerMelds.yu.length > 0;
    if (isDaHu) {
        winnerScore *= scoringRules.da_hu_multiplier;
    }
    
    // Winner collects from all other players
    for (const playerId of players) {
        if (playerId === winnerId) {
            scores[playerId] = winnerScore * (players.length - 1);
        } else {
            scores[playerId] = -winnerScore;
        }
    }
    
    return scores;
}
