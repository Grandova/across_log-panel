import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Typography,
  Tabs,
  Input,
  Select,
} from 'antd';
import {
  DesktopOutlined,
  UserOutlined,
  GlobalOutlined,
  ClusterOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { ipApi } from '../../api/index.ts';
import { IPOverview, UserHostItem, IPUserItem, AccessLog } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag, UserTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { LogDetailDrawer } from '../../components/LogDetailDrawer/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const IpAnalysis: React.FC = () => {
  const { ip: paramIp } = useParams<{ ip: string }>();
  const [currentIp, setCurrentIp] = useState<string>(paramIp || '');
  const [searchInput, setSearchInput] = useState<string>(paramIp || '');

  const [overview, setOverview] = useState<IPOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const [hosts, setHosts] = useState<UserHostItem[]>([]);
  const [hostLimit, setHostLimit] = useState<number>(20);
  const [users, setUsers] = useState<IPUserItem[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logTotal, setLogTotal] = useState<number>(0);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(50);

  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (paramIp) {
      setCurrentIp(paramIp);
      setSearchInput(paramIp);
    }
  }, [paramIp]);

  const loadData = async () => {
    if (!currentIp) return;
    setLoading(true);
    try {
      const params = {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
      };

      const [ovRes, hostsRes, usersRes, logsRes]: any = await Promise.all([
        ipApi.getOverview(currentIp, params),
        ipApi.getHosts(currentIp, { ...params, limit: hostLimit }),
        ipApi.getUsers(currentIp, { ...params, limit: 50 }),
        ipApi.getLogs(currentIp, { ...params, page: logPage, page_size: logPageSize }),
      ]);

      setOverview(ovRes);
      setHosts(hostsRes.data || []);
      setUsers(usersRes.data || []);
      setLogs(logsRes.data || []);
      setLogTotal(logsRes.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentIp, timeRange, hostLimit, logPage, logPageSize]);

  const handleSearch = () => {
    const val = searchInput.trim();
    if (val) {
      navigate(`/ips/${encodeURIComponent(val)}`);
    }
  };

  const hostColumns = [
    {
      title: '排名',
      key: 'index',
      width: 65,
      render: (_: any, __: any, idx: number) => <span style={{ fontWeight: 'bold' }}>{idx + 1}</span>,
    },
    {
      title: '目标 Host 域名',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '访问次数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '最后访问时间 (UTC+8)',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: UserHostItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/hosts/${encodeURIComponent(r.host)}`)}
        >
          查看域名
        </Button>
      ),
    },
  ];

  const userColumns = [
    {
      title: '关联 UID',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (uid: number) => <UserTag uid={uid} />,
    },
    {
      title: '从该 IP 发起的请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '最后活跃时间 (UTC+8)',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: IPUserItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/users/${r.user_id}`)}
        >
          查看 UID 画像
        </Button>
      ),
    },
  ];

  const logColumns = [
    {
      title: '时间 (UTC+8)',
      dataIndex: 'time_local',
      key: 'time_local',
      width: 170,
    },
    {
      title: '用户 UID',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (uid: number) => <UserTag uid={uid} />,
    },
    {
      title: '目标 Host 域名',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '网络协议',
      dataIndex: 'network',
      key: 'network',
    },
    {
      title: '服务节点',
      dataIndex: 'node_id',
      key: 'node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '出口目标 IP',
      dataIndex: 'dest_ip',
      key: 'dest_ip',
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip}</span>,
    },
    {
      title: '详情',
      key: 'action',
      width: 80,
      render: (_: any, record: AccessLog) => (
        <Button type="link" size="small" onClick={() => setSelectedLog(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search Input Bar */}
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Input
              prefix={<DesktopOutlined />}
              placeholder="输入查询的客户端 IP (如 39.173.76.126)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 280 }}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              分析该 IP
            </Button>
          </Space>

          <Space wrap>
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} disabled={!currentIp}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>

      {currentIp ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              <DesktopOutlined style={{ color: '#13c2c2', marginRight: 8 }} />
              客户端 IP: {currentIp} 行为画像
            </Title>
          </div>

          {/* KPI Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="该 IP 总请求次数"
                  value={overview?.total_requests || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<DesktopOutlined style={{ color: '#13c2c2' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="关联 UID 数量"
                  value={overview?.user_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<UserOutlined style={{ color: '#1677ff' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="访问 Host 域名数"
                  value={overview?.host_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="通过节点数"
                  value={overview?.node_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<ClusterOutlined style={{ color: '#fa8c16' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="首次出现时间"
                  value={overview?.first_seen || '-'}
                  valueStyle={{ fontSize: 13 }}
                  prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="最后活跃时间"
                  value={overview?.last_seen || '-'}
                  valueStyle={{ fontSize: 13 }}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Tabs */}
          <Card bordered={false}>
            <Tabs
              defaultActiveKey="hosts"
              items={[
                {
                  key: 'hosts',
                  label: `该 IP 访问 Host 排行 (Top ${hostLimit})`,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Space>
                          <span style={{ fontSize: 13 }}>Top 数量:</span>
                          <Select
                            value={hostLimit}
                            onChange={(val) => setHostLimit(val)}
                            options={[
                              { value: 10, label: 'Top 10' },
                              { value: 20, label: 'Top 20' },
                              { value: 50, label: 'Top 50' },
                              { value: 100, label: 'Top 100' },
                            ]}
                            size="small"
                            style={{ width: 100 }}
                          />
                        </Space>
                      </div>

                      <Table
                        dataSource={hosts}
                        columns={hostColumns}
                        rowKey="host"
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'users',
                  label: `使用过此 IP 的 UID 列表 (${users.length})`,
                  children: (
                    <Table
                      dataSource={users}
                      columns={userColumns}
                      rowKey="user_id"
                      loading={loading}
                      pagination={{ pageSize: 20 }}
                    />
                  ),
                },
                {
                  key: 'logs',
                  label: `该 IP 原始流水 (${logTotal})`,
                  children: (
                    <Table
                      dataSource={logs}
                      columns={logColumns}
                      rowKey={(r, i) => `${r.time}-${r.host}-${i}`}
                      loading={loading}
                      pagination={{
                        current: logPage,
                        pageSize: logPageSize,
                        total: logTotal,
                        showSizeChanger: true,
                        pageSizeOptions: ['50', '100', '200'],
                        onChange: (p, ps) => {
                          setLogPage(p);
                          setLogPageSize(ps);
                        },
                      }}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
          <DesktopOutlined style={{ fontSize: 48, color: '#13c2c2', marginBottom: 16 }} />
          <Title level={4}>请输入想要分析的客户端 IP</Title>
          <div style={{ color: '#8c8c8c' }}>
            支持输入客户端 IPv4/IPv6，查看该 IP 下有哪些用户 UID、访问了什么域名以及经过哪些代理节点
          </div>
        </Card>
      )}

      {/* Detail Drawer */}
      <LogDetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  );
};
