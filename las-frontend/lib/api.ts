import axios from 'axios'
import { getActiveClientId } from './activeClient'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshToken) {
        if (typeof window !== 'undefined') window.location.href = '/login'
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
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
