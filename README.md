# CardGames - Extensible Online Multiplayer Card Game Platform
# CardGames - 可扩展式在线多人卡牌游戏平台

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

An highly extensible online multiplayer card game platform built on PocketBase.

### Core Philosophy

**"Everything is an Object"** - In this platform, all game concepts (rules, tables, players, games, every action) are database records.

### Key Features

- **Rules as Configuration**: Game rules are stored as data - add new games by creating records
- **Event Sourcing**: Every game action is recorded for anti-cheat, reconnection, and replay
- **State Machine Driven**: Table status (waiting, playing, finished) drives game flow
- **Pluggable Game Engine**: Different game rules via JavaScript logic files

### Technology Stack

- **Backend**: PocketBase (Go)
- **JavaScript Engine**: goja (for game logic execution)
- **Database**: SQLite (PocketBase built-in)
- **Real-time**: PocketBase Realtime API

### Quick Start

#### Local Development

```bash
# Build
go build -o cardgames

# Run
./cardgames serve

# Access
# - API: http://localhost:8090
# - Admin UI: http://localhost:8090/_/
```

#### Docker Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Or build image manually
docker build -t cardgames:latest .
docker run -d -p 8090:8090 -v cardgames-data:/app/pb_data cardgames:latest
```

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for detailed Docker deployment instructions.

### Documentation

**For Users:**
- [README.md](README.md) - This file, platform overview
- [API.md](API.md) - REST API reference

**For Developers:**
- [GAME_RULE_GUIDE.md](GAME_RULE_GUIDE.md) - **How to create new games** ⭐
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - **How to integrate frontend** ⭐
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Docker deployment guide
- [ROADMAP.md](ROADMAP.md) - Future improvements

### Game Categories

The platform supports different game categories:

1. **Mahjong-like Games** (麻将类)
   - Turn-based with multiple response options
   - Example: Four Color Card
   - See: `game_logics/four_color_card.js`

2. **Poker-like Games** (扑克类)
   - Betting rounds and card rankings
   - Coming soon

3. **Trick-taking Games** (打牌类)
   - Trick-based play
   - Coming soon

### Creating Your First Game

1. **Read the guide**: [GAME_RULE_GUIDE.md](GAME_RULE_GUIDE.md)

2. **Create game logic file** in `game_logics/mygame.js`:
```javascript
function initializeGame(config, playerIds) {
    // Initialize game state
    return { player_hands: {}, deck: [], ... };
}

function validatePlay_cards(config, gameState, playerId, actionData) {
    // Validate action
    return { valid: true, message: "Valid" };
}

function applyPlay_cards(config, gameState, playerId, actionData) {
    // Apply action to state
    return newGameState;
}
```

3. **Create game rule** in admin UI with:
   - Name, description
   - logic_file: "mygame.js"
   - config_json: game configuration

4. **Test your game** by creating a table and playing!

### Frontend Integration

See [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) for complete frontend integration guide.

**Quick example:**
```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Login
await pb.collection('users').authWithPassword(email, password);

// Create table
const table = await pb.collection('tables').create({
    name: 'My Game',
    rule: ruleId,
    owner: pb.authStore.model.id,
    status: 'waiting'
});

// Subscribe to updates
pb.collection('game_actions').subscribe('*', (data) => {
    console.log('New action:', data.record);
});
```

### Architecture Highlights

1. **Extensibility**: Add games without modifying core code
2. **Event Sourcing**: Complete audit trail and replay capability  
3. **Security**: Proper authentication and authorization
4. **Real-time**: Instant updates via WebSocket subscriptions

### License

See [LICENSE](LICENSE) file.

---

<a name="chinese"></a>
## 中文

一个基于 PocketBase 构建的高度可扩展的在线多人卡牌游戏平台。

### 核心理念

**"万物皆对象"** - 在这个平台中，所有游戏概念（规则、牌桌、玩家、牌局、每一次出牌）都是数据库中的一个记录。

### 核心特性

- **规则即配置**: 游戏规则作为数据存储，添加新游戏只需创建新记录
- **事件溯源**: 每个游戏动作都被记录，支持防作弊、断线重连、游戏复盘
- **状态机驱动**: 牌桌状态（等待中、游戏中、已结束）驱动游戏流程
- **可插拔游戏引擎**: 通过 JavaScript 逻辑文件实现不同游戏规则

### 技术栈

- **后端**: PocketBase (Go)
- **JavaScript引擎**: goja (用于游戏逻辑执行)
- **数据库**: SQLite (PocketBase 内置)
- **实时通信**: PocketBase Realtime API

### 快速开始

#### 本地开发

```bash
# 构建
go build -o cardgames

