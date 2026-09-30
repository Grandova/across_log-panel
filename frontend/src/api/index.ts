import client from './client.ts';
import {
  ClickHouseConfig,
  ClickHouseConfigResponse,
  DashboardOverview,
  DomainLookupItem,
  HostOverview,
  HostStatItem,
  HostUserItem,
  IPOverview,
  IPUserItem,
  LogQueryFilter,
  LogQueryResponse,
  NodeOverview,
  NodeStatItem,
  SearchDetectResult,
  TrendPoint,
  UserHostItem,
  UserOverview,
  AuditLogEntry,
} from './types.ts';

// Auth API
export const authApi = {
  login: (data: { username: string; password: string }) =>
    client.post<{ token: string; user: { username: string; role: string } }>('/auth/login', data),
  getMe: () => client.get<{ username: string; role: string }>('/auth/me'),
  logout: () => client.post('/auth/logout'),
};

// Settings & ClickHouse Connection API
export const settingsApi = {
  getDatabase: () => client.get<ClickHouseConfigResponse>('/settings/database'),
  testDatabase: (data: ClickHouseConfig) =>
    client.post<{ success: boolean; version?: string; latency_ms?: number; message?: string; error?: string }>(
      '/settings/database/test',
      data
    ),
  saveDatabase: (data: ClickHouseConfig) =>
    client.post<{ success: boolean; message: string; version: string; latency_ms: number }>(
      '/settings/database/save',
      data
    ),
};

// Dashboard API
export const dashboardApi = {
  getOverview: (params?: { start_time?: string; end_time?: string; preset?: string }) =>
    client.get<DashboardOverview>('/dashboard/overview', { params }),
  getTrend: (params?: { start_time?: string; end_time?: string; preset?: string; interval?: string }) =>
    client.get<TrendPoint[]>('/dashboard/trend', { params }),
  getTopHosts: (params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<HostStatItem[]>('/dashboard/top-hosts', { params }),
  getTopNodes: (params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<NodeStatItem[]>('/dashboard/top-nodes', { params }),
};

// Host Analytics API
export const hostApi = {
  getRanking: (params?: {
    start_time?: string;
    end_time?: string;
    preset?: string;
    limit?: number;
    node_id?: number;
    user_id?: number;
  }) => client.get<{ data: HostStatItem[] }>('/stats/hosts', { params }),
  getOverview: (host: string, params?: { start_time?: string; end_time?: string; preset?: string }) =>
    client.get<HostOverview>(`/hosts/${encodeURIComponent(host)}/overview`, { params }),
  getUsers: (
    host: string,
    params?: {
      start_time?: string;
      end_time?: string;
      preset?: string;
      sort_by?: string;
      order?: string;
      page?: number;
      page_size?: number;
    }
  ) =>
    client.get<{ total: number; page: number; page_size: number; data: HostUserItem[] }>(
      `/hosts/${encodeURIComponent(host)}/users`,
      { params }
    ),
  getLogs: (
    host: string,
    params?: { start_time?: string; end_time?: string; preset?: string; page?: number; page_size?: number }
  ) => client.get<LogQueryResponse>(`/hosts/${encodeURIComponent(host)}/logs`, { params }),
};

// User Analytics API
export const userApi = {
  getOverview: (uid: number | string, params?: { start_time?: string; end_time?: string; preset?: string }) =>
    client.get<UserOverview>(`/users/${uid}/overview`, { params }),
  getHosts: (uid: number | string, params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<{ data: UserHostItem[] }>(`/users/${uid}/hosts`, { params }),
  getLogs: (
    uid: number | string,
    params?: { start_time?: string; end_time?: string; preset?: string; page?: number; page_size?: number }
  ) => client.get<LogQueryResponse>(`/users/${uid}/logs`, { params }),
};

// Reverse Domain Lookup & Search Intent API
export const lookupApi = {
  domainLookup: (params: {
    domain: string;
    mode?: 'exact' | 'subdomain' | 'contains';
    start_time?: string;
    end_time?: string;
    preset?: string;
    page?: number;
    page_size?: number;
  }) =>
    client.get<{ total: number; page: number; page_size: number; data: DomainLookupItem[] }>('/lookup/domain', {
      params,
    }),
  detectSearch: (q: string) => client.get<SearchDetectResult>('/search/detect', { params: { q } }),
};

// Log Explorer & CSV Export API
export const logApi = {
  queryLogs: (filter: LogQueryFilter) => client.post<LogQueryResponse>('/logs/query', filter),
  exportCSV: async (filter: LogQueryFilter) => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/v1/logs/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(filter),
    });
    if (!response.ok) {
      throw new Error(`导出失败: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_logs_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

// IP Analytics API
export const ipApi = {
  getOverview: (ip: string, params?: { start_time?: string; end_time?: string; preset?: string }) =>
    client.get<IPOverview>(`/ips/${encodeURIComponent(ip)}/overview`, { params }),
  getHosts: (ip: string, params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<{ data: UserHostItem[] }>(`/ips/${encodeURIComponent(ip)}/hosts`, { params }),
  getUsers: (ip: string, params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<{ data: IPUserItem[] }>(`/ips/${encodeURIComponent(ip)}/users`, { params }),
  getLogs: (
    ip: string,
    params?: { start_time?: string; end_time?: string; preset?: string; page?: number; page_size?: number }
  ) => client.get<LogQueryResponse>(`/ips/${encodeURIComponent(ip)}/logs`, { params }),
};

// Node Analytics API
export const nodeApi = {
  getRanking: (params?: { start_time?: string; end_time?: string; preset?: string; limit?: number }) =>
    client.get<{ data: NodeStatItem[] }>('/nodes/ranking', { params }),
  getOverview: (nodeId: number | string, params?: { start_time?: string; end_time?: string; preset?: string }) =>
    client.get<NodeOverview>(`/nodes/${nodeId}/overview`, { params }),
  getLogs: (
    nodeId: number | string,
    params?: { start_time?: string; end_time?: string; preset?: string; page?: number; page_size?: number }
  ) => client.get<LogQueryResponse>(`/nodes/${nodeId}/logs`, { params }),
};

// Audit Logs API
export const auditApi = {
  getLogs: (params?: { page?: number; page_size?: number }) =>
    client.get<{ total: number; page: number; page_size: number; data: AuditLogEntry[] }>('/audit/logs', { params }),
  clearLogs: () => client.delete<{ success: boolean; message: string }>('/audit/logs'),
};
