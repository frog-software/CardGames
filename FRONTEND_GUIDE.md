# Frontend Integration Guide / 前端集成指南

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview

This guide explains how to integrate your frontend application with the CardGames backend platform.

### Prerequisites

- PocketBase JavaScript SDK
- Basic understanding of REST APIs and WebSockets
- Modern JavaScript (ES6+)

### Installation

```bash
npm install pocketbase
# or
yarn add pocketbase
# or
<script src="https://cdn.jsdelivr.net/npm/pocketbase@0.21.0/dist/pocketbase.umd.js"></script>
```

### 1. Initialize PocketBase Client

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Enable auto-cancellation for duplicate requests
pb.autoCancellation(false);
```

### 2. Authentication

#### Register New User

```javascript
async function register(email, password, username) {
    try {
        const user = await pb.collection('users').create({
            email: email,
            password: password,
            passwordConfirm: password,
            username: username,
            emailVisibility: true
        });
        
        console.log('User registered:', user);
        return user;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
}
```

#### Login

```javascript
async function login(email, password) {
    try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        
        console.log('Logged in:', authData);
        console.log('User:', pb.authStore.model);
        console.log('Token:', pb.authStore.token);
        
        return authData;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
}
```

#### Check Authentication Status

```javascript
function isLoggedIn() {
    return pb.authStore.isValid;
}

function getCurrentUser() {
    return pb.authStore.model;
}
```

#### Logout

```javascript
function logout() {
    pb.authStore.clear();
}
```

### 3. Game Rules

#### List Available Games

```javascript
async function getGameRules() {
    try {
        const rules = await pb.collection('game_rules').getFullList({
            sort: 'name'
        });
        
        console.log('Available games:', rules);
        return rules;
    } catch (error) {
        console.error('Failed to load games:', error);
        throw error;
    }
}
```

#### Get Single Game Rule

```javascript
async function getGameRule(ruleId) {
    try {
        const rule = await pb.collection('game_rules').getOne(ruleId);
        return rule;
    } catch (error) {
        console.error('Failed to load game rule:', error);
        throw error;
    }
}
```

### 4. Tables (Game Rooms)

#### List Available Tables

```javascript
async function getTables(gameRuleId = null) {
    try {
        const filter = gameRuleId 
            ? `rule = "${gameRuleId}" && status = "waiting"`
            : 'status = "waiting"';
        
        const tables = await pb.collection('tables').getList(1, 50, {
            filter: filter,
            expand: 'rule,owner,players',
            sort: '-created'
        });
        
        console.log('Available tables:', tables);
        return tables;
    } catch (error) {
        console.error('Failed to load tables:', error);
        throw error;
    }
}
```

#### Create Table

```javascript
async function createTable(name, ruleId, isPrivate = false, password = '') {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('Must be logged in to create table');
        }
        
        const table = await pb.collection('tables').create({
            name: name,
            rule: ruleId,
            owner: currentUser.id,
            status: 'waiting',
            players: [currentUser.id],
            is_private: isPrivate,
            password: password,
            player_states: {
                [currentUser.id]: {
                    ready: false,
                    score: 0
                }
            }
        });
        
        console.log('Table created:', table);
        return table;
    } catch (error) {
        console.error('Failed to create table:', error);
        throw error;
    }
}
```

#### Join Table

```javascript
async function joinTable(tableId, password = '') {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('Must be logged in to join table');
        }
        
        // Get current table data
        const table = await pb.collection('tables').getOne(tableId);
        
        // Check password if private
        if (table.is_private && table.password !== password) {
            throw new Error('Invalid password');
        }
        
        // Check if already in table
        if (table.players.includes(currentUser.id)) {
            console.log('Already in table');
            return table;
        }
        
        // Add player
        const players = [...table.players, currentUser.id];
        const playerStates = table.player_states || {};
        playerStates[currentUser.id] = { ready: false, score: 0 };
        
        const updatedTable = await pb.collection('tables').update(tableId, {
            players: players,
            player_states: playerStates
        });
        
        console.log('Joined table:', updatedTable);
        return updatedTable;
    } catch (error) {
        console.error('Failed to join table:', error);
        throw error;
    }
}
```

#### Leave Table

```javascript
async function leaveTable(tableId) {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('Must be logged in');
        }
        
        const table = await pb.collection('tables').getOne(tableId);
        
        // Remove player
        const players = table.players.filter(p => p !== currentUser.id);
        const playerStates = table.player_states || {};
        delete playerStates[currentUser.id];
        
        const updatedTable = await pb.collection('tables').update(tableId, {
            players: players,
            player_states: playerStates
        });
        
        console.log('Left table:', updatedTable);
        return updatedTable;
    } catch (error) {
        console.error('Failed to leave table:', error);
        throw error;
    }
}
```

#### Toggle Ready Status

```javascript
async function toggleReady(tableId) {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('Must be logged in');
        }
        
        const table = await pb.collection('tables').getOne(tableId);
        const playerStates = table.player_states || {};
        
        if (playerStates[currentUser.id]) {
            playerStates[currentUser.id].ready = !playerStates[currentUser.id].ready;
        }
        
        const updatedTable = await pb.collection('tables').update(tableId, {
            player_states: playerStates
        });
        
        console.log('Ready status toggled:', updatedTable);
        return updatedTable;
    } catch (error) {
        console.error('Failed to toggle ready:', error);
        throw error;
    }
}
```

### 5. Game State

#### Get Current Game State

```javascript
async function getGameState(tableId) {
    try {
        const table = await pb.collection('tables').getOne(tableId, {
            expand: 'current_game'
        });
        
        if (!table.current_game) {
            console.log('No active game');
            return null;
        }
        
        const gameState = await pb.collection('game_states').getOne(table.current_game);
        
        console.log('Game state:', gameState);
        return gameState;
    } catch (error) {
        console.error('Failed to get game state:', error);
        throw error;
    }
}
```

### 6. Game Actions

#### Perform Game Action

```javascript
async function performAction(tableId, actionType, actionData) {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('Must be logged in');
        }
        
        // Get table and game state
        const table = await pb.collection('tables').getOne(tableId, {
            expand: 'current_game'
        });
        
        if (!table.current_game) {
            throw new Error('No active game');
        }
        
        // Get sequence number
        const actions = await pb.collection('game_actions').getList(1, 1, {
            filter: `table = "${tableId}"`,
            sort: '-sequence_number'
        });
        
        const sequenceNumber = actions.items.length > 0 
            ? actions.items[0].sequence_number + 1 
            : 1;
        
        // Create action
        const action = await pb.collection('game_actions').create({
            table: tableId,
            game_state: table.current_game,
            player: currentUser.id,
            sequence_number: sequenceNumber,
            action_type: actionType,
            action_data: actionData
        });
        
        console.log('Action performed:', action);
        return action;
    } catch (error) {
        console.error('Failed to perform action:', error);
        throw error;
    }
}
```

#### Common Action Examples

**Play Cards:**
```javascript
await performAction(tableId, 'play_cards', {
    cards: [
        { suit: 'red', rank: '将', type: 'regular' }
    ]
});
```

**Draw Card:**
```javascript
await performAction(tableId, 'draw', {});
```

**Chi (Mahjong-like):**
```javascript
await performAction(tableId, 'chi', {
    cards: [
        { suit: 'red', rank: '车', type: 'regular' },
        { suit: 'red', rank: '马', type: 'regular' }
    ],
    pattern: { type: 'sequence', points: 1 }
});
```

**Bet (Poker-like):**
```javascript
await performAction(tableId, 'bet', {
    amount: 100
});
```

### 7. Real-time Subscriptions

#### Subscribe to Table Updates

```javascript
function subscribeToTable(tableId, callback) {
    return pb.collection('tables').subscribe(tableId, callback);
}

