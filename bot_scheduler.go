package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/dop251/goja"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// BotScheduler manages automated bot moves
type BotScheduler struct {
	app     *pocketbase.PocketBase
	ticker  *time.Ticker
	stopCh  chan bool
	running bool
}

// NewBotScheduler creates a new bot scheduler
func NewBotScheduler(app *pocketbase.PocketBase) *BotScheduler {
	return &BotScheduler{
		app:     app,
		stopCh:  make(chan bool),
		running: false,
	}
}

// Start begins the bot scheduler loop
func (bs *BotScheduler) Start() {
	if bs.running {
		return
	}

	bs.running = true
	bs.ticker = time.NewTicker(2 * time.Second) // Check every 2 seconds

	go func() {
		log.Println("Bot scheduler started")
		for {
			select {
			case <-bs.ticker.C:
				bs.processBotTurns()
			case <-bs.stopCh:
				log.Println("Bot scheduler stopped")
				return
			}
		}
	}()
}

// Stop halts the bot scheduler
func (bs *BotScheduler) Stop() {
	if !bs.running {
		return
	}
	bs.running = false
	bs.ticker.Stop()
	bs.stopCh <- true
}

// processBotTurns checks for tables where it's a bot's turn and executes their move
func (bs *BotScheduler) processBotTurns() {
	// Find all playing tables
	tables, err := bs.app.FindRecordsByFilter(
		"tables",
		"status = 'playing'",
		"-created",
		100,
		0,
	)

	if err != nil {
		log.Printf("Error fetching tables: %v", err)
		return
	}

	for _, table := range tables {
		bs.processBotTurnForTable(table)
	}
}

// processBotTurnForTable checks and executes bot turn for a specific table
func (bs *BotScheduler) processBotTurnForTable(table *core.Record) {
	// Get current game state
	currentGameId := table.GetString("current_game")
	if currentGameId == "" {
		return
	}

	gameState, err := bs.app.FindRecordById("game_states", currentGameId)
	if err != nil {
		return
	}

	// Get current player
	currentPlayerId := gameState.GetString("current_player_turn")
	if currentPlayerId == "" {
		return
	}

	// Check if current player is a bot
	player, err := bs.app.FindRecordById("_pb_users_auth_", currentPlayerId)
	if err != nil {
		return
	}

	isBot := player.GetBool("is_bot")
	if !isBot {
		return
	}

	// Simulate thinking delay with seeded random
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	thinkTime := time.Duration(2000+r.Intn(3000)) * time.Millisecond
	time.Sleep(thinkTime)

	// Execute bot decision
	bs.executeBotDecision(table, gameState, player)
}

// executeBotDecision gets bot's decision from game logic and executes it
func (bs *BotScheduler) executeBotDecision(table *core.Record, gameState *core.Record, bot *core.Record) {
	// Get game rule
	ruleId := table.GetString("rule")
	rule, err := bs.app.FindRecordById("game_rules", ruleId)
	if err != nil {
		log.Printf("Error fetching game rule: %v", err)
		return
	}

	// Load game logic
	logicFile := rule.GetString("logic_file")
	logicPath := fmt.Sprintf("game_logics/%s", logicFile)
	
	logicCode, err := os.ReadFile(logicPath)
	if err != nil {
		log.Printf("Error reading logic file: %v", err)
		return
	}

	// Execute bot decision using goja
	vm := goja.New()
	
	// Load the game logic
	if _, err := vm.RunString(string(logicCode)); err != nil {
		log.Printf("Error loading game logic: %v", err)
		return
	}

	// Get config
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(rule.GetString("config_json")), &config); err != nil {
		log.Printf("Error parsing config: %v", err)
		return
	}

	// Get game state data
	gameStateData := map[string]interface{}{
		"current_player_turn": gameState.GetString("current_player_turn"),
		"player_hands":        gameState.Get("player_hands"),
		"player_melds":        gameState.Get("player_melds"),
		"deck":                gameState.Get("deck"),
		"discard_pile":        gameState.Get("discard_pile"),
		"last_play":           gameState.Get("last_play"),
		"game_specific_data":  gameState.Get("game_specific_data"),
	}

	// Get bot level
	botLevel := bot.GetString("bot_level")
	if botLevel == "" {
		botLevel = "normal"
	}

	// Call botDecision function
	botDecisionFunc, ok := goja.AssertFunction(vm.Get("botDecision"))
	if !ok {
		log.Printf("botDecision function not found in game logic")
		return
	}

	result, err := botDecisionFunc(goja.Undefined(),
		vm.ToValue(config),
		vm.ToValue(gameStateData),
		vm.ToValue(bot.Id),
		vm.ToValue(botLevel),
	)

	if err != nil {
		log.Printf("Error calling botDecision: %v", err)
		return
	}

	// Convert result to map
	var decision map[string]interface{}
	if err := vm.ExportTo(result, &decision); err != nil {
		log.Printf("Error exporting decision: %v", err)
		return
	}

	// Execute the action
	bs.executeAction(table, gameState, bot, decision)
}

