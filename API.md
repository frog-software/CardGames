# API Documentation

## Overview

CardGames platform provides RESTful APIs and real-time subscriptions for managing card games.

## Base URL

```
http://localhost:8090/api
```

## Authentication

Most endpoints require authentication using PocketBase's authentication system.

### Login

```http
POST /api/collections/users/auth-with-password
Content-Type: application/json

{
  "identity": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "...",
  "record": {
    "id": "USER_ID",
    "email": "user@example.com",
    ...
  }
}
```

### Register

```http
POST /api/collections/users/records
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "username": "username"
}
```

## Game Rules

### List Game Rules

```http
GET /api/collections/game_rules/records
```

Response:
```json
{
  "page": 1,
  "perPage": 30,
  "totalPages": 1,
  "totalItems": 1,
  "items": [
    {
      "id": "RULE_ID",
      "name": "Four Color Card",
      "description": "四色牌游戏规则...",
      "logic_file": "four_color_card.js",
      "config_json": {...},
      "created": "2025-01-01 00:00:00.000Z",
      "updated": "2025-01-01 00:00:00.000Z"
    }
  ]
}
```

### Get Single Game Rule

```http
GET /api/collections/game_rules/records/:id
```

## Tables (Game Rooms)

### List Tables

```http
GET /api/collections/tables/records
```

Optional query parameters:
- `filter`: Filter expression (e.g., `status='waiting'`)
- `sort`: Sort field (e.g., `-created` for newest first)
- `expand`: Relations to expand (e.g., `rule,owner,players`)

### Create Table

```http
POST /api/collections/tables/records
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "My Game Room",
  "rule": "RULE_ID",
  "owner": "USER_ID",
  "status": "waiting",
  "is_private": false,
  "password": ""
}
```

### Update Table

```http
PATCH /api/collections/tables/records/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "players": ["USER_ID_1", "USER_ID_2"],
  "player_states": {
    "USER_ID_1": {"ready": true, "score": 0},
    "USER_ID_2": {"ready": false, "score": 0}
  }
}
```

### Join Table

To join a table, add your user ID to the `players` array:

```http
PATCH /api/collections/tables/records/:table_id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "players+": "YOUR_USER_ID"
}
```

Note: The `+` operator appends to the array.

### Leave Table

```http
PATCH /api/collections/tables/records/:table_id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "players-": "YOUR_USER_ID"
}
```

Note: The `-` operator removes from the array.

## Game States

### Get Current Game State

```http
GET /api/collections/game_states/records/:id?expand=table
Authorization: Bearer YOUR_TOKEN
```

Response:
```json
{
  "id": "STATE_ID",
  "table": "TABLE_ID",
  "round_number": 1,
  "current_player_turn": "USER_ID",
  "player_hands": {
    "USER_ID_1": [...cards...],
    "USER_ID_2": [...cards...]
  },
  "deck": [...cards...],
  "discard_pile": [...cards...],
  "player_melds": {...},
  "game_specific_data": {...}
}
```

## Game Actions

### List Actions for a Table

```http
GET /api/collections/game_actions/records?filter=table='TABLE_ID'&sort=sequence_number
Authorization: Bearer YOUR_TOKEN
```

### Create Action

```http
POST /api/collections/game_actions/records
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "table": "TABLE_ID",
  "game_state": "STATE_ID",
  "player": "USER_ID",
  "sequence_number": 1,
  "action_type": "play_cards",
  "action_data": {
    "cards": [
      {"suit": "red", "rank": "将", "type": "regular"}
    ]
  }
}
```

## Real-time Subscriptions

Using PocketBase JavaScript SDK:

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Subscribe to all game actions for a specific table
pb.collection('game_actions').subscribe('*', function (e) {
  if (e.record.table === 'YOUR_TABLE_ID') {
    console.log('New action:', e.action, e.record);
    // Update UI based on the action
  }
}, {
  filter: 'table = "YOUR_TABLE_ID"'
});

// Subscribe to table updates
pb.collection('tables').subscribe('YOUR_TABLE_ID', function (e) {
  console.log('Table updated:', e.record);
  // Update player list, status, etc.
});

// Unsubscribe when done
pb.collection('game_actions').unsubscribe();
```

## Game Action Types

### Four Color Card Game Actions

#### play_cards
Play a card from hand.

```json
{
  "action_type": "play_cards",
  "action_data": {
    "cards": [
      {"suit": "red", "rank": "将", "type": "regular"}
    ]
  }
}
```

#### chi
Claim a discarded card to form a meld.

```json
{
  "action_type": "chi",
  "action_data": {
    "cards": [
      {"suit": "red", "rank": "车", "type": "regular"},
      {"suit": "red", "rank": "马", "type": "regular"}
    ],
    "pattern": {
      "type": "sequence",
      "points": 1
    }
  }
}
```

#### peng
Claim a discarded card with a pair.

```json
{
  "action_type": "peng",
  "action_data": {}
}
```

#### kai
Add fourth card to an existing kan (triplet).

```json
{
  "action_type": "kai",
  "action_data": {}
}
```

#### hu
Win the game.

```json
{
  "action_type": "hu",
  "action_data": {}
}
```

#### draw
Draw a card from the deck.

```json
{
  "action_type": "draw",
  "action_data": {}
}
```

#### pass
Pass on responding to a discarded card.

```json
{
  "action_type": "pass",
  "action_data": {}
}
```

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid request",
  "data": {
    "field": ["error message"]
  }
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Authentication required",
  "data": {}
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Resource not found",
  "data": {}
}
```

## Rate Limiting

PocketBase includes built-in rate limiting. Default limits:
- 100 requests per 10 seconds per IP
- 5 failed login attempts per minute

## CORS

CORS is enabled for all origins by default in development mode. Configure appropriately for production.

## Webhooks

PocketBase supports webhooks for collection events. Configure in the admin dashboard:
- On record create
- On record update
- On record delete

## Admin API

Admin endpoints are available at `/api/admins/*` for super users only.

For more details, see [PocketBase API documentation](https://pocketbase.io/docs/api-overview/).