// Usage
const unsubscribe = subscribeToTable(tableId, (data) => {
    console.log('Table updated:', data);
    // Update UI with new table data
    updateTableUI(data.record);
});

// Unsubscribe when done
unsubscribe();
```

#### Subscribe to Game Actions

```javascript
function subscribeToGameActions(tableId, callback) {
    return pb.collection('game_actions').subscribe('*', (data) => {
        if (data.record.table === tableId) {
            callback(data);
        }
    }, {
        filter: `table = "${tableId}"`
    });
}

// Usage
const unsubscribe = subscribeToGameActions(tableId, (data) => {
    console.log('New action:', data.action, data.record);
    
    if (data.action === 'create') {
        handleNewAction(data.record);
    }
});
```

#### Subscribe to Game State Changes

```javascript
function subscribeToGameState(gameStateId, callback) {
    return pb.collection('game_states').subscribe(gameStateId, callback);
}

// Usage
const unsubscribe = subscribeToGameState(gameStateId, (data) => {
    console.log('Game state updated:', data);
    updateGameStateUI(data.record);
});
```

### 8. Complete Game Flow Example

```javascript
class CardGameClient {
    constructor(serverUrl) {
        this.pb = new PocketBase(serverUrl);
        this.currentTableId = null;
        this.unsubscribeFunctions = [];
    }
    
    async login(email, password) {
        await this.pb.collection('users').authWithPassword(email, password);
    }
    
    async createAndJoinGame(gameName, ruleId) {
        // Create table
        const table = await this.pb.collection('tables').create({
            name: gameName,
            rule: ruleId,
            owner: this.pb.authStore.model.id,
            status: 'waiting',
            players: [this.pb.authStore.model.id]
        });
        
        this.currentTableId = table.id;
        
        // Subscribe to updates
        this.setupSubscriptions(table.id);
        
        return table;
    }
    
