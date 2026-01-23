import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

// 创建一个自定义的AxiosInstance类型，使其返回响应数据而不是完整的AxiosResponse
interface CustomAxiosInstance extends AxiosInstance {
  <T = any>(config: AxiosRequestConfig): Promise<T>
  <T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  head<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
}

const instance = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
}) as CustomAxiosInstance

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response.data
  },
  (error) => {
    // 处理错误
    if (error.response) {
      // 服务器返回错误状态码
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          // 禁止访问
          console.error('Forbidden:', error.response.data)
          break
        case 404:
          // 资源不存在
          console.error('Not Found:', error.response.data)
          break
        case 500:
          // 服务器内部错误
          console.error('Server Error:', error.response.data)
          break
        default:
          console.error('Error:', error.response.data)
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('No response received:', error.request)
    } else {
      // 请求配置出错
      console.error('Request error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default instance
export { instance as axios }
