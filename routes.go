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
		
		// Set default status
		if record.GetString("status") == "" {
			record.Set("status", "waiting")
		}
		
		return e.Next()
	})

	app.OnRecordUpdate("tables").BindFunc(func(e *core.RecordEvent) error {
		// Check if all players are ready and start game if so
		record := e.Record
		
		if record.GetString("status") == "waiting" {
			playerStates := record.Get("player_states")
			if playerStates != nil {
				// Could implement auto-start logic here
			}
		}
		
		return e.Next()
	})
}