    setupSubscriptions(tableId) {
        // Subscribe to table updates
        const unsubTable = this.pb.collection('tables').subscribe(tableId, (data) => {
            this.handleTableUpdate(data.record);
        });
        this.unsubscribeFunctions.push(unsubTable);
        
        // Subscribe to game actions
        const unsubActions = this.pb.collection('game_actions').subscribe('*', (data) => {
            if (data.record.table === tableId && data.action === 'create') {
                this.handleGameAction(data.record);
            }
        });
        this.unsubscribeFunctions.push(unsubActions);
    }
    
    async playCard(card) {
        return await this.pb.collection('game_actions').create({
            table: this.currentTableId,
            player: this.pb.authStore.model.id,
            action_type: 'play_cards',
            action_data: { cards: [card] }
        });
    }
    
    handleTableUpdate(table) {
        console.log('Table updated:', table);
        // Update UI
        if (table.status === 'playing') {
            this.loadGameState();
        }
    }
    
    handleGameAction(action) {
        console.log('New action:', action);
        // Apply action to local game state
        // Update UI
    }
    
    async loadGameState() {
        const table = await this.pb.collection('tables').getOne(this.currentTableId);
        if (table.current_game) {
            const gameState = await this.pb.collection('game_states').getOne(table.current_game);
            this.updateGameUI(gameState);
        }
    }
    
    updateGameUI(gameState) {
        // Render game state in your UI
        console.log('Current player:', gameState.current_player_turn);
        console.log('Your hand:', gameState.player_hands[this.pb.authStore.model.id]);
    }
    
    cleanup() {
        // Unsubscribe from all
        this.unsubscribeFunctions.forEach(unsub => unsub());
        this.unsubscribeFunctions = [];
    }
}

// Usage
const client = new CardGameClient('http://localhost:8090');
await client.login('user@example.com', 'password');
await client.createAndJoinGame('My Game', 'rule_id_here');
```

### 9. Error Handling

```javascript
async function safeApiCall(apiFunction) {
    try {
        return await apiFunction();
    } catch (error) {
        if (error.status === 401) {
            console.error('Authentication required');
            // Redirect to login
        } else if (error.status === 403) {
            console.error('Permission denied');
        } else if (error.status === 404) {
            console.error('Resource not found');
        } else {
            console.error('API error:', error);
        }
        throw error;
    }
}
```

### 10. Best Practices

1. **Always check authentication** before making API calls
2. **Use real-time subscriptions** for live updates instead of polling
3. **Handle errors gracefully** and show user-friendly messages
4. **Unsubscribe from events** when components unmount
5. **Validate user input** before sending actions
6. **Show loading states** during API calls
7. **Cache data locally** when appropriate
8. **Use optimistic updates** for better UX

---

<a name="chinese"></a>
## 中文

### 概述

本指南说明如何将前端应用程序与 CardGames 后端平台集成。

### 前置要求

- PocketBase JavaScript SDK
- 基本了解 REST API 和 WebSocket
- 现代 JavaScript (ES6+)

### 安装

```bash
npm install pocketbase
# 或
yarn add pocketbase
# 或
<script src="https://cdn.jsdelivr.net/npm/pocketbase@0.21.0/dist/pocketbase.umd.js"></script>
```

### 1. 初始化 PocketBase 客户端

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// 启用重复请求自动取消
pb.autoCancellation(false);
```

### 2. 认证

#### 注册新用户

```javascript
async function register(email, password, username) {
    try {
        const user = await pb.collection('users').create({
            email: email,
            password: password,
            passwordConfirm: password,
            username: username,
            emailVisibility: true
        });
        
        console.log('用户已注册:', user);
        return user;
    } catch (error) {
        console.error('注册失败:', error);
        throw error;
    }
}
```

#### 登录

```javascript
async function login(email, password) {
    try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        
        console.log('已登录:', authData);
        console.log('用户:', pb.authStore.model);
        console.log('令牌:', pb.authStore.token);
        
        return authData;
    } catch (error) {
        console.error('登录失败:', error);
        throw error;
    }
}
```

### 3. 游戏规则

#### 列出可用游戏

```javascript
async function getGameRules() {
    try {
        const rules = await pb.collection('game_rules').getFullList({
            sort: 'name'
        });
        
        console.log('可用游戏:', rules);
        return rules;
    } catch (error) {
        console.error('加载游戏失败:', error);
        throw error;
    }
}
```

### 4. 牌桌（游戏房间）

#### 列出可用牌桌

