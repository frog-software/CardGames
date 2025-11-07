package main

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// seedFourColorCard creates the Four Color Card game rule if it doesn't exist
func seedFourColorCard(app *pocketbase.PocketBase) error {
	// Check if rule already exists
	record, err := app.FindFirstRecordByFilter("game_rules", "name = 'Four Color Card'")
	
	// If record exists (no error), return early
	if err == nil && record != nil {
		return nil
	}
	
	// Continue with creation if record not found
	// TODO: For production, implement proper error type checking
	// to distinguish between "not found" and other database errors
	// Currently, any error is treated as "not found" which could
	// mask actual database connection or permission issues

	// Create the config JSON
	config := map[string]interface{}{
		"meta": map[string]interface{}{
			"player_count": map[string]interface{}{
				"min": 4,
				"max": 4,
			},
			"deck_type": "four_color_custom",
		},
		"setup": map[string]interface{}{
			"initial_cards": map[string]interface{}{
				"dealer": 21,
				"others": 20,
			},
		},
		"custom_data": map[string]interface{}{
			"deck_definition": map[string]interface{}{
				"suits": []string{"yellow", "red", "green", "white"},
				"ranks": []string{"将", "士", "象", "车", "马", "炮", "卒"},
				"special_rank": map[string]interface{}{
					"name":  "jin_tiao",
					"cards": []string{"公", "侯", "伯", "子", "男"},
					"color": "red",
				},
			},
			"chi_patterns": []map[string]interface{}{
				{
					"type":   "sequence",
					"ranks":  []string{"车", "马", "炮"},
					"points": 1,
				},
				{
					"type":   "sequence",
					"ranks":  []string{"将", "士", "象"},
					"points": 1,
				},
				{
					"type":   "soldier_diff_3",
					"points": 1,
				},
				{
					"type":   "soldier_diff_4",
					"points": 2,
				},
				{
					"type":   "single_jiang",
					"points": 1,
				},
				{
					"type":   "single_jin_tiao",
					"points": 3,
				},
			},
			"scoring_rules": map[string]interface{}{
				"jin_tiao_kan_multiplier": 3,
				"jin_tiao_yu_multiplier":  3,
				"da_hu_multiplier":        2,
				"liuju_deck_limit":        8,
			},
		},
	}

	configJson, err := json.Marshal(config)
	if err != nil {
		return err
	}

	// Create the game rule record
	collection, err := app.FindCollectionByNameOrId("game_rules")
	if err != nil {
		return err
	}

	record = core.NewRecord(collection)
	record.Set("name", "Four Color Card")
	record.Set("description", "四色牌游戏规则 - A traditional Chinese card game with four colored suits and special cards.")
	record.Set("category", "mahjong-like")
	record.Set("config_json", string(configJson))
	record.Set("logic_file", "four_color_card.js")

	return app.Save(record)
}
