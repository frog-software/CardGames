# 四色牌游戏 - Quick Start Guide 快速入门指南

## 🚀 快速开始 Quick Start

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

5. **游戏操作** Game Actions
   - **出牌 Play**: 选择一张手牌，点击 "出牌"
   - **抓牌 Draw**: 从牌堆抓牌
   - **吃 Chi**: 与上家牌组成顺子
   - **碰 Peng**: 组成刻子
   - **开 Kai**: 添加第4张牌到刻子
   - **胡 Hu**: 胡牌获胜
   - **过 Pass**: 跳过响应

### 机器人测试模式 Bot Test Mode

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

### 问题: 无法创建房间  
**解决**: 
1. 确认后端正在运行 Ensure backend is running
2. 检查是否有游戏规则 Check if game rules exist
3. 重启后端服务器 Restart backend server

### 问题: 机器人不响应
**解决**: 刷新页面重新开始游戏

### 问题: 看不到游戏界面
**解决**: 
1. 确认前端服务器在端口8080运行
2. 确认后端服务器在端口8090运行
3. 检查浏览器控制台是否有错误

## 📂 文件结构 File Structure

```
pb_public/
├── index.html              # 主游戏界面 Main game UI
├── bot-test.html           # 机器人测试 Bot test mode
├── api-service.js          # API服务层 API service
├── bot-player.js           # 机器人逻辑 Bot logic
├── game-app.js             # 游戏应用 Game app
├── pocketbase-client.js    # PB客户端 PB client
└── README.md               # 详细文档 Detailed docs
```

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

### 观察要点 Observation Points
- 回合顺序是否正确 Turn order correct?
- 手牌数量是否正确 Card count correct?
- 响应优先级是否正确 Response priority correct?
- 得分计算是否正确 Scoring correct?

## 📞 支持 Support

如有问题，请查看:
For issues, please check:

1. 浏览器控制台日志 Browser console logs
2. 后端服务器日志 Backend server logs
3. `pb_public/README.md` 详细文档 Detailed documentation

---

**祝游戏愉快！ Enjoy the game! 🎴**
