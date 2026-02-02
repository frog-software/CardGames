# Four Color Card Game Frontend

Vue 3 + Vite + Vant 4 frontend for the Four Color Card online multiplayer game.

## Features

- 🎮 Mobile-first responsive design
- 👥 Real-time multiplayer gameplay
- 🤖 Support for AI bots with 3 difficulty levels
- 🔐 User authentication (register/login)
- 🎨 Modern UI with Vant components
- ⚡ Fast development with Vite

## Tech Stack

- **Vue 3** - Composition API
- **Vite** - Build tool
- **Pinia** - State management
- **Vue Router** - Routing
- **Vant 4** - Mobile UI components
- **PocketBase JS SDK** - Backend API

## Project Structure

```
frontend/
├── src/
│   ├── api/             # API services
│   │   └── pocketbase.js
│   ├── components/      # Reusable components
│   ├── stores/          # Pinia stores
│   │   └── auth.js
│   ├── views/           # Page components
│   │   ├── Home.vue     # Login/Register
│   │   ├── Lobby.vue    # Game lobby
│   │   ├── Room.vue     # Waiting room
│   │   └── Game.vue     # Game interface
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running on http://localhost:8090

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Features Overview

### 1. Authentication (Home.vue)
- User registration with email and password
- User login
- Bilingual UI (Chinese/English)

### 2. Game Lobby (Lobby.vue)
- View all available game rooms
- Create new rooms (public/private)
- Join existing rooms
- Real-time room list updates

### 3. Waiting Room (Room.vue)
- View room details
- Add AI bots to empty seats
- Configure bot difficulty (Easy/Normal/Hard)
- Start game when 4 players ready

### 4. Game Interface (Game.vue)
- Mobile-adapted game board
- View cards of all 4 players
- Play cards, draw, chi, peng, kai, hu actions
- Real-time game state updates
- Visual feedback for current turn

## API Integration

The frontend communicates with the PocketBase backend through:

1. **PocketBase SDK** - For standard CRUD operations
2. **Custom API endpoints**:
   - `POST /api/tables/create` - Create game table
   - `POST /api/tables/:id/add-bot` - Add bot to table
   - `POST /api/game/action` - Execute game action

3. **Real-time subscriptions**:
   - Table updates
   - Game state changes
   - Game actions stream

## Configuration

Update the PocketBase URL in `src/api/pocketbase.js`:

```javascript
const pb = new PocketBase('http://localhost:8090')
```

For production, use environment variables:

```javascript
const pb = new PocketBase(import.meta.env.VITE_API_URL || 'http://localhost:8090')
```

## Mobile Optimization

- Responsive layout for all screen sizes
- Touch-friendly controls
- Optimized for portrait orientation
- Card display adapted for small screens
- Viewport meta tag configured

## Future Enhancements

- [ ] Game replays and history
- [ ] Player statistics
- [ ] Chat functionality
- [ ] Sound effects
- [ ] Animations for card movements
- [ ] Tutorial/help screens
- [ ] Landscape mode support

## License

See main project LICENSE file.