# 运行
./cardgames serve

# 访问
# - API: http://localhost:8090
# - 管理界面: http://localhost:8090/_/
```

#### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 或手动构建镜像
docker build -t cardgames:latest .
docker run -d -p 8090:8090 -v cardgames-data:/app/pb_data cardgames:latest
```

详细的 Docker 部署说明请参见 [DOCKER_GUIDE.md](DOCKER_GUIDE.md)。

### 文档

**用户文档：**
- [README.md](README.md) - 本文件，平台概述
- [API.md](API.md) - REST API 参考

**开发者文档：**
- [GAME_RULE_GUIDE.md](GAME_RULE_GUIDE.md) - **如何创建新游戏** ⭐
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - **如何集成前端** ⭐
- [DEVELOPMENT.md](DEVELOPMENT.md) - 开发指南
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Docker 部署指南
- [ROADMAP.md](ROADMAP.md) - 未来改进计划

### 游戏分类

平台支持不同的游戏分类：

1. **麻将类游戏**
   - 回合制，多种响应选项
   - 示例：四色牌
   - 参见：`game_logics/four_color_card.js`

2. **扑克类游戏**
   - 下注轮次和牌型排名
   - 即将推出

3. **打牌类游戏**
   - 基于墩的玩法
   - 即将推出

### 创建你的第一个游戏

1. **阅读指南**：[GAME_RULE_GUIDE.md](GAME_RULE_GUIDE.md)

2. **在 `game_logics/mygame.js` 中创建游戏逻辑文件**：
```javascript
function initializeGame(config, playerIds) {
    // 初始化游戏状态
    return { player_hands: {}, deck: [], ... };
}

function validatePlay_cards(config, gameState, playerId, actionData) {
    // 验证动作
    return { valid: true, message: "有效" };
}

function applyPlay_cards(config, gameState, playerId, actionData) {
    // 将动作应用到状态
    return newGameState;
}
```

3. **在管理界面创建游戏规则**，包括：
   - 名称、描述
   - logic_file: "mygame.js"
   - config_json: 游戏配置

4. **通过创建牌桌来测试你的游戏**！

### 前端集成

完整的前端集成指南请参见 [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)。

**快速示例：**
```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// 登录
await pb.collection('users').authWithPassword(email, password);

// 创建牌桌
const table = await pb.collection('tables').create({
    name: '我的游戏',
    rule: ruleId,
    owner: pb.authStore.model.id,
    status: 'waiting'
});

// 订阅更新
pb.collection('game_actions').subscribe('*', (data) => {
    console.log('新动作:', data.record);
});
```

### 架构亮点

1. **可扩展性**: 添加游戏无需修改核心代码
2. **事件溯源**: 完整的审计跟踪和重播能力
3. **安全性**: 适当的身份验证和授权
4. **实时性**: 通过 WebSocket 订阅实现即时更新

### 许可证

请参见 [LICENSE](LICENSE) 文件。

## 数据库设计

### 核心集合

#### 1. `game_rules` (游戏规则)
定义游戏的玩法和配置。

| 字段 | 类型 | 说明 |
|------|------|------|
| name | Text | 游戏名称 |
| description | Text | 游戏描述 |
| config_json | JSON | 游戏配置（牌堆、初始手牌、计分规则等） |
| logic_file | Text | JavaScript 逻辑文件名 |

#### 2. `tables` (牌桌)
游戏控制器，管理玩家和游戏生命周期。

| 字段 | 类型 | 说明 |
|------|------|------|
| name | Text | 牌桌名称 |
| rule | Relation | 关联的游戏规则 |
| owner | Relation | 牌桌创建者 |
| status | Select | waiting/playing/finished |
| players | Relation (multiple) | 玩家列表 |
| player_states | JSON | 玩家状态（准备、分数等） |
| current_game | Relation | 当前游戏状态 |
| is_private | Bool | 是否私密房间 |
| password | Text | 房间密码 |

#### 3. `game_states` (游戏状态)
存储某一局游戏的实时快照。

