import type { DashboardConfig } from '../contexts/DashboardContext'
import { apiJsonRequest } from './apiClient'

type DashboardConfigApiResponse = {
  data?: DashboardConfig | { config?: DashboardConfig }
} & Record<string, unknown>

export type DashboardBackupApiEntry = {
  id?: string
  saved_at?: string
  savedAt?: string
  label?: string
  snapshot?: DashboardConfig
} & Record<string, unknown>

type DashboardBackupsApiResponse = {
  data?: DashboardBackupApiEntry[] | { backups?: DashboardBackupApiEntry[] }
} & Record<string, unknown>

export async function getDashboardConfig(): Promise<DashboardConfigApiResponse> {
  return apiJsonRequest<DashboardConfigApiResponse>('/dashboard/config', {
    method: 'GET',
  })
}

export async function listDashboardBackups(): Promise<DashboardBackupsApiResponse> {
  return apiJsonRequest<DashboardBackupsApiResponse>('/dashboard/backups', {
    method: 'GET',
  })
}

export async function putDashboardConfig(payload: Record<string, unknown>): Promise<void> {
  await apiJsonRequest('/dashboard/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteDashboardBackup(dashboardBackupId: string): Promise<void> {
  await apiJsonRequest(`/dashboard/backups/${dashboardBackupId}`, {
    method: 'DELETE',
  })
}
