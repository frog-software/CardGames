# Development Roadmap

This document tracks planned improvements and future work for the CardGames platform.

## Phase 1: MVP Completion ✅

- [x] Core database schema
- [x] PocketBase integration
- [x] JavaScript game logic engine
- [x] Four Color Card basic implementation
- [x] Security and access control rules
- [x] Documentation and examples
- [x] Test automation

## Phase 2: Production Readiness

### Critical for Production

#### 1. Deterministic Random Number Generation
**Priority: HIGH**  
**Affected: game_logics/four_color_card.js, line 15**

**Current State:**
- Using Math.random() for dealer selection and card shuffling
- Makes games non-deterministic and non-reproducible

**Required:**
- Implement seeded RNG based on table ID + round number
- Use crypto-secure random seed generation
- Store seed in game_specific_data for replay

**Benefits:**
- Event replay for debugging
- Anti-cheat verification
- Game state reconstruction
- Deterministic testing

**Implementation:**
```javascript
// Example approach
function getSeededRandom(tableId, roundNumber) {
    const seed = hashFunction(tableId + roundNumber);
    return new SeededRNG(seed);
}
```

#### 2. Complete Win Validation Logic
**Priority: HIGH**  
**Affected: game_logics/four_color_card.js, checkWinningHand()**

**Current State:**
- Simplified validation: `hand.length % 3 === 0 || hand.length % 3 === 1`
- Does not validate actual card combinations

**Required:**
- Implement complete Four Color Card win validation
- Verify all cards form valid groups (kan, chi, sequences)
- Check special winning patterns
- Validate jin_tiao (golden cards) rules
- Ensure proper meld combinations

**Algorithm Needed:**
1. Separate cards by type (regular vs jin_tiao)
2. Group by suits and ranks
3. Recursively check all possible combinations
4. Validate against Four Color Card rules

#### 3. Robust Error Handling
**Priority: MEDIUM**  
**Affected: seed_data.go, lines 20-21**

**Current State:**
- All errors treated as "record not found"
- Could mask database connection or permission issues

**Required:**
- Check for specific error types
- Distinguish between:
  - Record not found errors
  - Database connection failures
  - Permission denied errors
  - Other database errors
- Proper error logging and reporting

**Implementation:**
```go
import "github.com/pocketbase/pocketbase/daos"

if err != nil {
    if errors.Is(err, daos.ErrRecordNotFound) {
        // Record not found, continue with creation
    } else {
        // Actual error, return it
        return fmt.Errorf("failed to check existing rule: %w", err)
    }
}
```

### Important for UX

#### 4. Auto-Start Game Logic
**Priority: MEDIUM**  
**Affected: routes.go, OnRecordUpdate hook**

**Current State:**
- Tables remain in "waiting" status indefinitely
- No automatic transition to "playing"

**Required:**
- Check if all players are ready
- Verify minimum player count
- Create initial game_state
- Transition table status to "playing"
- Broadcast game start event

**Implementation Steps:**
1. Parse player_states JSON
2. Check all players have ready=true
3. Call game initialization logic
4. Update table status
5. Trigger real-time update

## Phase 3: Enhanced Features

### Game Engine Improvements

- [ ] **Game Pause/Resume**: Allow games to be paused and resumed
- [ ] **Turn Timer**: Implement time limits for player actions
- [ ] **Spectator Mode**: Allow non-players to watch games
- [ ] **Game Replay**: Full replay functionality using event log
- [ ] **AI Players**: Bot players for single-player mode

### Additional Games

- [ ] **Poker**: Texas Hold'em implementation
- [ ] **Mahjong**: Traditional Mahjong rules
- [ ] **Dou Dizhu**: Popular Chinese card game
- [ ] **Blackjack**: Casino-style game

### Platform Features

- [ ] **Matchmaking**: Automatic player matching system
- [ ] **Rankings**: Player leaderboards and ratings
- [ ] **Tournaments**: Multi-round tournament system
- [ ] **Chat System**: In-game text/voice chat
- [ ] **Friend System**: Add friends and create private rooms
- [ ] **Achievements**: Player progression and rewards

### Technical Improvements

- [ ] **Performance**: Optimize database queries
- [ ] **Caching**: Implement Redis for game state caching
- [ ] **Horizontal Scaling**: Multi-instance deployment
- [ ] **Monitoring**: Add metrics and alerting
- [ ] **Rate Limiting**: Enhanced rate limiting per user
- [ ] **WebSocket Optimization**: Connection pooling and compression

## Phase 4: Advanced Features

### Security Enhancements

- [ ] **Encryption**: End-to-end encryption for sensitive data
- [ ] **Fraud Detection**: ML-based cheat detection
- [ ] **DDoS Protection**: Advanced rate limiting
- [ ] **Audit Logging**: Comprehensive security audit trail

### Analytics

- [ ] **Game Analytics**: Track game metrics and player behavior
- [ ] **Business Intelligence**: Revenue and user analytics
- [ ] **A/B Testing**: Feature testing framework

### Mobile Support

- [ ] **Native Apps**: iOS and Android applications
- [ ] **Push Notifications**: Real-time game updates
- [ ] **Offline Mode**: Play against AI without connection

## Contributing

To work on any of these features:

1. Check the issue tracker for related discussions
2. Create a feature branch from `main`
3. Implement with tests
4. Update documentation
5. Submit pull request

## Priority Legend

- **HIGH**: Critical for production deployment
- **MEDIUM**: Important for good user experience
- **LOW**: Nice to have, can be deferred

## Timeline

- **Phase 2**: 2-4 weeks (production readiness)
- **Phase 3**: 2-3 months (enhanced features)
- **Phase 4**: 6+ months (advanced features)

## Questions or Suggestions?

Open an issue on GitHub to discuss roadmap items or suggest new features!
