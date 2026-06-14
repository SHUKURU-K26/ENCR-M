import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: `${BASE_URL}/api` })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('encr_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('encr_token')
      localStorage.removeItem('encr_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api