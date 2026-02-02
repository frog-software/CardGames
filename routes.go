package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/apis"
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
		// TODO: Implement auto-start game logic when all players are ready
		// This should:
		// 1. Check if all players have player_states.ready = true
		// 2. Verify minimum player count is met
		// 3. Create initial game_state
		// 4. Transition table status to "playing"
		// 5. Broadcast game start event to all players
		
		// Example implementation outline:
		// record := e.Record
		// if record.GetString("status") == "waiting" {
		//     playerStates := record.Get("player_states")
		//     if allPlayersReady(playerStates) {
		//         startGame(e.App, record)
		//     }
		// }
		
		return e.Next()
	})
	
	// Custom API endpoints
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// POST /api/tables/create - Create a new table
		e.Router.POST("/api/tables/create", func(c *core.RequestEvent) error {
			if c.Auth == nil {
				return apis.NewUnauthorizedError("Authentication required", nil)
			}
			return createTableHandler(c, app)
		})
		
		// POST /api/tables/:id/add-bot - Add a bot to a table
		e.Router.POST("/api/tables/{id}/add-bot", func(c *core.RequestEvent) error {
			if c.Auth == nil {
				return apis.NewUnauthorizedError("Authentication required", nil)
			}
			return addBotHandler(c, app)
		})
		
		// POST /api/game/action - Execute a game action
		e.Router.POST("/api/game/action", func(c *core.RequestEvent) error {
			if c.Auth == nil {
				return apis.NewUnauthorizedError("Authentication required", nil)
			}
			return gameActionHandler(c, app)
		})
		
		return e.Next()
	})
}

// createTableHandler handles table creation
func createTableHandler(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	authRecord := c.Auth
	
	// Parse request
	var data struct {
		Name       string `json:"name"`
		RuleId     string `json:"rule_id"`
		IsPrivate  bool   `json:"is_private"`
		Password   string `json:"password"`
	}
	
	if err := c.BindBody(&data); err != nil {
		return apis.NewBadRequestError("Invalid request data", err)
	}
	
	// Create table record
	collection, err := app.FindCollectionByNameOrId("tables")
	if err != nil {
		return apis.NewApiError(500, "Failed to find tables collection", err)
	}
	
	table := core.NewRecord(collection)
	table.Set("name", data.Name)
	table.Set("rule", data.RuleId)
	table.Set("owner", authRecord.Id)
	table.Set("status", "waiting")
	table.Set("players", []string{authRecord.Id})
	table.Set("is_private", data.IsPrivate)
	table.Set("password", data.Password)
	table.Set("player_states", map[string]interface{}{
		authRecord.Id: map[string]interface{}{
			"ready": false,
			"score": 0,
			"seat":  0,
		},
	})
	
	if err := app.Save(table); err != nil {
		return apis.NewApiError(500, "Failed to create table", err)
	}
	
	return c.JSON(http.StatusOK, table)
}

// addBotHandler handles adding a bot to a table
func addBotHandler(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	authRecord := c.Auth
	
	// Get table ID
	tableId := c.Request.PathValue("id")
	table, err := app.FindRecordById("tables", tableId)
	if err != nil {
		return apis.NewNotFoundError("Table not found", err)
	}
	
	// Check if user is table owner
	if table.GetString("owner") != authRecord.Id {
		return apis.NewForbiddenError("Only table owner can add bots", nil)
	}
	
	// Parse request
	var data struct {
		SeatIndex int    `json:"seat_index"`
		Level     string `json:"level"`
	}
	
	if err := c.BindBody(&data); err != nil {
		return apis.NewBadRequestError("Invalid request data", err)
	}
	
	// Validate level
	if data.Level == "" {
		data.Level = "normal"
	}
	if data.Level != "easy" && data.Level != "normal" && data.Level != "hard" {
		return apis.NewBadRequestError("Invalid bot level", nil)
	}
	
	// Create bot user
	usersCollection, err := app.FindCollectionByNameOrId("_pb_users_auth_")
	if err != nil {
		return apis.NewApiError(500, "Failed to find users collection", err)
	}
	
	botName := fmt.Sprintf("Bot_%s_%d", data.Level, data.SeatIndex)
	botUser := core.NewRecord(usersCollection)
	botUser.Set("username", botName)
	botUser.Set("email", fmt.Sprintf("%s@bot.local", botName))
	botUser.SetPassword("bot_password_" + botName)
	botUser.Set("is_bot", true)
	botUser.Set("bot_level", data.Level)
	botUser.Set("verified", true)
	
	if err := app.Save(botUser); err != nil {
		return apis.NewApiError(500, "Failed to create bot user", err)
	}
	
	// Add bot to table
	players := table.GetStringSlice("players")
	players = append(players, botUser.Id)
	table.Set("players", players)
	
	// Update player states
	playerStates := table.Get("player_states")
	playerStatesMap, ok := playerStates.(map[string]interface{})
	if !ok {
		playerStatesMap = make(map[string]interface{})
	}
	
	playerStatesMap[botUser.Id] = map[string]interface{}{
		"ready": true, // Bots are always ready
		"score": 0,
		"seat":  data.SeatIndex,
	}
	table.Set("player_states", playerStatesMap)
	
	if err := app.Save(table); err != nil {
		return apis.NewApiError(500, "Failed to update table", err)
	}
	
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"bot_id":  botUser.Id,
		"message": fmt.Sprintf("Bot added to seat %d", data.SeatIndex),
	})
}

// gameActionHandler handles game actions
func gameActionHandler(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	authRecord := c.Auth
	
	// Parse request
	var data struct {
		TableId    string                 `json:"table_id"`
		ActionType string                 `json:"action_type"`
		ActionData map[string]interface{} `json:"action_data"`
	}
	
	if err := c.BindBody(&data); err != nil {
		return apis.NewBadRequestError("Invalid request data", err)
	}
	
	// Get table
	table, err := app.FindRecordById("tables", data.TableId)
	if err != nil {
		return apis.NewNotFoundError("Table not found", err)
	}
	
	// Check if user is a player at this table
	players := table.GetStringSlice("players")
	isPlayer := false
	for _, p := range players {
		if p == authRecord.Id {
			isPlayer = true
			break
		}
	}
	
	if !isPlayer {
		return apis.NewForbiddenError("You are not a player at this table", nil)
	}
	
	// Get current game state
	currentGameId := table.GetString("current_game")
	if currentGameId == "" {
		return apis.NewBadRequestError("No active game", nil)
	}
	
	gameState, err := app.FindRecordById("game_states", currentGameId)
	if err != nil {
		return apis.NewNotFoundError("Game state not found", err)
	}
	
	// Validate and apply action (simplified - should use game logic)
	// For now, just create the action record
	
	// Get the next sequence number
	actions, err := app.FindRecordsByFilter(
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
	collection, err := app.FindCollectionByNameOrId("game_actions")
	if err != nil {
		return apis.NewApiError(500, "Failed to find game_actions collection", err)
	}
	
	actionRecord := core.NewRecord(collection)
	actionRecord.Set("table", table.Id)
	actionRecord.Set("game_state", gameState.Id)
	actionRecord.Set("player", authRecord.Id)
	actionRecord.Set("sequence_number", sequenceNumber)
	actionRecord.Set("action_type", data.ActionType)
	
	actionDataJson, err := json.Marshal(data.ActionData)
	if err != nil {
		return apis.NewApiError(500, "Failed to marshal action data", err)
	}
	actionRecord.Set("action_data", string(actionDataJson))
	
	if err := app.Save(actionRecord); err != nil {
		return apis.NewApiError(500, "Failed to save action", err)
	}
	
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Action recorded",
	})
}
