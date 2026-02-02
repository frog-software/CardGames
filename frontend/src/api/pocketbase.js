import PocketBase from 'pocketbase'

// Initialize PocketBase client
// Use environment variable for production, fallback to localhost for development
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8090'
const pb = new PocketBase(apiUrl)

// Enable auto cancellation for duplicate requests
pb.autoCancellation(false)

export default pb

// Helper functions

/**
 * Login user
 */
export async function login(email, password) {
  return await pb.collection('users').authWithPassword(email, password)
}

/**
 * Register user
 */
export async function register(email, password, username) {
  const data = {
    email,
    password,
    passwordConfirm: password,
    username,
    emailVisibility: true
  }
  return await pb.collection('users').create(data)
}

/**
 * Logout user
 */
export function logout() {
  pb.authStore.clear()
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return pb.authStore.model
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return pb.authStore.isValid
}

/**
 * Get all game rules
 */
export async function getGameRules() {
  return await pb.collection('game_rules').getFullList()
}

/**
 * Get all public tables
 */
export async function getTables() {
  return await pb.collection('tables').getFullList({
    expand: 'rule,owner,players',
    sort: '-created'
  })
}

/**
 * Get table by ID
 */
export async function getTable(id) {
  return await pb.collection('tables').getOne(id, {
    expand: 'rule,owner,players,current_game'
  })
}

/**
 * Create a new table
 */
export async function createTable(name, ruleId, isPrivate = false, password = '') {
  const response = await fetch('/api/tables/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': pb.authStore.token
    },
    body: JSON.stringify({
      name,
      rule_id: ruleId,
      is_private: isPrivate,
      password
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to create table')
  }
  
  return await response.json()
}

/**
 * Add bot to table
 */
export async function addBot(tableId, seatIndex, level = 'normal') {
  const response = await fetch(`/api/tables/${tableId}/add-bot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': pb.authStore.token
    },
    body: JSON.stringify({
      seat_index: seatIndex,
      level
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to add bot')
  }
  
  return await response.json()
}

/**
 * Execute game action
 */
export async function executeAction(tableId, actionType, actionData) {
  const response = await fetch('/api/game/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': pb.authStore.token
    },
    body: JSON.stringify({
      table_id: tableId,
      action_type: actionType,
      action_data: actionData
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to execute action')
  }
  
  return await response.json()
}

/**
 * Subscribe to table updates
 */
export function subscribeToTable(tableId, callback) {
  return pb.collection('tables').subscribe(tableId, callback)
}

/**
 * Subscribe to game actions
 */
export function subscribeToActions(tableId, callback) {
  return pb.collection('game_actions').subscribe('*', callback, {
    filter: `table = "${tableId}"`
  })
}

/**
 * Subscribe to game state updates
 */
export function subscribeToGameState(gameStateId, callback) {
  return pb.collection('game_states').subscribe(gameStateId, callback)
}

/**
 * Unsubscribe from all
 */
export function unsubscribeAll() {
  pb.realtime.unsubscribe()
}
