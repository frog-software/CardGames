# 四色牌游戏 - Quick Start Guide 快速入门指南

## 🚀 快速开始 Quick Start

### 0. 初始化机器人用户 Initialize Bot Users (FIRST TIME ONLY)

**首次使用必须运行此脚本！First-time users MUST run this script!**

```bash
# 启动后端服务器后运行 Run after starting backend server
chmod +x scripts/init-bots.sh
./scripts/init-bots.sh
```

这将创建测试所需的机器人用户账号。
This creates bot user accounts needed for testing.

### 1. 启动后端 Start Backend

```bash
cd /home/runner/work/CardGames/CardGames
go build -o cardgames
./cardgames serve --http=127.0.0.1:8090
```

后端将在 `http://127.0.0.1:8090` 启动
Backend runs at `http://127.0.0.1:8090`

### 2. 启动前端 Start Frontend

打开新终端 Open new terminal:

```bash
cd /home/runner/work/CardGames/CardGames/pb_public
python3 -m http.server 8080
```

前端将在 `http://localhost:8080` 启动
Frontend runs at `http://localhost:8080`

### 3. 访问游戏 Access Game

打开浏览器 Open browser:

- **真人玩家模式** Human Player Mode: `http://localhost:8080/index.html`
- **机器人测试模式** Bot Test Mode: `http://localhost:8080/bot-test.html`

## 📝 使用说明 Usage Instructions

### 真人玩家模式 Human Player Mode

支持1-4个真人玩家 Supports 1-4 human players

#### 单人+3机器人 (1 Human + 3 Bots)

1. **注册/登录** Register/Login
   - 默认账号 Default: `player@example.com` / `password123`
   - 点击 "注册 Register" 或 "登录 Login"

2. **创建房间** Create Room
   - 输入房间名称 Enter room name
   - 点击 "创建房间 Create Room"

3. **添加机器人** Add Bots
   - 点击 "添加机器人1 Add Bot 1"
   - 点击 "添加机器人2 Add Bot 2"  
   - 点击 "添加机器人3 Add Bot 3"

4. **准备开始** Get Ready
   - 点击 "准备 Ready"
   - 等待所有玩家准备就绪
   - 点击 "开始游戏 Start Game"

#### 四人真人对战 (4 Human Players)

**使用浏览器隐私模式测试 Use browser incognito/private mode:**

1. **玩家1 Player 1**: 普通窗口 Normal window
   - 注册: `player1@example.com` / `password123`
   - 创建房间 Create room

2. **玩家2 Player 2**: 隐私窗口1 Incognito window 1
   - 注册: `player2@example.com` / `password123`
   - 加入房间 Join room

3. **玩家3 Player 3**: 隐私窗口2 Incognito window 2
   - 注册: `player3@example.com` / `password123`
   - 加入房间 Join room

4. **玩家4 Player 4**: 隐私窗口3 Incognito window 3
   - 注册: `player4@example.com` / `password123`
   - 加入房间 Join room

5. 所有玩家点击"准备 Ready"，然后房主"开始游戏 Start Game"

#### 游戏操作 Game Actions

5. **游戏操作** Game Actions
   - **出牌 Play**: 选择一张手牌，点击 "出牌"
   - **抓牌 Draw**: 从牌堆抓牌
   - **吃 Chi**: 与上家牌组成顺子
   - **碰 Peng**: 组成刻子
   - **开 Kai**: 添加第4张牌到刻子
   - **胡 Hu**: 胡牌获胜
   - **过 Pass**: 跳过响应

### 机器人测试模式 Bot Test Mode

四个机器人自动对战 4 bots playing automatically

1. 打开 `http://localhost:8080/bot-test.html`
2. 点击 "创建并开始游戏 Create & Start Game"
3. 观察游戏日志 Watch game log
4. 验证游戏逻辑 Verify game logic

## 🎮 游戏规则 Game Rules

### 牌组 Deck
- 4种颜色 4 Colors: 黄yellow、红red、绿green、白white
- 7种字 7 Ranks: 将士象车马炮卒
- 5张金条 5 Jin Tiao: 公侯伯子男

