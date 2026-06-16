import axios from 'axios'
import Cookies from 'js-cookie'
import { getActiveClientId } from './activeClient'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '')
  .replace(/^﻿/, '')  // strip BOM
  .replace(/\s+/g, '')     // strip accidental whitespace
  .replace(/\/$/, '')      // strip trailing slash

const api = axios.create({
  baseURL: API_URL || 'http://localhost:4000',
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Mirror the active tenant into a header the backend's requireClientScope
  // middleware enforces. Skipped for /clients and /auth which are scoped by
  // the authenticated user, not by an active client.
  const clientId = getActiveClientId()
  if (clientId) {
    config.headers['X-Client-Id'] = clientId
  }

  return config
})

/** Wipes the session everywhere — localStorage and the access-token cookie the
 *  proxy reads — then sends the user back to /login. */
function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  Cookies.remove('access_token')
  window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshToken) {
        clearSession()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/refresh`,
          { refreshToken }
        )
        localStorage.setItem('access_token', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        clearSession()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
