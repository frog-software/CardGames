<template>
  <div class="game-page">
    <van-nav-bar title="游戏中" left-arrow @click-left="handleBack" fixed placeholder />

    <div class="game-content">
      <!-- Game Board -->
      <div class="game-board">
        <!-- Top Player -->
        <div class="player player-top">
          <div class="player-info">
            <van-tag type="primary">{{ getPlayerName(2) }}</van-tag>
            <span class="card-count">{{ getPlayerCardCount(2) }}张</span>
          </div>
        </div>

        <!-- Left Player -->
        <div class="player player-left">
          <div class="player-info">
            <van-tag type="primary">{{ getPlayerName(1) }}</van-tag>
            <span class="card-count">{{ getPlayerCardCount(1) }}张</span>
          </div>
        </div>

        <!-- Center Area (Discard Pile) -->
        <div class="center-area">
          <div class="discard-pile">
            <div v-if="lastPlayedCard" class="last-card">
              {{ formatCard(lastPlayedCard) }}
            </div>
            <div v-else class="empty-pile">弃牌区</div>
          </div>
          <div class="deck-info">
            剩余: {{ deckCount }}张
          </div>
        </div>

        <!-- Right Player -->
        <div class="player player-right">
          <div class="player-info">
            <van-tag type="primary">{{ getPlayerName(3) }}</van-tag>
            <span class="card-count">{{ getPlayerCardCount(3) }}张</span>
          </div>
        </div>

        <!-- Current Player (Bottom) -->
        <div class="player player-bottom">
          <div class="player-info">
            <van-tag type="success">你 {{ getPlayerName(0) }}</van-tag>
            <span class="card-count">{{ myCards.length }}张</span>
          </div>
          
          <!-- Player's Hand -->
          <div class="hand-cards">
            <div
              v-for="(card, index) in myCards"
              :key="index"
              class="card"
              :class="{ selected: selectedCard === index }"
              @click="selectCard(index)"
            >
              {{ formatCard(card) }}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="actions" v-if="isMyTurn">
            <van-button size="small" type="primary" @click="handlePlay" :disabled="selectedCard === -1">
              出牌
            </van-button>
            <van-button size="small" @click="handleDraw">
              摸牌
            </van-button>
            <van-button size="small" type="warning" @click="handleChi">
              吃
            </van-button>
            <van-button size="small" type="success" @click="handlePeng">
              碰
            </van-button>
            <van-button size="small" type="danger" @click="handleHu">
              胡
            </van-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getTable, executeAction, subscribeToGameState, subscribeToActions } from '../api/pocketbase'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const table = ref(null)
const gameState = ref(null)
const myCards = ref([])
const selectedCard = ref(-1)
const lastPlayedCard = ref(null)
const deckCount = ref(33)

const isMyTurn = computed(() => {
  return gameState.value?.current_player_turn === authStore.user?.id
})

onMounted(async () => {
  await loadGame()
  
  // Subscribe to game updates
  if (table.value?.current_game) {
    subscribeToGameState(table.value.current_game, (data) => {
      if (data.action === 'update') {
        gameState.value = data.record
        updateGameDisplay()
      }
    })
    
    subscribeToActions(route.params.id, (data) => {
      if (data.action === 'create') {
        handleActionUpdate(data.record)
      }
    })
  }
})

onUnmounted(() => {
  // Cleanup subscriptions
})

async function loadGame() {
  try {
    const result = await getTable(route.params.id)
    table.value = result
    
    if (result.current_game) {
      gameState.value = result.expand?.current_game
      updateGameDisplay()
    }
  } catch (err) {
    showToast({ message: '加载失败：' + err.message, type: 'fail' })
  }
}

function updateGameDisplay() {
  if (!gameState.value) return
  
  // Update my hand
  const playerHands = gameState.value.player_hands || {}
  myCards.value = playerHands[authStore.user?.id] || []
  
  // Update deck count
  deckCount.value = (gameState.value.deck || []).length
  
  // Update last played card
  if (gameState.value.last_play) {
    lastPlayedCard.value = gameState.value.last_play.cards?.[0]
  }
}

function getPlayerName(seatIndex) {
  // TODO: Map seat index to player name
  return `玩家 ${seatIndex + 1}`
}

function getPlayerCardCount(seatIndex) {
  // TODO: Get actual card count for seat
  return 20
}

function formatCard(card) {
  if (!card) return ''
  
  const suitIcons = {
    yellow: '🟡',
    red: '🔴',
    green: '🟢',
    white: '⚪'
  }
  
  return `${suitIcons[card.suit] || ''} ${card.rank}`
}

function selectCard(index) {
  selectedCard.value = selectedCard.value === index ? -1 : index
}

async function handlePlay() {
  if (selectedCard.value === -1) return
  
  try {
    const card = myCards.value[selectedCard.value]
    await executeAction(table.value.id, 'play_cards', { cards: [card] })
    selectedCard.value = -1
    showToast({ message: '出牌成功', type: 'success' })
  } catch (err) {
    showToast({ message: '出牌失败：' + err.message, type: 'fail' })
  }
}

async function handleDraw() {
  try {
    await executeAction(table.value.id, 'draw', {})
    showToast({ message: '摸牌成功', type: 'success' })
  } catch (err) {
    showToast({ message: '摸牌失败：' + err.message, type: 'fail' })
  }
}

async function handleChi() {
  showToast({ message: '吃牌功能开发中...', type: 'fail' })
}

async function handlePeng() {
  showToast({ message: '碰牌功能开发中...', type: 'fail' })
}

async function handleHu() {
  showToast({ message: '胡牌功能开发中...', type: 'fail' })
}

function handleActionUpdate(action) {
  // Handle real-time action updates
  console.log('Action update:', action)
}

function handleBack() {
  router.push('/lobby')
}
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: #2d5016;
  overflow: hidden;
}

.game-content {
  padding: 16px;
  height: calc(100vh - 46px);
}

.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.player {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
}

.card-count {
  font-size: 12px;
  color: #666;
}

.player-top {
  transform: rotate(180deg);
}

.player-left {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
}

.player-right {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
}

.center-area {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.discard-pile {
  width: 120px;
  height: 160px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.last-card {
  font-size: 24px;
  color: white;
}

.empty-pile {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.deck-info {
  color: white;
  font-size: 14px;
}

.player-bottom {
  margin-top: auto;
}

.hand-cards {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow-x: auto;
  max-width: 100%;
}

.card {
  min-width: 60px;
  height: 80px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card.selected {
  transform: translateY(-8px);
  border-color: #1989fa;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.4);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px;
}

@media (max-width: 768px) {
  .card {
    min-width: 50px;
    height: 70px;
    font-size: 12px;
  }
}
</style>
