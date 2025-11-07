package main

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// initializeCollections creates all necessary collections for the game platform
func initializeCollections(app *pocketbase.PocketBase) error {
	// Check if collections already exist
	if _, err := app.FindCollectionByNameOrId("game_rules"); err == nil {
		// Collections already exist
		return nil
	}

	// Create game_rules collection
	gameRules := core.NewBaseCollection("game_rules")
	// Allow read access to all, but restrict write operations to admins only
	gameRules.ListRule = types.Pointer("@request.auth.id != ''") // Authenticated users can list
	gameRules.ViewRule = types.Pointer("@request.auth.id != ''") // Authenticated users can view
	gameRules.CreateRule = nil                                    // Only admins can create (default)
	gameRules.UpdateRule = nil                                    // Only admins can update
	gameRules.DeleteRule = nil                                    // Only admins can delete
	
	// Add fields
	gameRules.Fields.Add(
		&core.TextField{Name: "name", Required: true},
		&core.TextField{Name: "description"},
		&core.JSONField{Name: "config_json", Required: true},
		&core.TextField{Name: "logic_file", Required: true},
	)

	if err := app.Save(gameRules); err != nil {
		return err
	}

	// Create tables collection (without current_game relation initially)
	tables := core.NewBaseCollection("tables")
	// Authenticated users can list and view tables
	tables.ListRule = types.Pointer("@request.auth.id != ''")
	tables.ViewRule = types.Pointer("@request.auth.id != ''")
	// Users can create tables (they become the owner)
	tables.CreateRule = types.Pointer("@request.auth.id != ''")
	// Only table owner can update
	tables.UpdateRule = types.Pointer("@request.auth.id != '' && owner = @request.auth.id")
	// Only table owner can delete
	tables.DeleteRule = types.Pointer("@request.auth.id != '' && owner = @request.auth.id")
	
	tables.Fields.Add(
		&core.TextField{Name: "name", Required: true},
		&core.RelationField{Name: "rule", Required: true, CollectionId: gameRules.Id, MaxSelect: 1},
		&core.RelationField{Name: "owner", Required: true, CollectionId: "_pb_users_auth_", MaxSelect: 1},
		&core.SelectField{Name: "status", Required: true, Values: []string{"waiting", "playing", "finished"}, MaxSelect: 1},
		&core.RelationField{Name: "players", CollectionId: "_pb_users_auth_"},
		&core.JSONField{Name: "player_states"},
		&core.BoolField{Name: "is_private"},
		&core.TextField{Name: "password"},
	)

	if err := app.Save(tables); err != nil {
		return err
	}

	// Create game_states collection
	gameStates := core.NewBaseCollection("game_states")
	// Only table players can view game state
	gameStates.ListRule = types.Pointer("@request.auth.id != '' && table.players.id ?= @request.auth.id")
	gameStates.ViewRule = types.Pointer("@request.auth.id != '' && table.players.id ?= @request.auth.id")
	gameStates.CreateRule = nil // System creates game states
	gameStates.UpdateRule = nil // System updates game states
	gameStates.DeleteRule = nil // System deletes game states
	
	gameStates.Fields.Add(
		&core.RelationField{Name: "table", Required: true, CollectionId: tables.Id, MaxSelect: 1, CascadeDelete: true},
		&core.NumberField{Name: "round_number", Required: true},
		&core.RelationField{Name: "current_player_turn", CollectionId: "_pb_users_auth_", MaxSelect: 1},
		&core.JSONField{Name: "player_hands", Required: true},
		&core.JSONField{Name: "deck", Required: true},
		&core.JSONField{Name: "discard_pile"},
		&core.JSONField{Name: "last_play"},
		&core.JSONField{Name: "player_melds"},
		&core.JSONField{Name: "game_specific_data"},
	)

	if err := app.Save(gameStates); err != nil {
		return err
	}

	// Update tables collection to add current_game relation
	tablesCollection, _ := app.FindCollectionByNameOrId("tables")
	tablesCollection.Fields.Add(&core.RelationField{
		Name:         "current_game",
		CollectionId: gameStates.Id,
		MaxSelect:    1,
	})
	if err := app.Save(tablesCollection); err != nil {
		return err
	}

	// Create game_actions collection
	gameActions := core.NewBaseCollection("game_actions")
	// Only table players can view actions
	gameActions.ListRule = types.Pointer("@request.auth.id != '' && table.players.id ?= @request.auth.id")
	gameActions.ViewRule = types.Pointer("@request.auth.id != '' && table.players.id ?= @request.auth.id")
	// Players can create actions
	gameActions.CreateRule = types.Pointer("@request.auth.id != ''")
	gameActions.UpdateRule = nil // Actions are immutable
	gameActions.DeleteRule = nil // Actions cannot be deleted
	
	gameActions.Fields.Add(
		&core.RelationField{Name: "table", Required: true, CollectionId: tables.Id, MaxSelect: 1, CascadeDelete: true},
		&core.RelationField{Name: "game_state", Required: true, CollectionId: gameStates.Id, MaxSelect: 1, CascadeDelete: true},
		&core.RelationField{Name: "player", Required: true, CollectionId: "_pb_users_auth_", MaxSelect: 1},
		&core.NumberField{Name: "sequence_number", Required: true},
		&core.SelectField{Name: "action_type", Required: true, Values: []string{"play_cards", "chi", "peng", "kai", "hu", "draw", "pass"}, MaxSelect: 1},
		&core.JSONField{Name: "action_data", Required: true},
	)

	if err := app.Save(gameActions); err != nil {
		return err
	}

	return nil
}
