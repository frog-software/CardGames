package main

import (
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
}
