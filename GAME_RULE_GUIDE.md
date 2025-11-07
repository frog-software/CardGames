# Game Rule Development Guide / 游戏规则开发指南

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview

This guide explains how to add a new game to the CardGames platform by creating a game logic file and configuring it in the database.

### Game Categories

The platform supports different game categories to help developers understand the structure:

1. **Mahjong-like Games** (麻将类): Four Color Card, Mahjong
   - Turn-based gameplay
   - Multiple response options (chi/peng/hu)
   - Meld-based scoring
   - Example: `four_color_card.js`

2. **Poker-like Games** (扑克类): Texas Hold'em, Blackjack
   - Betting rounds
   - Card ranking systems
   - Community cards or dealer-player structure
   - Coming soon

3. **Trick-taking Games** (打牌类): Dou Dizhu, Bridge
   - Trick-based play
   - Trump suits
   - Team or individual play
   - Coming soon

### Required Functions

Every game logic file MUST implement these functions:

#### 1. `initializeGame(config, playerIds)`

Initializes the game state when a game starts.

**Parameters:**
- `config` (Object): Game configuration from `game_rules.config_json`
- `playerIds` (Array<string>): Array of player IDs

**Returns:** (Object) Initial game state with structure:
```javascript
{
  player_hands: {},        // Object mapping playerId to array of cards
  deck: [],                // Array of remaining cards in deck
  discard_pile: [],        // Array of discarded cards
  current_player_turn: "", // ID of current player
  player_melds: {},        // Object mapping playerId to their melds
  last_play: null,         // Last action performed
  game_specific_data: {}   // Any game-specific state
}
```

**Example:**
```javascript
function initializeGame(config, playerIds) {
    const deck = createDeck(config);
    const shuffledDeck = shuffleDeck(deck);
    
    const playerHands = {};
    let deckIndex = 0;
    for (const playerId of playerIds) {
        const cardCount = config.setup.initial_cards.player;
        playerHands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + cardCount);
        deckIndex += cardCount;
    }
    
    return {
        player_hands: playerHands,
        deck: shuffledDeck.slice(deckIndex),
        discard_pile: [],
        current_player_turn: playerIds[0],
        player_melds: {},
        last_play: null,
        game_specific_data: {}
    };
}
```

#### 2. Validation Functions: `validate{ActionType}(config, gameState, playerId, actionData)`

One function for each action type your game supports.

**Naming Convention:** 
- Action type `play_cards` → function `validatePlay_cards`
- Action type `draw` → function `validateDraw`
- Underscores in action_type, camelCase after "validate"

**Parameters:**
- `config` (Object): Game configuration
- `gameState` (Object): Current game state
- `playerId` (string): Player attempting the action
- `actionData` (Object): Data specific to the action

**Returns:** (Object)
```javascript
{
  valid: boolean,    // true if action is legal
  message: string    // Description (used for error messages if invalid)
}
```

**Common Validations:**
```javascript
function validatePlay_cards(config, gameState, playerId, actionData) {
    // Check if it's the player's turn
    if (gameState.current_player_turn !== playerId) {
        return { valid: false, message: "Not your turn" };
    }
    
    // Check if player has the cards
    const playerHand = gameState.player_hands[playerId];
    const cardsToPlay = actionData.cards;
    
    for (const card of cardsToPlay) {
        const hasCard = playerHand.some(c => 
            c.suit === card.suit && c.rank === card.rank
        );
        if (!hasCard) {
            return { valid: false, message: "You don't have this card" };
        }
    }
    
    // Game-specific validation
    // ...
    
    return { valid: true, message: "Valid play" };
}
```

#### 3. Application Functions: `apply{ActionType}(config, gameState, playerId, actionData)`

Applies a validated action to the game state.

**Parameters:** Same as validation functions

**Returns:** (Object) New game state (immutable update)

**Important:** 
- Never modify the original gameState
- Always return a new state object
- Update all relevant fields

**Example:**
```javascript
function applyPlay_cards(config, gameState, playerId, actionData) {
    // Create new state (immutable)
    const newState = { ...gameState };
    
    // Deep copy arrays/objects that will be modified
    const playerHand = [...newState.player_hands[playerId]];
    const discardPile = [...newState.discard_pile];
    
    // Remove played cards from hand
    const cardsToPlay = actionData.cards;
    for (const card of cardsToPlay) {
        const index = playerHand.findIndex(c => 
            c.suit === card.suit && c.rank === card.rank
        );
        if (index >= 0) {
            playerHand.splice(index, 1);
        }
    }
    
    // Add to discard pile
    discardPile.push(...cardsToPlay);
    
    // Update state
    newState.player_hands[playerId] = playerHand;
    newState.discard_pile = discardPile;
    newState.last_play = {
        player: playerId,
        cards: cardsToPlay,
        timestamp: Date.now()
    };
    
    // Move to next player
    const players = Object.keys(newState.player_hands);
    const currentIndex = players.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % players.length;
    newState.current_player_turn = players[nextIndex];
    
    return newState;
}
```

