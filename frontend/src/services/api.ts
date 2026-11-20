
import axios from 'axios'
import type {
  AnalyzeResponse,
  RepositoryAnalysis,
} from '../types/repository'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface HealthResponse {
  status: string
  service: string
  version: string
}

export const checkBackendHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export const analyzeRepository = async (
  url: string
): Promise<RepositoryAnalysis> => {
  const response = await api.post<AnalyzeResponse>(
    '/api/analyze',
    { url }
  )

  if (!response.data.success) {
    throw new Error('Repository analysis failed')
  }

  const result = response.data.data

  if (!result) {
    throw new Error('API returned an empty repository analysis')
  }

  return result
}

export const getApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.detail ||
      error.message ||
      'Unable to connect to CodeAtlas API'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

export default api
