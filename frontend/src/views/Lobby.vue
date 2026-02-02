<template>
  <div class="lobby-page">
    <van-nav-bar title="游戏大厅 Lobby" fixed placeholder>
      <template #right>
        <van-button size="small" type="primary" @click="handleLogout">退出</van-button>
      </template>
    </van-nav-bar>

    <div class="lobby-content">
      <div class="user-info">
        <van-cell :title="`欢迎，${authStore.user?.username || 'User'}`" />
      </div>

      <van-cell-group title="创建游戏">
        <van-button type="primary" size="large" block @click="showCreateDialog = true">
          创建新房间 Create Room
        </van-button>
      </van-cell-group>

      <van-cell-group title="游戏房间列表">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            v-model:loading="loading"
            :finished="finished"
            finished-text="没有更多了"
            @load="loadTables"
          >
            <van-cell
              v-for="table in tables"
              :key="table.id"
              :title="table.name"
              :label="`玩家: ${table.players?.length || 0}/4 | 状态: ${statusText[table.status]}`"
              is-link
              @click="joinTable(table)"
            >
              <template #icon>
                <van-tag :type="table.status === 'waiting' ? 'primary' : 'success'" style="margin-right: 8px;">
                  {{ statusText[table.status] }}
                </van-tag>
              </template>
            </van-cell>
          </van-list>
        </van-pull-refresh>
      </van-cell-group>
    </div>

    <!-- Create Room Dialog -->
    <van-dialog
      v-model:show="showCreateDialog"
      title="创建房间"
      show-cancel-button
      @confirm="handleCreateRoom"
    >
      <van-form>
        <van-cell-group inset>
          <van-field
            v-model="createForm.name"
            label="房间名称"
            placeholder="请输入房间名称"
          />
          <van-field name="switch" label="私密房间">
            <template #input>
              <van-switch v-model="createForm.isPrivate" />
            </template>
          </van-field>
          <van-field
            v-if="createForm.isPrivate"
            v-model="createForm.password"
            type="password"
            label="房间密码"
            placeholder="请输入房间密码"
          />
        </van-cell-group>
      </van-form>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getTables, getGameRules, createTable, subscribeToTable } from '../api/pocketbase'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const authStore = useAuthStore()

const tables = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const showCreateDialog = ref(false)
const gameRule = ref(null)

const statusText = {
  waiting: '等待中',
  playing: '游戏中',
  finished: '已结束'
}

const createForm = ref({
  name: '',
  isPrivate: false,
  password: ''
})

onMounted(async () => {
  // Load game rules
  const rules = await getGameRules()
  gameRule.value = rules.find(r => r.name === 'Four Color Card')
  
  // Load tables
  await loadTables()
  
  // Subscribe to table updates
  // subscribeToTable('*', handleTableUpdate)
})

onUnmounted(() => {
  // Cleanup subscriptions if needed
})

async function loadTables() {
  try {
    loading.value = true
    const result = await getTables()
    tables.value = result
    finished.value = true
  } catch (err) {
    showToast({ message: '加载失败：' + err.message, type: 'fail' })
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  await loadTables()
  refreshing.value = false
}

async function handleCreateRoom() {
  if (!createForm.value.name) {
    showToast({ message: '请输入房间名称', type: 'fail' })
    return
  }

  if (!gameRule.value) {
    showToast({ message: '游戏规则未加载', type: 'fail' })
    return
  }

  try {
    const table = await createTable(
      createForm.value.name,
      gameRule.value.id,
      createForm.value.isPrivate,
      createForm.value.password
    )
    showToast({ message: '创建成功！', type: 'success' })
    router.push(`/room/${table.id}`)
  } catch (err) {
    showToast({ message: '创建失败：' + err.message, type: 'fail' })
  }
}

function joinTable(table) {
  if (table.status === 'playing') {
    // Check if user is already a player
    const isPlayer = table.players?.some(p => p === authStore.user.id)
    if (isPlayer) {
      router.push(`/game/${table.id}`)
    } else {
      showToast({ message: '游戏进行中，无法加入', type: 'fail' })
    }
  } else if (table.status === 'waiting') {
    router.push(`/room/${table.id}`)
  } else {
    showToast({ message: '游戏已结束', type: 'fail' })
  }
}

function handleLogout() {
  authStore.logoutUser()
  router.push('/')
}
</script>

<style scoped>
.lobby-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.lobby-content {
  padding: 16px;
}

.user-info {
  margin-bottom: 16px;
}

.van-cell-group {
  margin-bottom: 16px;
}
</style>