### Action Types

Define all action types your game supports in the database collection configuration.

**Common Action Types:**
- `play_cards`: Play one or more cards
- `draw`: Draw card(s) from deck
- `pass`: Skip turn or decline response
- `chi`: Claim discarded card with sequence (mahjong-like)
- `peng`: Claim discarded card with pair (mahjong-like)
- `kai`: Claim fourth card for kan (mahjong-like)
- `hu`: Declare win (mahjong-like)
- `bet`: Place a bet (poker-like)
- `fold`: Fold hand (poker-like)
- `call`: Call bet (poker-like)
- `raise`: Raise bet (poker-like)

### Configuration JSON Structure

Store in `game_rules.config_json`:

```javascript
{
  "meta": {
    "category": "mahjong-like",  // or "poker-like", "trick-taking"
    "player_count": { "min": 2, "max": 4 }
  },
  "setup": {
    "initial_cards": {
      "player": 13  // or dealer/others for asymmetric
    }
  },
  "turn": {
    "order": "clockwise",  // or "counter-clockwise", "free"
    "time_limit": 30       // seconds per turn (optional)
  },
  "custom_data": {
    // Game-specific configuration
    "deck_definition": { ... },
    "scoring_rules": { ... },
    "special_rules": { ... }
  }
}
```

### Complete Example: Simple Card Game

```javascript
/**
 * Simple War-like Card Game
 * Players play cards simultaneously, highest card wins
 */

function initializeGame(config, playerIds) {
    // Create standard 52-card deck
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    
    // Shuffle
    const shuffled = shuffleDeck(deck);
    
    // Deal cards evenly
    const playerHands = {};
    const cardsPerPlayer = Math.floor(shuffled.length / playerIds.length);
    
    for (let i = 0; i < playerIds.length; i++) {
        const start = i * cardsPerPlayer;
        playerHands[playerIds[i]] = shuffled.slice(start, start + cardsPerPlayer);
    }
    
    return {
        player_hands: playerHands,
        deck: [],
        discard_pile: [],
        current_player_turn: playerIds[0],
        player_melds: {},
        last_play: null,
        game_specific_data: {
            round_cards: {},  // Cards played this round
            scores: playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
        }
    };
}

function validatePlay_cards(config, gameState, playerId, actionData) {
    // Check player has cards
    const hand = gameState.player_hands[playerId];
    if (hand.length === 0) {
        return { valid: false, message: "No cards to play" };
    }
    
    // Check exactly one card
    if (!actionData.cards || actionData.cards.length !== 1) {
        return { valid: false, message: "Must play exactly one card" };
    }
    
    // Check card exists in hand
    const card = actionData.cards[0];
    const hasCard = hand.some(c => c.suit === card.suit && c.rank === card.rank);
    if (!hasCard) {
        return { valid: false, message: "You don't have this card" };
    }
    
    return { valid: true, message: "Valid play" };
}

function applyPlay_cards(config, gameState, playerId, actionData) {
    const newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
    
    const card = actionData.cards[0];
    
    // Remove from hand
    const hand = newState.player_hands[playerId];
    const index = hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
    hand.splice(index, 1);
    
    // Add to round cards
    newState.game_specific_data.round_cards[playerId] = card;
    
    // Check if all players have played
    const allPlayed = Object.keys(newState.player_hands).every(
        id => newState.game_specific_data.round_cards[id]
    );
    
    if (allPlayed) {
        // Determine winner
        const winner = determineRoundWinner(newState.game_specific_data.round_cards);
        newState.game_specific_data.scores[winner]++;
        newState.game_specific_data.round_cards = {};
        newState.current_player_turn = winner;
    } else {
        // Move to next player
        const players = Object.keys(newState.player_hands);
        const currentIndex = players.indexOf(playerId);
        newState.current_player_turn = players[(currentIndex + 1) % players.length];
    }
    
    return newState;
}

function determineRoundWinner(roundCards) {
    const rankValues = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    
    let highestValue = 0;
    let winner = null;
    
    for (const [playerId, card] of Object.entries(roundCards)) {
        const value = rankValues[card.rank];
        if (value > highestValue) {
            highestValue = value;
            winner = playerId;
        }
    }
    
    return winner;
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
```

### Testing Your Game Logic

1. **Unit Test Your Functions:**
```javascript
// Test in Node.js or browser console
const config = { /* your config */ };
const playerIds = ['player1', 'player2'];
const state = initializeGame(config, playerIds);
console.log('Initial state:', state);

const validation = validatePlay_cards(config, state, 'player1', {
    cards: [state.player_hands.player1[0]]
});
console.log('Validation:', validation);
```

