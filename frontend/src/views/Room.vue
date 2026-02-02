<template>
  <div class="room-page">
    <van-nav-bar :title="table?.name || '房间'" left-arrow @click-left="handleBack" fixed placeholder />

    <div class="room-content">
      <van-cell-group title="房间信息">
        <van-cell title="房间状态" :value="statusText[table?.status]" />
        <van-cell title="玩家人数" :value="`${players.length}/4`" />
      </van-cell-group>

      <van-cell-group title="玩家列表">
        <div class="seats-container">
          <div
            v-for="seat in 4"
            :key="seat"
            class="seat"
            @click="handleSeatClick(seat - 1)"
          >
            <div v-if="getPlayerAtSeat(seat - 1)" class="player-info">
              <van-tag :type="getPlayerAtSeat(seat - 1).is_bot ? 'warning' : 'primary'">
                {{ getPlayerAtSeat(seat - 1).is_bot ? '🤖' : '👤' }}
              </van-tag>
              <div class="player-name">{{ getPlayerAtSeat(seat - 1).username }}</div>
              <van-tag v-if="getPlayerAtSeat(seat - 1).is_bot" size="small">
                {{ getPlayerAtSeat(seat - 1).bot_level }}
              </van-tag>
            </div>
            <div v-else class="empty-seat">
              <van-icon name="plus" size="32" />
              <div class="seat-label">空位 {{ seat }}</div>
            </div>
          </div>
        </div>
      </van-cell-group>

      <div class="actions" v-if="isOwner">
        <van-button type="success" size="large" block @click="handleStartGame" :disabled="!canStart">
          开始游戏 Start Game
        </van-button>
      </div>
    </div>

    <!-- Add Bot Dialog -->
    <van-action-sheet
      v-model:show="showBotSheet"
      title="添加机器人"
      :actions="botActions"
      @select="onBotSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getTable, addBot, subscribeToTable } from '../api/pocketbase'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const table = ref(null)
const players = ref([])
const loading = ref(false)
const showBotSheet = ref(false)
const selectedSeat = ref(-1)

const statusText = {
  waiting: '等待中',
  playing: '游戏中',
  finished: '已结束'
}

const botActions = [
  { name: '简单 Easy', value: 'easy' },
  { name: '普通 Normal', value: 'normal' },
  { name: '困难 Hard', value: 'hard' }
]

const isOwner = computed(() => {
  return table.value?.owner === authStore.user?.id
})

const canStart = computed(() => {
  return players.value.length === 4 && table.value?.status === 'waiting'
})

onMounted(async () => {
  await loadTable()
  
  // Subscribe to table updates
  subscribeToTable(route.params.id, (data) => {
    if (data.action === 'update') {
      table.value = data.record
      loadPlayers()
    }
  })
})

onUnmounted(() => {
  // Cleanup subscriptions
})

async function loadTable() {
  try {
    loading.value = true
    const result = await getTable(route.params.id)
    table.value = result
    await loadPlayers()
  } catch (err) {
    showToast({ message: '加载失败：' + err.message, type: 'fail' })
  } finally {
    loading.value = false
  }
}

async function loadPlayers() {
  if (!table.value) return
  
  // Get player details from player_states
  const playerStates = table.value.player_states || {}
  const playerIds = table.value.players || []
  
  // Fetch player details
  // For simplicity, we'll use the expanded players if available
  players.value = table.value.expand?.players || []
}

function getPlayerAtSeat(seatIndex) {
  const playerStates = table.value?.player_states || {}
  
  for (const [playerId, state] of Object.entries(playerStates)) {
    if (state.seat === seatIndex) {
      return players.value.find(p => p.id === playerId)
    }
  }
  
  return null
}

function handleSeatClick(seatIndex) {
  if (!isOwner.value) {
    showToast({ message: '只有房主可以添加机器人', type: 'fail' })
    return
  }

  const player = getPlayerAtSeat(seatIndex)
  if (player) {
    showToast({ message: '座位已被占用', type: 'fail' })
    return
  }

  selectedSeat.value = seatIndex
  showBotSheet.value = true
}

async function onBotSelect(action) {
  showBotSheet.value = false
  
  try {
    await addBot(table.value.id, selectedSeat.value, action.value)
    showToast({ message: '机器人已添加', type: 'success' })
    await loadTable()
  } catch (err) {
    showToast({ message: '添加失败：' + err.message, type: 'fail' })
  }
}

async function handleStartGame() {
  if (!canStart.value) {
    showToast({ message: '需要4名玩家才能开始', type: 'fail' })
    return
  }

  // TODO: Implement start game logic
  showToast({ message: '开始游戏功能开发中...', type: 'fail' })
}

function handleBack() {
  router.push('/lobby')
}
</script>

<style scoped>
.room-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.room-content {
  padding: 16px;
}

.seats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
}

.seat {
  aspect-ratio: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid #eee;
}

.seat:hover {
  border-color: #1989fa;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.2);
}

.player-info {
  text-align: center;
}

.player-name {
  margin: 8px 0;
  font-size: 14px;
  font-weight: bold;
}

.empty-seat {
  text-align: center;
  color: #999;
}

.seat-label {
  margin-top: 8px;
  font-size: 14px;
}

.actions {
  margin-top: 24px;
}

.van-cell-group {
  margin-bottom: 16px;
}
</style>
