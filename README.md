# CardGames - 可扩展式在线多人卡牌游戏平台

一个基于 PocketBase 构建的高度可扩展的在线多人卡牌游戏平台。

## 核心理念

**"万物皆对象"** - 在这个平台中，游戏中的所有概念（规则、牌桌、玩家、牌局、每一次出牌）都是数据库中的一个记录。

### 核心特性

- **规则即配置**: 游戏规则作为数据存储，添加新游戏只需创建新记录
- **事件溯源**: 每个游戏动作都被记录，支持防作弊、断线重连、游戏复盘
- **状态机驱动**: 牌桌状态（等待中、游戏中、已结束）驱动游戏流程
- **可插拔游戏引擎**: 通过 JavaScript 逻辑文件实现不同游戏规则

## 技术栈

- **后端**: PocketBase (Go)
- **JavaScript引擎**: goja (用于游戏逻辑执行)
- **数据库**: SQLite (PocketBase 内置)
- **实时通信**: PocketBase Realtime API

## 项目结构

```
CardGames/
├── main.go                      # 主入口文件
├── collections.go               # 数据库集合定义
├── routes.go                    # API 路由和 hooks
├── seed_data.go                 # 示例数据初始化
├── game_logics/                 # 游戏逻辑文件目录
│   └── four_color_card.js       # 四色牌游戏逻辑
├── pb_data/                     # PocketBase 数据目录（自动创建）
└── README.md                    # 本文件
```

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