2. **Test in Platform:**
   - Create game rule record in admin UI
   - Create table with your game
   - Test actions through API or example client

### Frontend Integration

See `FRONTEND_GUIDE.md` for details on calling the backend from your frontend.

---

<a name="chinese"></a>
## 中文

### 概述

本指南说明如何通过创建游戏逻辑文件并在数据库中配置来向 CardGames 平台添加新游戏。

### 游戏分类

平台支持不同的游戏分类，帮助开发者理解结构：

1. **麻将类游戏**: 四色牌、麻将
   - 回合制玩法
   - 多种响应选项（吃/碰/胡）
   - 基于牌组的计分
   - 示例：`four_color_card.js`

2. **扑克类游戏**: 德州扑克、21点
   - 下注轮次
   - 牌型排名系统
   - 公共牌或庄家-玩家结构
   - 即将推出

3. **打牌类游戏**: 斗地主、桥牌
   - 基于墩的玩法
   - 王牌花色
   - 团队或个人游戏
   - 即将推出

### 必须实现的函数

每个游戏逻辑文件必须实现以下函数：

#### 1. `initializeGame(config, playerIds)`

游戏开始时初始化游戏状态。

**参数：**
- `config` (对象): 来自 `game_rules.config_json` 的游戏配置
- `playerIds` (字符串数组): 玩家 ID 数组

**返回值：** (对象) 初始游戏状态，结构如下：
```javascript
{
  player_hands: {},        // 玩家ID到手牌数组的映射
  deck: [],                // 牌堆中剩余的牌
  discard_pile: [],        // 弃牌堆
  current_player_turn: "", // 当前玩家的ID
  player_melds: {},        // 玩家ID到其牌组的映射
  last_play: null,         // 上次执行的动作
  game_specific_data: {}   // 任何游戏特定状态
}
```

#### 2. 验证函数：`validate{ActionType}(config, gameState, playerId, actionData)`

为游戏支持的每种动作类型实现一个函数。

**命名规范：**
- 动作类型 `play_cards` → 函数 `validatePlay_cards`
- 动作类型 `draw` → 函数 `validateDraw`
- action_type 中使用下划线，"validate"之后使用驼峰命名

**参数：**
- `config` (对象): 游戏配置
- `gameState` (对象): 当前游戏状态
- `playerId` (字符串): 尝试执行动作的玩家
- `actionData` (对象): 特定于动作的数据

**返回值：** (对象)
```javascript
{
  valid: boolean,    // 如果动作合法则为 true
  message: string    // 描述（如果无效则用于错误消息）
}
```

#### 3. 应用函数：`apply{ActionType}(config, gameState, playerId, actionData)`

将已验证的动作应用到游戏状态。

**参数：** 与验证函数相同

**返回值：** (对象) 新的游戏状态（不可变更新）

**重要提示：**
- 永远不要修改原始 gameState
- 始终返回新的状态对象
- 更新所有相关字段

### 动作类型

在数据库集合配置中定义游戏支持的所有动作类型。

**常见动作类型：**
- `play_cards`: 出一张或多张牌
- `draw`: 从牌堆抓牌
- `pass`: 跳过回合或拒绝响应
- `chi`: 用顺子吃弃牌（麻将类）
- `peng`: 用对子碰弃牌（麻将类）
- `kai`: 用第四张牌开坎（麻将类）
- `hu`: 宣布胜利（麻将类）
- `bet`: 下注（扑克类）
- `fold`: 弃牌（扑克类）
- `call`: 跟注（扑克类）
- `raise`: 加注（扑克类）

### 配置 JSON 结构

存储在 `game_rules.config_json` 中：

```javascript
{
  "meta": {
    "category": "mahjong-like",  // 或 "poker-like", "trick-taking"
    "player_count": { "min": 2, "max": 4 }
  },
  "setup": {
    "initial_cards": {
      "player": 13  // 或对于不对称分配使用 dealer/others
    }
  },
  "turn": {
    "order": "clockwise",  // 或 "counter-clockwise", "free"
    "time_limit": 30       // 每回合秒数（可选）
  },
  "custom_data": {
    // 游戏特定配置
    "deck_definition": { ... },
    "scoring_rules": { ... },
    "special_rules": { ... }
  }
}
```

### 前端集成

有关从前端调用后端的详细信息，请参阅 `FRONTEND_GUIDE.md`。

### 测试游戏逻辑

1. **单元测试函数：**
```javascript
// 在 Node.js 或浏览器控制台中测试
const config = { /* 你的配置 */ };
const playerIds = ['player1', 'player2'];
const state = initializeGame(config, playerIds);
console.log('初始状态:', state);
```

2. **在平台中测试：**
   - 在管理界面创建游戏规则记录
   - 使用你的游戏创建牌桌
   - 通过 API 或示例客户端测试动作