// executeAction executes the bot's chosen action
func (bs *BotScheduler) executeAction(table *core.Record, gameState *core.Record, bot *core.Record, decision map[string]interface{}) {
	actionType, ok := decision["action_type"].(string)
	if !ok {
		log.Printf("Invalid action type in decision")
		return
	}

	actionData, ok := decision["action_data"].(map[string]interface{})
	if !ok {
		actionData = make(map[string]interface{})
	}

	// Get the next sequence number
	actions, err := bs.app.FindRecordsByFilter(
		"game_actions",
		fmt.Sprintf("table = '%s'", table.Id),
		"-sequence_number",
		1,
		0,
	)

	sequenceNumber := 1
	if err == nil && len(actions) > 0 {
		lastSeq := actions[0].GetInt("sequence_number")
		sequenceNumber = lastSeq + 1
	}

	// Create action record
	collection, err := bs.app.FindCollectionByNameOrId("game_actions")
	if err != nil {
		log.Printf("Error finding game_actions collection: %v", err)
		return
	}

	actionRecord := core.NewRecord(collection)
	actionRecord.Set("table", table.Id)
	actionRecord.Set("game_state", gameState.Id)
	actionRecord.Set("player", bot.Id)
	actionRecord.Set("sequence_number", sequenceNumber)
	actionRecord.Set("action_type", actionType)
	
	actionDataJson, err := json.Marshal(actionData)
	if err != nil {
		log.Printf("Error marshaling action data: %v", err)
		return
	}
	actionRecord.Set("action_data", string(actionDataJson))

	if err := bs.app.Save(actionRecord); err != nil {
		log.Printf("Error saving bot action: %v", err)
		return
	}

	log.Printf("Bot %s executed action: %s", bot.GetString("username"), actionType)

	// Apply the action to game state
	bs.applyActionToGameState(table, gameState, bot, actionType, actionData)
}

// applyActionToGameState applies the action and updates game state
func (bs *BotScheduler) applyActionToGameState(table *core.Record, gameState *core.Record, player *core.Record, actionType string, actionData map[string]interface{}) {
	// Get game rule
	ruleId := table.GetString("rule")
	rule, err := bs.app.FindRecordById("game_rules", ruleId)
	if err != nil {
		log.Printf("Error fetching game rule: %v", err)
		return
	}

	// Load game logic
	logicFile := rule.GetString("logic_file")
	logicPath := fmt.Sprintf("game_logics/%s", logicFile)
	
	logicCode, err := os.ReadFile(logicPath)
	if err != nil {
		log.Printf("Error reading logic file: %v", err)
		return
	}

	// Execute apply function using goja
	vm := goja.New()
	
	// Load the game logic
	if _, err := vm.RunString(string(logicCode)); err != nil {
		log.Printf("Error loading game logic: %v", err)
		return
	}

	// Get config
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(rule.GetString("config_json")), &config); err != nil {
		log.Printf("Error parsing config: %v", err)
		return
	}

	// Get game state data
	gameStateData := map[string]interface{}{
		"current_player_turn": gameState.GetString("current_player_turn"),
		"player_hands":        gameState.Get("player_hands"),
		"player_melds":        gameState.Get("player_melds"),
		"deck":                gameState.Get("deck"),
		"discard_pile":        gameState.Get("discard_pile"),
		"last_play":           gameState.Get("last_play"),
		"game_specific_data":  gameState.Get("game_specific_data"),
	}

	// Call apply function
	functionName := fmt.Sprintf("apply%s", capitalize(actionType))
	applyFunc, ok := goja.AssertFunction(vm.Get(functionName))
	if !ok {
		log.Printf("Function %s not found in game logic", functionName)
		return
	}

	result, err := applyFunc(goja.Undefined(),
		vm.ToValue(config),
		vm.ToValue(gameStateData),
		vm.ToValue(player.Id),
		vm.ToValue(actionData),
	)

	if err != nil {
		log.Printf("Error calling %s: %v", functionName, err)
		return
	}

	// Convert result to map
	var newState map[string]interface{}
	if err := vm.ExportTo(result, &newState); err != nil {
		log.Printf("Error exporting new state: %v", err)
		return
	}

	// Update game state
	for key, value := range newState {
		gameState.Set(key, value)
	}

	if err := bs.app.Save(gameState); err != nil {
		log.Printf("Error updating game state: %v", err)
		return
	}
}

// capitalize capitalizes the first letter of a string
func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}
	
	// Handle special cases for action names
	switch s {
	case "play_cards":
		return "Play_cards"
	case "chi":
		return "Chi"
	case "peng":
		return "Peng"
	case "kai":
		return "Kai"
	case "hu":
		return "Hu"
	case "draw":
		return "Draw"
	case "pass":
		return "Pass"
	default:
		return s
	}
}
