import { defineStore } from 'pinia'
import axios from '@/utils/axios'

interface User {
  id: number
  username: string
  email: string
  role: string
  createdAt: string
}

interface UserState {
  user: User | null
  token: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    token: localStorage.getItem('token') || null
  }),

  getters: {
    isLoggedIn: (state: UserState) => !!state.token,
    currentUser: (state: UserState) => state.user
  },

  actions: {
    async login(username: string, password: string): Promise<boolean> {
      try {
        const response = await axios.post('/api/admin/auth/login', {
          username,
          password
        })
        
        const { token, user } = response.data
        this.token = token
        this.user = user
        localStorage.setItem('token', token)
        
        return true
      } catch (error) {
        console.error('Login failed:', error)
        return false
      }
    },

    async logout(): Promise<void> {
      try {
        await axios.post('/api/admin/auth/logout')
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        this.token = null
        this.user = null
        localStorage.removeItem('token')
      }
    },

    async checkLogin(): Promise<boolean> {
      if (!this.token) {
        return false
      }

      try {
        const response = await axios.get('/api/admin/auth/profile')
        this.user = response.data
        return true
      } catch (error) {
        this.token = null
        this.user = null
        localStorage.removeItem('token')
        return false
      }
    },

    async getProfile(): Promise<User | null> {
      if (!this.token) {
        return null
      }

      try {
        const response = await axios.get('/api/admin/auth/profile')
        this.user = response.data
        return response.data
      } catch (error) {
        console.error('Get profile failed:', error)
        return null
      }
    }
  }
})
