# 四色牌游戏完整实现指南
# Four Color Card Game Complete Implementation Guide

[中文](#中文) | [English](#english)

---

<a name="中文"></a>
## 中文

### 概述

本项目实现了一个完整的四色牌在线多人游戏系统，支持：
- 4人在线对战
- 智能机器人（3种难度）
- 实时游戏状态同步
- 移动端适配
- 完整的游戏规则实现

### 技术架构

#### 后端
- **PocketBase v0.31**: 数据库和实时通信
- **Go**: 自定义API和业务逻辑
- **Goja**: JavaScript游戏逻辑执行引擎
- **Bot Scheduler**: 自动化机器人决策系统

#### 前端
- **Vue 3**: Composition API
- **Vite**: 构建工具
- **Pinia**: 状态管理
- **Vant 4**: 移动端UI组件
- **PocketBase JS SDK**: API客户端

### 数据库设计

#### 1. users (扩展内置用户表)
```
- username: 用户名
- email: 邮箱
- is_bot: 是否为机器人
- bot_level: 机器人难度 (easy/normal/hard)
```

#### 2. game_rules (游戏规则)
```
- name: 规则名称
- description: 描述
- category: 游戏类别
- config_json: 游戏配置
- logic_file: JavaScript逻辑文件
```

#### 3. tables (牌桌)
```
- name: 房间名称
- rule: 关联游戏规则
- owner: 房主
- status: 状态 (waiting/playing/finished)
- players: 玩家列表 (最多4人)
- player_states: 玩家状态 (座位、分数、准备状态)
- current_game: 当前游戏状态
- is_private: 是否私密
- password: 房间密码
```

#### 4. game_states (游戏状态)
```
- table: 所属牌桌
- round_number: 局数
- current_player_index: 当前玩家索引
- dealer_index: 庄家索引
- current_player_turn: 当前玩家ID
- player_hands: 玩家手牌
- deck: 牌堆
- discard_pile: 弃牌堆
- last_play: 上次出牌
- player_melds: 玩家明牌组合
- game_specific_data: 游戏特定数据
```

#### 5. game_actions (游戏动作)
```
- table: 牌桌ID
- game_state: 游戏状态ID
- player: 玩家ID
- sequence_number: 序号
- action_type: 动作类型 (play_cards/chi/peng/kai/hu/draw/pass)
- action_data: 动作数据
```

### 四色牌规则

#### 牌组
- **基础牌**: 7种牌型 × 4种颜色 = 28张
  - 牌型: 将、士、象、车、马、炮、卒
  - 颜色: 黄、红、绿、白
- **特殊牌**: 5张金条 (公、侯、伯、子、男)
- **总计**: 33张

#### 发牌
- 庄家: 21张
- 闲家: 20张
- 庄家翻牌: 最后一张公开显示

#### 游戏流程
1. 当前玩家出牌（打出一张牌）
2. 下家响应：
   - 优先选择从牌堆翻牌
   - 其他玩家可以抢断（胡/开/碰）
   - 翻牌玩家可以吃或打出
3. 优先级: 胡 > 开 > 碰 > 吃 > 过

#### 牌组与计分

**吃牌** (1-3分):
- 车马炮 同色 (1分)
- 将士象 同色 (1分)
- 3张不同色卒 (1分)
- 4张不同色卒 (2分)
- 单将 (1分)
- 单金条 (3分)

**碰** (1分):
- 3张同色同字

**开** (6分):
- 4张同色同字 (明杠)

**坎** (3分):
- 3张同色同字 (暗刻)
- 金条坎 (9分)

**鱼** (8分):
- 4张同色同字 (暗杠)
- 金条鱼 (24分)

**胡牌**:
- 小胡: 无开/鱼，分数 = 基础分3 + 吃碰坎分数
- 大胡: 有开/鱼，分数 = (基础分3 + 所有组合分数) × 2

#### 结算
- 赢家向所有闲家收取分数
- 闲家之间根据坎/开/鱼互相结算

### API端点

#### 认证
```
POST /api/collections/users/auth-with-password
POST /api/collections/users/records
```

#### 游戏管理
```
POST /api/tables/create
  {
    "name": "房间名",
    "rule_id": "规则ID",
    "is_private": false,
    "password": ""
  }

POST /api/tables/{id}/add-bot
  {
    "seat_index": 0-3,
    "level": "easy|normal|hard"
  }

POST /api/game/action
  {
    "table_id": "牌桌ID",
    "action_type": "play_cards|chi|peng|kai|hu|draw|pass",
    "action_data": {}
  }
```

### 机器人AI系统

#### 决策逻辑
1. **响应阶段**:
   - 检查是否能胡（最高优先级）
   - 检查是否能开（升级碰）
   - 检查是否能碰
   - 检查是否能吃
   - 默认摸牌

2. **出牌阶段**:
   - Easy: 随机出牌
   - Normal: 优先打出孤张
   - Hard: 记忆弃牌堆，避免点炮

#### 难度级别
- **Easy**: 随机决策，只胡大牌
- **Normal**: 贪心算法，基础策略
- **Hard**: 记牌器，预测对手需求

### 部署指南

#### 后端部署

```bash
# 1. 克隆仓库
git clone https://github.com/frog-software/CardGames.git
cd CardGames

# 2. 安装依赖
go mod download

# 3. 构建
go build -o cardgames

# 4. 运行
./cardgames serve

# 服务器运行在 http://localhost:8090
```

#### 前端部署

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 开发模式
npm run dev

# 4. 生产构建
npm run build

# 前端运行在 http://localhost:3000
```

### 游戏流程示例

1. **创建账号并登录**
   - 访问 http://localhost:3000
   - 注册新用户
   - 登录进入大厅

2. **创建房间**
   - 点击"创建新房间"
   - 输入房间名称
   - 选择公开/私密

3. **添加机器人**
   - 点击空座位
   - 选择机器人难度
   - 机器人自动加入

4. **开始游戏**
   - 4人齐全后点击"开始游戏"
   - 系统自动发牌
   - 按回合进行游戏

5. **游戏操作**
   - 出牌: 选择手牌点击"出牌"
   - 吃/碰/胡: 轮到时点击对应按钮
   - 摸牌: 点击"摸牌"按钮

### 开发注意事项

1. **实时同步**: 使用PocketBase实时订阅
2. **状态管理**: 前端使用Pinia统一管理
3. **移动优先**: 所有UI适配移动端
4. **错误处理**: 完善的错误提示
5. **性能优化**: 避免不必要的重新渲染

### 已知限制

1. 游戏开始逻辑需要完善
2. 吃/碰/胡的详细验证待优化
3. 结算界面待实现
4. 游戏历史记录待添加
5. 断线重连功能待实现

### 后续改进

- [ ] 完善游戏开始逻辑
- [ ] 添加结算界面
- [ ] 实现游戏历史
- [ ] 添加聊天功能
- [ ] 优化动画效果
- [ ] 添加音效
- [ ] 实现断线重连

---

<a name="english"></a>
## English

### Overview

This project implements a complete Four Color Card online multiplayer game system with:
- 4-player online battles
- AI bots (3 difficulty levels)
- Real-time game state synchronization
- Mobile adaptation
- Complete game rules implementation

### Technical Architecture

#### Backend
- **PocketBase v0.31**: Database and real-time communication
- **Go**: Custom API and business logic
- **Goja**: JavaScript game logic execution engine
- **Bot Scheduler**: Automated bot decision system

#### Frontend
- **Vue 3**: Composition API
- **Vite**: Build tool
- **Pinia**: State management
- **Vant 4**: Mobile UI components
- **PocketBase JS SDK**: API client

### Database Design

#### 1. users (Extended built-in user table)
```
- username: Username
- email: Email
- is_bot: Whether it's a bot
- bot_level: Bot difficulty (easy/normal/hard)
```

#### 2. game_rules (Game Rules)
```
- name: Rule name
- description: Description
- category: Game category
- config_json: Game configuration
- logic_file: JavaScript logic file
```

#### 3. tables (Game Tables)
```
- name: Room name
- rule: Associated game rule
- owner: Room owner
- status: Status (waiting/playing/finished)
- players: Player list (max 4)
- player_states: Player states (seat, score, ready status)
- current_game: Current game state
- is_private: Whether private
- password: Room password
```

#### 4. game_states (Game States)
```
- table: Associated table
- round_number: Round number
- current_player_index: Current player index
- dealer_index: Dealer index
- current_player_turn: Current player ID
- player_hands: Player hands
- deck: Deck
- discard_pile: Discard pile
- last_play: Last play
- player_melds: Player revealed melds
- game_specific_data: Game-specific data
```

#### 5. game_actions (Game Actions)
```
- table: Table ID
- game_state: Game state ID
- player: Player ID
- sequence_number: Sequence number
- action_type: Action type (play_cards/chi/peng/kai/hu/draw/pass)
- action_data: Action data
```

### Four Color Card Rules

#### Card Deck
- **Basic cards**: 7 ranks × 4 colors = 28 cards
  - Ranks: General, Guard, Elephant, Chariot, Horse, Cannon, Soldier
  - Colors: Yellow, Red, Green, White
- **Special cards**: 5 gold cards (Duke, Marquis, Earl, Viscount, Baron)
- **Total**: 33 cards

#### Dealing
- Dealer: 21 cards
- Others: 20 cards
- Dealer reveals: Last card shown publicly

#### Game Flow
1. Current player plays a card
2. Next player responds:
   - Priority to draw from deck
   - Others can interrupt (hu/kai/peng)
   - Drawing player can chi or discard
3. Priority: Hu > Kai > Peng > Chi > Pass

#### Melds and Scoring

**Chi** (1-3 points):
- Chariot-Horse-Cannon same color (1 point)
- General-Guard-Elephant same color (1 point)
- 3 different color soldiers (1 point)
- 4 different color soldiers (2 points)
- Single general (1 point)
- Single gold card (3 points)

**Peng** (1 point):
- 3 same color, same rank

**Kai** (6 points):
- 4 same color, same rank (revealed kong)

**Kan** (3 points):
- 3 same color, same rank (concealed pung)
- Gold kan (9 points)

**Yu** (8 points):
- 4 same color, same rank (concealed kong)
- Gold yu (24 points)

**Win**:
- Small win: No kai/yu, score = base 3 + chi/peng/kan points
- Big win: Has kai/yu, score = (base 3 + all melds) × 2

#### Settlement
- Winner collects from all others
- Others settle kan/kai/yu among themselves

### API Endpoints

#### Authentication
```
POST /api/collections/users/auth-with-password
POST /api/collections/users/records
```

#### Game Management
```
POST /api/tables/create
  {
    "name": "Room name",
    "rule_id": "Rule ID",
    "is_private": false,
    "password": ""
  }

POST /api/tables/{id}/add-bot
  {
    "seat_index": 0-3,
    "level": "easy|normal|hard"
  }

POST /api/game/action
  {
    "table_id": "Table ID",
    "action_type": "play_cards|chi|peng|kai|hu|draw|pass",
    "action_data": {}
  }
```

### Bot AI System

#### Decision Logic
1. **Response Phase**:
   - Check if can win (highest priority)
   - Check if can kai (upgrade peng)
   - Check if can peng
   - Check if can chi
   - Default draw

2. **Play Phase**:
   - Easy: Random play
   - Normal: Prefer isolated cards
   - Hard: Remember discards, avoid feeding

#### Difficulty Levels
- **Easy**: Random decisions, only win big hands
- **Normal**: Greedy algorithm, basic strategy
- **Hard**: Card counter, predict opponent needs

### Deployment Guide

#### Backend Deployment

```bash
# 1. Clone repository
git clone https://github.com/frog-software/CardGames.git
cd CardGames

# 2. Install dependencies
go mod download

# 3. Build
go build -o cardgames

# 4. Run
./cardgames serve

# Server runs on http://localhost:8090
```

#### Frontend Deployment

```bash
# 1. Enter frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Development mode
npm run dev

# 4. Production build
npm run build

# Frontend runs on http://localhost:3000
```

### Game Flow Example

1. **Create Account and Login**
   - Visit http://localhost:3000
   - Register new user
   - Login to lobby

2. **Create Room**
   - Click "Create New Room"
   - Enter room name
   - Choose public/private

3. **Add Bots**
   - Click empty seat
   - Select bot difficulty
   - Bot joins automatically

4. **Start Game**
   - Click "Start Game" when 4 players ready
   - System deals cards automatically
   - Play by turns

5. **Game Actions**
   - Play: Select card and click "Play"
   - Chi/Peng/Hu: Click corresponding button when your turn
   - Draw: Click "Draw" button

### Development Notes

1. **Real-time Sync**: Use PocketBase real-time subscriptions
2. **State Management**: Frontend uses Pinia for unified state
3. **Mobile First**: All UI adapted for mobile
4. **Error Handling**: Comprehensive error messages
5. **Performance**: Avoid unnecessary re-renders

### Known Limitations

1. Game start logic needs refinement
2. Chi/Peng/Hu validation needs optimization
3. Settlement UI to be implemented
4. Game history to be added
5. Reconnection feature to be implemented

### Future Improvements

- [ ] Refine game start logic
- [ ] Add settlement UI
- [ ] Implement game history
- [ ] Add chat functionality
- [ ] Optimize animations
- [ ] Add sound effects
- [ ] Implement reconnection