| 字段 | 类型 | 说明 |
|------|------|------|
| table | Relation | 所属牌桌 |
| round_number | Number | 第几局 |
| current_player_turn | Relation | 当前玩家 |
| player_hands | JSON | 所有玩家的手牌 |
| deck | JSON | 牌堆中剩余的牌 |
| discard_pile | JSON | 弃牌堆 |
| last_play | JSON | 上一次出牌信息 |
| player_melds | JSON | 玩家已公示的牌组 |
| game_specific_data | JSON | 游戏特有状态 |

#### 4. `game_actions` (游戏动作)
事件溯源的核心，记录每一步操作。

| 字段 | 类型 | 说明 |
|------|------|------|
| table | Relation | 动作发生的牌桌 |
| game_state | Relation | 游戏状态 |
| player | Relation | 执行动作的玩家 |
| sequence_number | Number | 动作序号 |
| action_type | Select | 动作类型 |
| action_data | JSON | 动作数据 |

## 快速开始

### 前置要求

- Go 1.21 或更高版本

### 安装

1. 克隆仓库：
```bash
git clone https://github.com/frog-software/CardGames.git
cd CardGames
```

2. 安装依赖：
```bash
go mod download
```

3. 构建项目：
```bash
go build -o cardgames
```

### 运行

```bash
./cardgames serve
```

服务器将在 `http://127.0.0.1:8090` 启动。

### 访问管理后台

1. 打开浏览器访问 `http://127.0.0.1:8090/_/`
2. 首次访问时，创建管理员账户
3. 登录后可以查看和管理所有集合

## API 文档

### 认证接口

- `POST /api/collections/users/auth-with-password` - 用户登录
- `POST /api/collections/users/records` - 用户注册

### 游戏大厅

- `GET /api/collections/game_rules/records` - 获取所有可用游戏规则
- `GET /api/collections/tables/records` - 获取所有公开的牌桌
- `POST /api/collections/tables/records` - 创建新牌桌

示例创建牌桌：
```json
{
  "name": "Test Game",
  "rule": "RULE_ID",
  "owner": "USER_ID",
  "status": "waiting",
  "is_private": false
}
```

### 实时订阅

使用 PocketBase SDK 订阅集合更新：

```javascript
// 订阅特定牌桌的游戏动作
pb.collection('game_actions').subscribe('*', function (e) {
  console.log('New action:', e.record);
}, { filter: 'table = "TABLE_ID"' });
```

## 游戏逻辑开发

### 创建新游戏

1. 在 `game_logics/` 目录下创建新的 JavaScript 文件
2. 实现必需的函数：
   - `initializeGame(config, playerIds)` - 初始化游戏状态
   - `validatePlay_cards(config, gameState, playerId, actionData)` - 验证出牌
   - `applyPlay_cards(config, gameState, playerId, actionData)` - 应用出牌动作
   - 其他游戏特定的验证和应用函数

3. 在 `game_rules` 集合中创建新记录，指定逻辑文件名

### 四色牌游戏示例

项目已包含完整的四色牌游戏实现：
- 逻辑文件: `game_logics/four_color_card.js`
- 自动初始化的游戏规则记录

支持的动作：
- `play_cards` - 出牌
- `chi` - 吃牌
- `peng` - 碰牌
- `kai` - 开牌（第四张）
- `hu` - 胡牌
- `draw` - 抓牌
- `pass` - 跳过

## 可扩展性

### 添加新游戏

只需要：
1. 编写游戏逻辑 JavaScript 文件
2. 创建 `game_rules` 记录
3. 无需修改核心代码

### 修改游戏规则

大部分修改只需编辑 `config_json` 字段，无需修改代码。

### 前端开发

前端可以使用任何框架（Vue、React、Svelte 等）：
1. 使用 PocketBase SDK 连接后端
2. 订阅实时更新
3. 发送 API 请求执行操作

## 开发路线图

### Phase 1: 核心架构 ✅
- [x] PocketBase 集合设计
- [x] 基础数据结构
- [x] 牌桌管理基础功能
- [x] JavaScript 逻辑执行框架

### Phase 2: 四色牌实现 ✅
- [x] 完整的游戏逻辑实现
- [x] 所有动作验证函数
- [x] 游戏状态管理

### Phase 3: 待开发
- [ ] 完善的 API 端点实现
- [ ] 完整的游戏流程测试
- [ ] 计分和结算逻辑优化
- [ ] Web 前端界面
- [ ] 多游戏支持

## 贡献

欢迎提交 Pull Request 或创建 Issue！

## 许可证

详见 LICENSE 文件。

## 联系方式

- GitHub: https://github.com/frog-software/CardGames
- Issues: https://github.com/frog-software/CardGames/issues

