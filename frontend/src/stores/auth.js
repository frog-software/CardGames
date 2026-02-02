import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb, { login, register, logout, getCurrentUser, isAuthenticated } from '../api/pocketbase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const isLoggedIn = computed(() => isAuthenticated() && user.value !== null)

  function checkAuth() {
    if (isAuthenticated()) {
      user.value = getCurrentUser()
    }
  }

  async function loginUser(email, password) {
    loading.value = true
    error.value = null
    try {
      const result = await login(email, password)
      user.value = result.record
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function registerUser(email, password, username) {
    loading.value = true
    error.value = null
    try {
      await register(email, password, username)
      // Auto login after registration
      await loginUser(email, password)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function logoutUser() {
    logout()
    user.value = null
  }

  return {
    user,
    loading,
    error,
    isLoggedIn,
    checkAuth,
    loginUser,
    registerUser,
    logoutUser
  }
})
