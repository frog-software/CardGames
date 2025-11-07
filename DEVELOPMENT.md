# Development Guide

## Getting Started with Development

### Prerequisites

- Go 1.21 or higher
- Basic understanding of JavaScript
- Familiarity with REST APIs

### Project Setup

1. Clone and build:
```bash
git clone https://github.com/frog-software/CardGames.git
cd CardGames
go mod download
go build -o cardgames
```

2. Run tests:
```bash
./test.sh
```

3. Start development server:
```bash
./cardgames serve --dev
```

The `--dev` flag enables:
- SQL query logging
- Detailed error messages
- Auto-reload (with tools like Air)

## Architecture Overview

### The "Everything is an Object" Philosophy

All game concepts are database records:
- **Rules** → `game_rules` records
- **Rooms** → `tables` records  
- **Game State** → `game_states` records
- **Actions** → `game_actions` records

This enables:
- Complete event replay
- Easy debugging
- Natural state management

### Data Flow

```
Player Action
    ↓
API Request
    ↓
Validate (JS logic)
    ↓
Create game_action record
    ↓
Update game_state
    ↓
Broadcast via WebSocket
    ↓
All Clients Updated
```

## Adding a New Game

### Step 1: Create Game Logic File

Create `game_logics/my_game.js`:

```javascript
/**
 * Initialize game state
 */
function initializeGame(config, playerIds) {
    // Create deck, shuffle, distribute cards
    return {
        player_hands: {...},
        deck: [...],
        discard_pile: [],
        current_player_turn: playerIds[0],
        player_melds: {},
        last_play: null,
        game_specific_data: {}
    };
}

/**
 * Validate play action
 */
function validatePlay_cards(config, gameState, playerId, actionData) {
    // Check if it's player's turn
    if (gameState.current_player_turn !== playerId) {
        return { valid: false, message: "Not your turn" };
    }
    
    // Validate the cards exist in hand
    // ... your validation logic ...
    
    return { valid: true, message: "Valid play" };
}

/**
 * Apply play action to state
 */
function applyPlay_cards(config, gameState, playerId, actionData) {
    const newState = { ...gameState };
    
    // Remove cards from hand
    // Add to discard pile
    // Update turn
    // ... your state update logic ...
    
    return newState;
}

// Implement validate* and apply* for each action type
```

### Step 2: Create Game Rule Record

Via PocketBase Admin UI:

1. Go to `http://localhost:8090/_/`
2. Navigate to `game_rules` collection
3. Create new record:
   - name: "My Game"
   - description: "Description of the game"
   - logic_file: "my_game.js"
   - config_json: 
   ```json
   {
     "meta": {
       "player_count": { "min": 2, "max": 4 }
     },
     "custom_data": {
       "your_game_specific": "configuration"
     }
   }
   ```

### Step 3: Test Your Game

1. Create a table with your new game rule
2. Add players
3. Test actions through API calls

## JavaScript Game Logic API

### Required Functions

Every game must implement:

#### `initializeGame(config, playerIds)`
- **Purpose**: Set up initial game state
- **Returns**: Initial `game_state` object
- **Called**: When game starts

#### `validate{ActionType}(config, gameState, playerId, actionData)`
- **Purpose**: Validate if action is legal
- **Returns**: `{ valid: boolean, message: string }`
- **Example**: `validatePlay_cards`, `validateDraw`

#### `apply{ActionType}(config, gameState, playerId, actionData)`
- **Purpose**: Apply action to state
- **Returns**: Updated `game_state` object
- **Example**: `applyPlay_cards`, `applyDraw`

### Action Naming Convention

Action type `play_cards` requires:
- `validatePlay_cards(...)`
- `applyPlay_cards(...)`

Note: Underscores in action type, camelCase after "validate"/"apply"

### Common Patterns

#### Checking Turn
```javascript
if (gameState.current_player_turn !== playerId) {
    return { valid: false, message: "Not your turn" };
}
```

#### Validating Cards in Hand
```javascript
const playerHand = gameState.player_hands[playerId];
const hasCard = playerHand.some(c => 
    c.suit === card.suit && c.rank === card.rank
);
```

#### Moving to Next Player
```javascript
const players = Object.keys(gameState.player_hands);
const currentIndex = players.indexOf(playerId);
const nextIndex = (currentIndex + 1) % players.length;
newState.current_player_turn = players[nextIndex];
```

## Working with the Database

### Querying Collections

```go
// Get all tables
tables, err := app.FindRecordsByFilter(
    "tables",
    "status = 'waiting'",
    "-created",
    100,
    0,
)

// Get single record
table, err := app.FindRecordById("tables", tableId)

// Get with filter
rule, err := app.FindFirstRecordByFilter(
    "game_rules",
    "name = 'Four Color Card'",
)
```

### Creating Records

```go
collection, err := app.FindCollectionByNameOrId("tables")
record := core.NewRecord(collection)
record.Set("name", "New Game")
record.Set("owner", userId)
record.Set("status", "waiting")
err := app.Save(record)
```

### Updating Records

```go
table, err := app.FindRecordById("tables", tableId)
players := table.GetStringSlice("players")
players = append(players, newPlayerId)
table.Set("players", players)
err := app.Save(table)
```

## Testing

### Manual Testing

1. Start server:
```bash
./cardgames serve --dev
```

2. Create admin account at `http://localhost:8090/_/`

3. Use admin UI to:
   - View collections
   - Create test data
   - Monitor real-time updates

### API Testing with curl

```bash
# Login
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"user@example.com","password":"password123"}'

# Create table
curl -X POST http://localhost:8090/api/collections/tables/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Game","rule":"RULE_ID","owner":"USER_ID","status":"waiting"}'
```

## Debugging

### Enable Verbose Logging

```bash
./cardgames serve --dev
```

This shows all SQL queries and API calls.

### Check Database State

```bash
sqlite3 pb_data/data.db "SELECT * FROM tables"
```

### Common Issues

**Collections not created:**
- Check server logs for errors
- Verify `initializeCollections` runs on serve

**JavaScript errors:**
- Check function names match action types
- Verify all required functions exist
- Use `console.log` in JS (appears in Go stdout)

**Action validation fails:**
- Check player turn
- Verify cards exist in hand
- Review game state structure

## Code Style

### Go Code
- Follow standard Go conventions
- Use `gofmt` for formatting
- Keep functions focused and small

### JavaScript Code
- Use descriptive variable names
- Comment complex logic
- Return explicit validation results

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests if applicable
4. Submit pull request

## Resources

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase JS SDK](https://github.com/pocketbase/js-sdk)
- [Goja (JS Runtime)](https://github.com/dop251/goja)

## Getting Help

- Create an issue on GitHub
- Check existing issues for solutions
- Review the API documentation
