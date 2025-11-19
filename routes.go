package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/dop251/goja"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// registerRoutes registers all custom API routes
func registerRoutes(app *pocketbase.PocketBase) {
	// Routes will be implemented using PocketBase hooks
	// For now, we'll set up basic structure

	app.OnRecordCreate("tables").BindFunc(func(e *core.RecordEvent) error {
		// Auto-add owner to players list
		record := e.Record
		owner := record.GetString("owner")
		players := record.GetStringSlice("players")
		
		// Check if owner is already in players
		found := false
		for _, p := range players {
			if p == owner {
				found = true
				break
			}
		}
		
		if !found {
			players = append(players, owner)
			record.Set("players", players)
		}
		
		return e.Next()
	})

	app.OnRecordUpdate("tables").BindFunc(func(e *core.RecordEvent) error {
		record := e.Record
		
		// Check if status changed to "playing" and no current_game exists
		if record.GetString("status") == "playing" && record.GetString("current_game") == "" {
			// Initialize game
			if err := initializeGameState(app, record); err != nil {
				log.Printf("Error initializing game state: %v", err)
				return err
			}
		}
		
		return e.Next()
	})

	// Process game actions
	app.OnRecordCreate("game_actions").BindFunc(func(e *core.RecordEvent) error {
		action := e.Record
		
		// Process the action and update game state
		if err := processGameAction(app, action); err != nil {
			log.Printf("Error processing game action: %v", err)
			return err
		}
		
		return e.Next()
	})
}

// initializeGameState creates the initial game state for a table
func initializeGameState(app *pocketbase.PocketBase, table *core.Record) error {
	// Get the game rule
	ruleId := table.GetString("rule")
	rule, err := app.FindRecordById("game_rules", ruleId)
	if err != nil {
		return fmt.Errorf("failed to find game rule: %w", err)
	}

	// Get player IDs
	playerIds := table.GetStringSlice("players")
	
	// Load and execute game logic
	logicFile := rule.GetString("logic_file")
	configJson := rule.GetString("config_json")
	
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJson), &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	// Execute JavaScript logic to initialize game
	initialState, err := executeInitializeGame(logicFile, config, playerIds)
	if err != nil {
		return fmt.Errorf("failed to initialize game: %w", err)
	}

	// Create game_state record
	gameStatesCollection, err := app.FindCollectionByNameOrId("game_states")
	if err != nil {
		return fmt.Errorf("failed to find game_states collection: %w", err)
	}

	gameState := core.NewRecord(gameStatesCollection)
	gameState.Set("table", table.Id)
	gameState.Set("round_number", 1)
	gameState.Set("current_player_turn", initialState["current_player_turn"])
	gameState.Set("player_hands", initialState["player_hands"])
	gameState.Set("deck", initialState["deck"])
	gameState.Set("discard_pile", initialState["discard_pile"])
	gameState.Set("last_play", initialState["last_play"])
	gameState.Set("player_melds", initialState["player_melds"])
	gameState.Set("game_specific_data", initialState["game_specific_data"])

	if err := app.Save(gameState); err != nil {
		return fmt.Errorf("failed to save game state: %w", err)
	}

	// Update table with current_game
	table.Set("current_game", gameState.Id)
	if err := app.Save(table); err != nil {
		return fmt.Errorf("failed to update table: %w", err)
	}

	log.Printf("Game initialized for table %s", table.Id)
	return nil
}

// executeInitializeGame runs the JavaScript initializeGame function
func executeInitializeGame(logicFile string, config map[string]interface{}, playerIds []string) (map[string]interface{}, error) {
	// Load JavaScript file
	scriptPath := filepath.Join("game_logics", logicFile)
	scriptContent, err := os.ReadFile(scriptPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read logic file: %w", err)
	}

	// Create JavaScript runtime
	vm := goja.New()
	
	// Execute the script
	if _, err := vm.RunString(string(scriptContent)); err != nil {
		return nil, fmt.Errorf("failed to execute script: %w", err)
	}

	// Call initializeGame function
	var initializeGame func(map[string]interface{}, []string) map[string]interface{}
	if err := vm.ExportTo(vm.Get("initializeGame"), &initializeGame); err != nil {
		return nil, fmt.Errorf("failed to export initializeGame: %w", err)
	}

	result := initializeGame(config, playerIds)
	return result, nil
}