### 玩家 Players
- 4人游戏 4 players
- 庄家21张牌 Dealer: 21 cards
- 其他玩家20张 Others: 20 cards each

### 动作 Actions
- **出牌** Play: 打出一张牌
- **抓牌** Draw: 从牌堆抓牌
- **吃** Chi: 组成顺子（车马炮、将士象、异色卒）
- **碰** Peng: 组成刻子（3张相同）
- **开** Kai: 刻子+第4张（计6分）
- **胡** Hu: 胡牌获胜

### 计分 Scoring
- **小胡** Small Win: 无"鱼"或"开" 
  - 得分 = 基础3分 + 吃 + 碰 + 坎
- **大胡** Big Win: 有"鱼"或"开"
  - 得分 = (基础3分 + 吃 + 碰 + 坎 + 开 + 鱼) × 2

## 🔧 故障排除 Troubleshooting

### 问题: 前端页面空白
**解决**: 刷新页面 (Ctrl+F5) 或清除浏览器缓存

### 问题: 无法创建房间 / "players.map is not a function"
**解决**: 
1. 确认后端正在运行 Ensure backend is running
2. 重启后端和前端服务器 Restart both servers
3. 清除浏览器缓存 Clear browser cache

### 问题: "Cannot create or find bot user"
**解决**: 运行初始化脚本 Run initialization script:
```bash
./scripts/init-bots.sh
```

### 问题: 机器人不响应
**解决**: 刷新页面重新开始游戏

### 问题: 看不到游戏界面
**解决**: 
1. 确认前端服务器在端口8080运行
2. 确认后端服务器在端口8090运行
3. 检查浏览器控制台是否有错误

## 📂 文件结构 File Structure

```
CardGames/
├── pb_public/              # 前端文件 (由PocketBase或HTTP服务器提供)
│   ├── index.html          # 主游戏界面 Main game UI
│   ├── bot-test.html       # 机器人测试 Bot test mode
│   ├── api-service.js      # API服务层 API service
│   ├── bot-player.js       # 机器人逻辑 Bot logic
│   ├── game-app.js         # 游戏应用 Game app
│   ├── pocketbase-client.js# PB客户端 PB client
│   └── README.md           # 详细文档 Detailed docs
├── scripts/
│   └── init-bots.sh        # 机器人初始化脚本 Bot init script
├── game_logics/
│   └── four_color_card.js  # 游戏逻辑 Game logic
├── main.go                 # 主程序 Main program
├── routes.go               # API路由 API routes
├── collections.go          # 数据库集合 DB collections
└── seed_data.go            # 种子数据 Seed data
```

**注意**: `frontend/` 目录已废弃，所有前端文件在 `pb_public/`
**Note**: `frontend/` directory is deprecated, all frontend files are in `pb_public/`

## 🎯 测试重点 Testing Focus

### 检查项目 Check Items
- ✓ 登录注册功能 Login/Register
- ✓ 创建房间 Create room
- ✓ 添加机器人 Add bots
- ✓ 开始游戏 Start game
- ✓ 出牌抓牌 Play/Draw cards
- ✓ 吃碰开胡 Chi/Peng/Kai/Hu
- ✓ 回合切换 Turn switching
- ✓ 游戏结束 Game end
- ✓ 四人真人对战 4 human players

### 观察要点 Observation Points
- 回合顺序是否正确 Turn order correct?
- 手牌数量是否正确 Card count correct?
- 响应优先级是否正确 Response priority correct?
- 得分计算是否正确 Scoring correct?

## 🤖 机器人账号 Bot Accounts

初始化脚本会创建以下账号 Init script creates these accounts:

- `bottest@example.com` / `bottest123`
- `bot1@example.com` / `bot123456`
- `bot2@example.com` / `bot123456`
- `bot3@example.com` / `bot123456`

## 📞 支持 Support

如有问题，请查看:
For issues, please check:

1. 浏览器控制台日志 Browser console logs
2. 后端服务器日志 Backend server logs
3. `pb_public/README.md` 详细文档 Detailed documentation
4. 运行 `./scripts/init-bots.sh` 初始化机器人 Run bot initialization

---

**祝游戏愉快！ Enjoy the game! 🎴**
