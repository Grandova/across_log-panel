export interface ClickHouseConfig {
  protocol: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  secure: boolean;
}

export interface ClickHouseConfigResponse {
  protocol: string;
  host: string;
  port: number;
  database: string;
  username: string;
  has_password: boolean;
  secure: boolean;
  connected: boolean;
  version: string;
  latency_ms: number;
  last_error?: string;
}

export interface AccessLog {
  time: string;
  network: string;
  node_id: number;
  user_id: number;
  user_ip: string;
  host: string;
  dest_ip: string;
  dest_port: number;
  time_local: string;
  time_utc: string;
  time_iso: string;
}

export interface LogQueryFilter {
  start_time?: string;
  end_time?: string;
  preset?: string;
  user_id?: number | null;
  user_ip?: string;
  host?: string;
  host_match?: 'exact' | 'subdomain' | 'contains';
  node_id?: number | null;
  network?: string;
  dest_ip?: string;
  dest_port?: number | null;
  sort_by?: string;
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface LogQueryResponse {
  total: number;
  page: number;
  page_size: number;
  data: AccessLog[];
  cost_ms: number;
}

export interface DashboardOverview {
  total_requests: number;
  active_users: number;
  unique_ips: number;
  total_hosts: number;
  total_nodes: number;
}

export interface TrendPoint {
  bucket_local: string;
  bucket_utc: string;
  requests: number;
  users: number;
}

export interface HostStatItem {
  rank: number;
  host: string;
  requests: number;
  users: number;
  ips: number;
  last_seen?: string;
}

export interface HostOverview {
  host: string;
  total_requests: number;
  unique_users: number;
  unique_ips: number;
  node_count: number;
  first_seen: string;
  last_seen: string;
}

export interface HostUserItem {
  user_id: number;
  requests: number;
  ip_count: number;
  last_user_ip: string;
  first_seen: string;
  last_seen: string;
  last_node_id: number;
  last_dest_ip: string;
  last_dest_port: number;
}

export interface UserOverview {
  user_id: number;
  total_requests: number;
  host_count: number;
  ip_count: number;
  node_count: number;
  first_seen: string;
  last_seen: string;
}

export interface UserHostItem {
  host: string;
  requests: number;
  last_seen: string;
}

export interface IPOverview {
  user_ip: string;
  total_requests: number;
  user_count: number;
  host_count: number;
  node_count: number;
  first_seen: string;
  last_seen: string;
}

export interface IPUserItem {
  user_id: number;
  requests: number;
  last_seen: string;
}

export interface NodeOverview {
  node_id: number;
  total_requests: number;
  active_users: number;
  unique_ips: number;
  host_count: number;
  first_seen: string;
  last_seen: string;
}

export interface NodeStatItem {
  node_id: number;
  requests: number;
  users: number;
  ips: number;
}

export interface DomainLookupItem {
  user_id: number;
  requests: number;
  ip_count: number;
  first_seen: string;
  last_seen: string;
}

export interface SearchDetectResult {
  query: string;
  type: 'uid' | 'ip' | 'host' | 'unknown';
  target_url: string;
  label: string;
}

export interface AuditLogEntry {
  id: number;
  time: string;
  time_local: string;
  username: string;
  client_ip: string;
  action: string;
  target: string;
  details: string;
  cost_ms: number;
}