// processGameAction processes a game action and updates the game state
func processGameAction(app *pocketbase.PocketBase, action *core.Record) error {
	// Get game state
	gameStateId := action.GetString("game_state")
	gameState, err := app.FindRecordById("game_states", gameStateId)
	if err != nil {
		return fmt.Errorf("failed to find game state: %w", err)
	}

	// Get table and rule
	tableId := action.GetString("table")
	table, err := app.FindRecordById("tables", tableId)
	if err != nil {
		return fmt.Errorf("failed to find table: %w", err)
	}

	ruleId := table.GetString("rule")
	rule, err := app.FindRecordById("game_rules", ruleId)
	if err != nil {
		return fmt.Errorf("failed to find rule: %w", err)
	}

	// Load game logic
	logicFile := rule.GetString("logic_file")
	configJson := rule.GetString("config_json")
	
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(configJson), &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	// Get current game state data
	currentState := map[string]interface{}{
		"player_hands":        gameState.Get("player_hands"),
		"deck":                gameState.Get("deck"),
		"discard_pile":        gameState.Get("discard_pile"),
		"current_player_turn": gameState.Get("current_player_turn"),
		"last_play":           gameState.Get("last_play"),
		"player_melds":        gameState.Get("player_melds"),
		"game_specific_data":  gameState.Get("game_specific_data"),
	}

	// Execute validation and application
	actionType := action.GetString("action_type")
	playerId := action.GetString("player")
	actionData := action.Get("action_data")

	// Validate action
	isValid, err := executeValidateAction(logicFile, actionType, config, currentState, playerId, actionData)
	if err != nil {
		return fmt.Errorf("failed to validate action: %w", err)
	}

	if !isValid {
		return fmt.Errorf("invalid action")
	}

	// Apply action
	newState, err := executeApplyAction(logicFile, actionType, config, currentState, playerId, actionData)
	if err != nil {
		return fmt.Errorf("failed to apply action: %w", err)
	}

	// Update game state
	gameState.Set("current_player_turn", newState["current_player_turn"])
	gameState.Set("player_hands", newState["player_hands"])
	gameState.Set("deck", newState["deck"])
	gameState.Set("discard_pile", newState["discard_pile"])
	gameState.Set("last_play", newState["last_play"])
	gameState.Set("player_melds", newState["player_melds"])
	gameState.Set("game_specific_data", newState["game_specific_data"])

	if err := app.Save(gameState); err != nil {
		return fmt.Errorf("failed to save game state: %w", err)
	}

	log.Printf("Action %s processed for player %s", actionType, playerId)
	return nil
}

// executeValidateAction runs the JavaScript validate function
func executeValidateAction(logicFile, actionType string, config, gameState map[string]interface{}, playerId string, actionData interface{}) (bool, error) {
	scriptPath := filepath.Join("game_logics", logicFile)
	scriptContent, err := os.ReadFile(scriptPath)
	if err != nil {
		return false, err
	}

	vm := goja.New()
	if _, err := vm.RunString(string(scriptContent)); err != nil {
		return false, err
	}

	// Call validate function
	funcName := fmt.Sprintf("validate%s", capitalizeFirst(actionType))
	validateFunc := vm.Get(funcName)
	if validateFunc == nil {
		return false, fmt.Errorf("validate function not found: %s", funcName)
	}

	result, err := vm.RunString(fmt.Sprintf("%s(config, gameState, playerId, actionData)", funcName))
	if err != nil {
		return false, err
	}

	// Set variables for the call
	vm.Set("config", config)
	vm.Set("gameState", gameState)
	vm.Set("playerId", playerId)
	vm.Set("actionData", actionData)

	result, err = vm.RunString(fmt.Sprintf("%s(config, gameState, playerId, actionData)", funcName))
	if err != nil {
		return false, err
	}

	resultObj := result.Export().(map[string]interface{})
	return resultObj["valid"].(bool), nil
}

// executeApplyAction runs the JavaScript apply function
func executeApplyAction(logicFile, actionType string, config, gameState map[string]interface{}, playerId string, actionData interface{}) (map[string]interface{}, error) {
	scriptPath := filepath.Join("game_logics", logicFile)
	scriptContent, err := os.ReadFile(scriptPath)
	if err != nil {
		return nil, err
	}

	vm := goja.New()
	if _, err := vm.RunString(string(scriptContent)); err != nil {
		return nil, err
	}

	// Set variables
	vm.Set("config", config)
	vm.Set("gameState", gameState)
	vm.Set("playerId", playerId)
	vm.Set("actionData", actionData)

	// Call apply function
	funcName := fmt.Sprintf("apply%s", capitalizeFirst(actionType))
	result, err := vm.RunString(fmt.Sprintf("%s(config, gameState, playerId, actionData)", funcName))
	if err != nil {
		return nil, err
	}

	return result.Export().(map[string]interface{}), nil
}

// capitalizeFirst capitalizes the first letter and handles underscores
func capitalizeFirst(s string) string {
	if len(s) == 0 {
		return s
	}
	// Convert play_cards to Play_cards
	result := ""
	capitalize := true
	for _, c := range s {
		if capitalize && c >= 'a' && c <= 'z' {
			result += string(c - 32)
			capitalize = false
		} else {
			result += string(c)
			if c == '_' {
				capitalize = true
			}
		}
	}
	return result
}