```javascript
async function getTables(gameRuleId = null) {
    try {
        const filter = gameRuleId 
            ? `rule = "${gameRuleId}" && status = "waiting"`
            : 'status = "waiting"';
        
        const tables = await pb.collection('tables').getList(1, 50, {
            filter: filter,
            expand: 'rule,owner,players',
            sort: '-created'
        });
        
        console.log('可用牌桌:', tables);
        return tables;
    } catch (error) {
        console.error('加载牌桌失败:', error);
        throw error;
    }
}
```

#### 创建牌桌

```javascript
async function createTable(name, ruleId, isPrivate = false, password = '') {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('必须登录才能创建牌桌');
        }
        
        const table = await pb.collection('tables').create({
            name: name,
            rule: ruleId,
            owner: currentUser.id,
            status: 'waiting',
            players: [currentUser.id],
            is_private: isPrivate,
            password: password,
            player_states: {
                [currentUser.id]: {
                    ready: false,
                    score: 0
                }
            }
        });
        
        console.log('牌桌已创建:', table);
        return table;
    } catch (error) {
        console.error('创建牌桌失败:', error);
        throw error;
    }
}
```

### 5. 游戏状态

#### 获取当前游戏状态

```javascript
async function getGameState(tableId) {
    try {
        const table = await pb.collection('tables').getOne(tableId, {
            expand: 'current_game'
        });
        
        if (!table.current_game) {
            console.log('没有活动游戏');
            return null;
        }
        
        const gameState = await pb.collection('game_states').getOne(table.current_game);
        
        console.log('游戏状态:', gameState);
        return gameState;
    } catch (error) {
        console.error('获取游戏状态失败:', error);
        throw error;
    }
}
```

### 6. 游戏动作

#### 执行游戏动作

```javascript
async function performAction(tableId, actionType, actionData) {
    try {
        const currentUser = pb.authStore.model;
        if (!currentUser) {
            throw new Error('必须登录');
        }
        
        // 获取牌桌和游戏状态
        const table = await pb.collection('tables').getOne(tableId, {
            expand: 'current_game'
        });
        
        if (!table.current_game) {
            throw new Error('没有活动游戏');
        }
        
        // 获取序列号
        const actions = await pb.collection('game_actions').getList(1, 1, {
            filter: `table = "${tableId}"`,
            sort: '-sequence_number'
        });
        
        const sequenceNumber = actions.items.length > 0 
            ? actions.items[0].sequence_number + 1 
            : 1;
        
        // 创建动作
        const action = await pb.collection('game_actions').create({
            table: tableId,
            game_state: table.current_game,
            player: currentUser.id,
            sequence_number: sequenceNumber,
            action_type: actionType,
            action_data: actionData
        });
        
        console.log('动作已执行:', action);
        return action;
    } catch (error) {
        console.error('执行动作失败:', error);
        throw error;
    }
}
```

#### 常见动作示例

**出牌：**
```javascript
await performAction(tableId, 'play_cards', {
    cards: [
        { suit: 'red', rank: '将', type: 'regular' }
    ]
});
```

**抓牌：**
```javascript
await performAction(tableId, 'draw', {});
```

**吃牌（麻将类）：**
```javascript
await performAction(tableId, 'chi', {
    cards: [
        { suit: 'red', rank: '车', type: 'regular' },
        { suit: 'red', rank: '马', type: 'regular' }
    ],
    pattern: { type: 'sequence', points: 1 }
});
```

### 7. 实时订阅

#### 订阅牌桌更新

```javascript
function subscribeToTable(tableId, callback) {
    return pb.collection('tables').subscribe(tableId, callback);
}

// 使用方法
const unsubscribe = subscribeToTable(tableId, (data) => {
    console.log('牌桌已更新:', data);
    // 使用新牌桌数据更新 UI
    updateTableUI(data.record);
});

// 完成后取消订阅
unsubscribe();
```

#### 订阅游戏动作

```javascript
function subscribeToGameActions(tableId, callback) {
    return pb.collection('game_actions').subscribe('*', (data) => {
        if (data.record.table === tableId) {
            callback(data);
        }
    }, {
        filter: `table = "${tableId}"`
    });
}

// 使用方法
const unsubscribe = subscribeToGameActions(tableId, (data) => {
    console.log('新动作:', data.action, data.record);
    
    if (data.action === 'create') {
        handleNewAction(data.record);
    }
});
```

### 8. 最佳实践

1. **在进行 API 调用之前始终检查身份验证**
2. **使用实时订阅**获取实时更新而不是轮询
3. **优雅地处理错误**并显示用户友好的消息
4. **在组件卸载时取消订阅事件**
5. **在发送动作之前验证用户输入**
6. **在 API 调用期间显示加载状态**
7. **适当时在本地缓存数据**
8. **使用乐观更新**以获得更好的用户体验
