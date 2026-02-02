<template>
  <div class="home-page">
    <div class="logo-container">
      <h1 class="game-title">四色牌</h1>
      <p class="game-subtitle">Four Color Card Game</p>
    </div>

    <div class="auth-container">
      <van-tabs v-model:active="activeTab">
        <van-tab title="登录 Login">
          <van-form @submit="handleLogin">
            <van-cell-group inset>
              <van-field
                v-model="loginForm.email"
                name="email"
                label="邮箱"
                placeholder="请输入邮箱"
                :rules="[{ required: true, message: '请输入邮箱' }]"
              />
              <van-field
                v-model="loginForm.password"
                type="password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                :rules="[{ required: true, message: '请输入密码' }]"
              />
            </van-cell-group>
            <div style="margin: 16px;">
              <van-button round block type="primary" native-type="submit" :loading="loading">
                登录
              </van-button>
            </div>
          </van-form>
        </van-tab>

        <van-tab title="注册 Register">
          <van-form @submit="handleRegister">
            <van-cell-group inset>
              <van-field
                v-model="registerForm.username"
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                :rules="[{ required: true, message: '请输入用户名' }]"
              />
              <van-field
                v-model="registerForm.email"
                name="email"
                label="邮箱"
                placeholder="请输入邮箱"
                :rules="[{ required: true, message: '请输入邮箱' }]"
              />
              <van-field
                v-model="registerForm.password"
                type="password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                :rules="[{ required: true, message: '请输入密码' }]"
              />
              <van-field
                v-model="registerForm.passwordConfirm"
                type="password"
                name="passwordConfirm"
                label="确认密码"
                placeholder="请再次输入密码"
                :rules="[{ required: true, message: '请再次输入密码' }]"
              />
            </van-cell-group>
            <div style="margin: 16px;">
              <van-button round block type="primary" native-type="submit" :loading="loading">
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { showToast } from 'vant'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref(0)
const loading = ref(false)

const loginForm = ref({
  email: '',
  password: ''
})

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  passwordConfirm: ''
})

// Redirect if already logged in
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    router.push('/lobby')
  }
}, { immediate: true })

async function handleLogin() {
  loading.value = true
  try {
    await authStore.loginUser(loginForm.value.email, loginForm.value.password)
    showToast({ message: '登录成功！', type: 'success' })
    router.push('/lobby')
  } catch (err) {
    showToast({ message: '登录失败：' + err.message, type: 'fail' })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (registerForm.value.password !== registerForm.value.passwordConfirm) {
    showToast({ message: '两次密码输入不一致', type: 'fail' })
    return
  }

  loading.value = true
  try {
    await authStore.registerUser(
      registerForm.value.email,
      registerForm.value.password,
      registerForm.value.username
    )
    showToast({ message: '注册成功！', type: 'success' })
    router.push('/lobby')
  } catch (err) {
    showToast({ message: '注册失败：' + err.message, type: 'fail' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.logo-container {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.game-title {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.game-subtitle {
  font-size: 18px;
  opacity: 0.9;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .game-title {
    font-size: 36px;
  }

  .game-subtitle {
    font-size: 16px;
  }

  .auth-container {
    max-width: 100%;
  }
}
</style>
