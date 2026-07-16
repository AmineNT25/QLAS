import axios from 'axios'
import { getActiveClientId } from './activeClient'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '')
  .replace(/^﻿/, '')  // strip BOM
  .replace(/\s+/g, '')     // strip accidental whitespace
  .replace(/\/$/, '')      // strip trailing slash

const api = axios.create({
  baseURL: API_URL || 'http://localhost:4000',
})

api.interceptors.request.use((config) => {
  const clientId = getActiveClientId()
  if (clientId) {
    config.headers['X-Client-Id'] = clientId
  }
  return config
})

export default api
