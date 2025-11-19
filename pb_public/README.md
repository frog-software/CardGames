# Four Color Card Game - Frontend

四色牌游戏前端 - 简易JS交互程序

## Overview 概述

This directory contains a simple JavaScript frontend for testing the Four Color Card game implementation. It includes two testing modes:

本目录包含用于测试四色牌游戏实现的简易JavaScript前端，包括两种测试模式：

1. **Human Player Mode** - 1 human + 3 bots (真人+三个机器人模式)
2. **Bot Test Mode** - 4 bots playing (四个机器人互玩模式)

## Files 文件

### Core Files 核心文件

- `pocketbase-client.js` - Minimal PocketBase client (without CDN dependencies)
- `api-service.js` - API service layer wrapping PocketBase calls
- `bot-player.js` - Bot player logic with simple AI strategy

### UI Files 界面文件

- `index.html` / `four-color-card-game.html` - Main game UI for human players
- `game-app.js` - Main application logic for human player mode
- `bot-test.html` - Bot-only test mode UI

## Usage 使用方法

### Prerequisites 前置条件

1. Backend server must be running:
   ```bash
   cd /path/to/CardGames
   go build -o cardgames
   ./cardgames serve
   ```

2. Serve frontend files:
   ```bash
   cd pb_public
   python3 -m http.server 8080
   ```

### Mode 1: Human Player Mode (真人玩家模式)

**URL:** `http://localhost:8080/index.html`

#### Steps 步骤:

1. **Login/Register** (登录/注册)
   - Use any email/password
   - Default: `player@example.com` / `password123`

2. **Create Room** (创建房间)
   - Enter room name
   - Click "Create Room"

3. **Add Bots** (添加机器人)
   - Click "Add Bot 1", "Add Bot 2", "Add Bot 3"
   - Each bot will auto-ready

4. **Ready Up** (准备)
   - Click "Ready" button
   - Once all 4 players are ready, "Start Game" becomes available

5. **Play** (游戏)
   - Click cards in your hand to select
   - Use action buttons: Play, Draw, Chi, Peng, Kai, Hu, Pass
   - Bots will play automatically
   - Observe game state in real-time

### Mode 2: Bot Test Mode (机器人测试模式)

**URL:** `http://localhost:8080/bot-test.html`

#### Purpose 目的:

Watch 4 bots play against each other to manually verify game logic correctness.

观察四个机器人互相对战，手动验证游戏逻辑的正确性。

#### Steps 步骤:

1. Open `bot-test.html` in browser
2. Click "创建并开始游戏 Create & Start Game"
3. Watch the game log for:
   - Player actions (play, draw, chi, peng, kai, hu, pass)
   - Game state changes
   - Turn progression
   - Errors or issues

#### What to Look For 观察要点:

- ✓ Bots follow game rules correctly
- ✓ Valid actions are accepted
- ✓ Invalid actions are rejected
- ✓ Turn order is correct
- ✓ Card counts are accurate
- ✓ Response priority works (chi/peng/kai/hu)
- ✓ Game ends correctly

## Game Rules 游戏规则

### Four Color Card (四色牌)

**Players:** 4 (4人)

**Deck:** 
- 4 suits × 7 ranks = 28 cards (四色×七种字=28张)
  - Suits: Yellow, Red, Green, White (黄、红、绿、白)
  - Ranks: 将士象车马炮卒
- 5 special cards (Jin Tiao/金条): 公侯伯子男

**Starting Cards:**
- Dealer: 21 cards (庄家：21张)
- Others: 20 cards each (其他：各20张)

**Actions Available:**
- **Play** (出牌): Discard one card
- **Draw** (抓牌): Draw from deck
- **Chi** (吃): Form sequence with previous player's discard
- **Peng** (碰): Form triplet with any player's discard
- **Kai** (开): Add 4th card to existing triplet
- **Hu** (胡): Win the game
- **Pass** (过): Skip response

**Scoring:**
- Small Hu (小胡): No Yu/Kai
- Big Hu (大胡): Has Yu/Kai (×2 multiplier)

## Bot Strategy 机器人策略

The bots use a simple strategy:

机器人使用简单策略：

- **10% chance** to attempt Hu when responding
- **30% chance** to attempt Peng if possible
- **20% chance** to attempt Chi if possible
- Otherwise: Pass
- When it's their turn: Draw card, then discard random card

This simple strategy is sufficient for testing game logic.

这个简单策略足够用于测试游戏逻辑。

## Troubleshooting 故障排除

### Issue: PocketBase not responding

**Solution:** Make sure backend server is running on port 8090

### Issue: Bots not playing

**Solution:** 
- Check browser console for errors
- Verify game status is "playing"
- Reload page and try again

### Issue: Can't see game log

**Solution:**
- Scroll down in log panel
- Click "Clear Log" and try again

### Issue: Actions not working

**Solution:**
- Make sure it's your turn (green indicator)
- Select exactly one card for Play action
- Wait for response phase for Chi/Peng/Kai/Hu

## API Reference API参考

### Main Classes 主要类

#### `PocketBase`
- Minimal PocketBase client
- `collection(name)` - Access collection
- `authStore` - Authentication state

#### `GameAPIService`  
- `login(email, password)` - Login
- `register(email, password, username)` - Register
- `createTable(name, ruleId)` - Create game table
- `addBotPlayer(tableId, botEmail)` - Add bot
- `playCards(tableId, cards)` - Play cards
- `draw(tableId)` - Draw card
- `chi/peng/kai/hu/pass(tableId)` - Game actions
- `subscribeToTable/GameActions()` - Real-time updates

#### `BotPlayer`
- `initialize()` - Setup bot
- `start()` - Start listening
- `stop()` - Stop bot
- `makeMove(gameState)` - Decide action

## Development 开发

### Adding New Features 添加新功能

1. Update `api-service.js` for new API calls
2. Update `game-app.js` or `bot-test.html` for UI
3. Test with both modes
4. Check bot behavior in bot test mode

### Debugging 调试

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for API calls
4. Use `console.log` in code
5. Watch bot test mode logs

## Credits 致谢

Created for testing the Four Color Card game backend implementation.

为测试四色牌游戏后端实现而创建。
