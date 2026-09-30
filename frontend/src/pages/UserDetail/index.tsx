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
  Breadcrumb,
} from 'antd';
import {
  UserOutlined,
  GlobalOutlined,
  DesktopOutlined,
  ClusterOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { userApi } from '../../api/index.ts';
import { UserOverview, UserHostItem, AccessLog } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag, IPTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { LogDetailDrawer } from '../../components/LogDetailDrawer/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const UserDetail: React.FC = () => {
  const { uid: paramUid } = useParams<{ uid: string }>();
  const [currentUid, setCurrentUid] = useState<string>(paramUid || '');
  const [searchInput, setSearchInput] = useState<string>(paramUid || '');

  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Time range
  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  // Top Hosts tab state
  const [hosts, setHosts] = useState<UserHostItem[]>([]);
  const [hostLimit, setHostLimit] = useState<number>(20);

  // Logs stream tab state
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logTotal, setLogTotal] = useState<number>(0);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(50);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (paramUid) {
      setCurrentUid(paramUid);
      setSearchInput(paramUid);
    }
  }, [paramUid]);

  const loadData = async () => {
    if (!currentUid) return;
    setLoading(true);
    try {
      const params = {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
      };

      const [ovRes, hostsRes, logsRes]: any = await Promise.all([
        userApi.getOverview(currentUid, params),
        userApi.getHosts(currentUid, { ...params, limit: hostLimit }),
        userApi.getLogs(currentUid, { ...params, page: logPage, page_size: logPageSize }),
      ]);

      setOverview(ovRes);
      setHosts(hostsRes.data || []);
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
  }, [currentUid, timeRange, hostLimit, logPage, logPageSize]);

  const handleSearch = () => {
    const val = searchInput.trim();
    if (val) {
      navigate(`/users/${val}`);
    }
  };

  const hostColumns = [
    {
      title: '排名',
      key: 'index',
      width: 65,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontWeight: 'bold' }}>{index + 1}</span>
      ),
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
      title: '域名详情',
      key: 'action',
      width: 110,
      render: (_: any, record: UserHostItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/hosts/${encodeURIComponent(record.host)}`)}
        >
          查看域名
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
      title: '网络协议',
      dataIndex: 'network',
      key: 'network',
    },
    {
      title: '节点',
      dataIndex: 'node_id',
      key: 'node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '客户端 IP',
      dataIndex: 'user_ip',
      key: 'user_ip',
      render: (ip: string) => <IPTag ip={ip} />,
    },
    {
      title: '目标 Host 域名',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '目标出口 IP',
      dataIndex: 'dest_ip',
      key: 'dest_ip',
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip}</span>,
    },
    {
      title: '目标端口',
      dataIndex: 'dest_port',
      key: 'dest_port',
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
      {/* Top Search Input if landing on general user query */}
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Input
              prefix={<UserOutlined />}
              placeholder="输入查询的用户 UID (如 16728)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 260 }}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询用户画像
            </Button>
          </Space>

          <Space wrap>
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} disabled={!currentUid}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>

      {currentUid ? (
        <>
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              <UserOutlined style={{ color: '#1677ff', marginRight: 8 }} />
              UID: {currentUid} 用户画像
            </Title>
          </div>

          {/* Overview Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="用户总访问请求"
                  value={overview?.total_requests || 0}
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
                  title="使用过 IP 数量"
                  value={overview?.ip_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<DesktopOutlined style={{ color: '#13c2c2' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="经过服务节点数"
                  value={overview?.node_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<ClusterOutlined style={{ color: '#fa8c16' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="首次访问时间"
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

          {/* Tabs: Host Top N & Raw Logs */}
          <Card bordered={false}>
            <Tabs
              defaultActiveKey="hosts"
              items={[
                {
                  key: 'hosts',
                  label: `该 UID 访问 Host 排行 (Top ${hostLimit})`,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Space>
                          <span style={{ fontSize: 13 }}>展示 Top 数量:</span>
                          <Select
                            value={hostLimit}
                            onChange={(val) => setHostLimit(val)}
                            options={[
                              { value: 10, label: 'Top 10' },
                              { value: 20, label: 'Top 20' },
                              { value: 50, label: 'Top 50' },
                              { value: 100, label: 'Top 100' },
                              { value: 200, label: 'Top 200' },
                              { value: 500, label: 'Top 500' },
                            ]}
                            style={{ width: 110 }}
                            size="small"
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
                  key: 'logs',
                  label: `该用户完整访问日志明细 (${logTotal})`,
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
                        pageSizeOptions: ['50', '100', '200', '500'],
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
          <UserOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
          <Title level={4}>请输入想要查询的 UID</Title>
          <div style={{ color: '#8c8c8c' }}>
            支持输入数字 UID 查看用户访问过的所有域名、使用过的 IP、涉及节点及完整时间倒序流水
          </div>
        </Card>
      )}

      {/* Single Log Detail Drawer */}
      <LogDetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  );
};
