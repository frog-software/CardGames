package main

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
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
	gameRules.ListRule = nil
	gameRules.ViewRule = nil
	gameRules.CreateRule = nil
	gameRules.UpdateRule = nil
	gameRules.DeleteRule = nil
	
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

	// Create tables collection
	tables := core.NewBaseCollection("tables")
	tables.ListRule = nil
	tables.ViewRule = nil
	tables.CreateRule = nil
	tables.UpdateRule = nil
	tables.DeleteRule = nil
	
	tables.Fields.Add(
		&core.TextField{Name: "name", Required: true},
		&core.RelationField{Name: "rule", Required: true, CollectionId: gameRules.Id, MaxSelect: 1},
		&core.RelationField{Name: "owner", Required: true, CollectionId: "_pb_users_auth_", MaxSelect: 1},
		&core.SelectField{Name: "status", Required: true, Values: []string{"waiting", "playing", "finished"}, MaxSelect: 1},
		&core.RelationField{Name: "players", CollectionId: "_pb_users_auth_"},
		&core.JSONField{Name: "player_states"},
		&core.RelationField{Name: "current_game", MaxSelect: 1},
		&core.BoolField{Name: "is_private"},
		&core.TextField{Name: "password"},
	)

	if err := app.Save(tables); err != nil {
		return err
	}

	// Create game_states collection
	gameStates := core.NewBaseCollection("game_states")
	gameStates.ListRule = nil
	gameStates.ViewRule = nil
	gameStates.CreateRule = nil
	gameStates.UpdateRule = nil
	gameStates.DeleteRule = nil
	
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

	// Update tables collection to link current_game to game_states
	tablesCollection, _ := app.FindCollectionByNameOrId("tables")
	if relationField := tablesCollection.Fields.GetByName("current_game"); relationField != nil {
		if rf, ok := relationField.(*core.RelationField); ok {
			rf.CollectionId = gameStates.Id
		}
	}
	if err := app.Save(tablesCollection); err != nil {
		return err
	}

	// Create game_actions collection
	gameActions := core.NewBaseCollection("game_actions")
	gameActions.ListRule = nil
	gameActions.ViewRule = nil
	gameActions.CreateRule = nil
	gameActions.UpdateRule = nil
	gameActions.DeleteRule = nil
	
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
