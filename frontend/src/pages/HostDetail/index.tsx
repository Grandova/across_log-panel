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
  Radio,
  Breadcrumb,
} from 'antd';
import {
  GlobalOutlined,
  UserOutlined,
  DesktopOutlined,
  ClusterOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { hostApi } from '../../api/index.ts';
import { HostOverview, HostUserItem, AccessLog } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { UserTag, IPTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { LogDetailDrawer } from '../../components/LogDetailDrawer/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const HostDetail: React.FC = () => {
  const { host = '' } = useParams<{ host: string }>();
  const [overview, setOverview] = useState<HostOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Time range
  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  // Top UIDs tab state
  const [users, setUsers] = useState<HostUserItem[]>([]);
  const [userTotal, setUserTotal] = useState<number>(0);
  const [userPage, setUserPage] = useState<number>(1);
  const [userPageSize, setUserPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('requests');
  const [order, setOrder] = useState<string>('desc');

  // Logs stream tab state
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logTotal, setLogTotal] = useState<number>(0);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(50);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const navigate = useNavigate();

  const loadOverview = async () => {
    try {
      const res: any = await hostApi.getOverview(host, {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
      });
      setOverview(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res: any = await hostApi.getUsers(host, {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        sort_by: sortBy,
        order: order,
        page: userPage,
        page_size: userPageSize,
      });
      setUsers(res.data || []);
      setUserTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res: any = await hostApi.getLogs(host, {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        page: logPage,
        page_size: logPageSize,
      });
      setLogs(res.data || []);
      setLogTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadUsers();
    loadLogs();
  }, [host, timeRange, sortBy, order, userPage, userPageSize, logPage, logPageSize]);

  const userColumns = [
    {
      title: '用户 UID',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (uid: number) => <UserTag uid={uid} />,
    },
    {
      title: '访问请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: true,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '独立 IP 数',
      dataIndex: 'ip_count',
      key: 'ip_count',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '最近客户端 IP',
      dataIndex: 'last_user_ip',
      key: 'last_user_ip',
      render: (ip: string) => <IPTag ip={ip} />,
    },
    {
      title: '最近节点',
      dataIndex: 'last_node_id',
      key: 'last_node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '最近出口 IP:端口',
      key: 'dest',
      render: (_: any, r: HostUserItem) => (
        <span style={{ fontFamily: 'monospace' }}>
          {r.last_dest_ip}:{r.last_dest_port}
        </span>
      ),
    },
    {
      title: '首次访问 (UTC+8)',
      dataIndex: 'first_seen',
      key: 'first_seen',
      render: (v: string) => v || '-',
    },
    {
      title: '最后访问 (UTC+8)',
      dataIndex: 'last_seen',
      key: 'last_seen',
      sorter: true,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: HostUserItem) => (
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
      title: '客户端 IP',
      dataIndex: 'user_ip',
      key: 'user_ip',
      render: (ip: string) => <IPTag ip={ip} />,
    },
    {
      title: '节点',
      dataIndex: 'node_id',
      key: 'node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '网络协议',
      dataIndex: 'network',
      key: 'network',
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
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { title: <a onClick={() => navigate('/hosts/ranking')}>Host 排行榜</a> },
          { title: host },
        ]}
      />

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space align="center" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hosts/ranking')}>
            返回排行
          </Button>
          <div>
            <Title level={4} style={{ margin: 0, fontFamily: 'monospace', color: 'var(--primary)' }}>
              <GlobalOutlined style={{ marginRight: 8 }} />
              {host}
            </Title>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>目标域名深度画像与访问者下钻分析</div>
          </div>
        </Space>

        <Space wrap>
          <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
          <Button icon={<ReloadOutlined />} onClick={() => { loadOverview(); loadUsers(); loadLogs(); }} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* Overview Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="访问总请求数"
              value={overview?.total_requests || 0}
              formatter={(v) => formatNumber(Number(v))}
              prefix={<GlobalOutlined style={{ color: 'var(--primary)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="独立访问 UID"
              value={overview?.unique_users || 0}
              formatter={(v) => formatNumber(Number(v))}
              prefix={<UserOutlined style={{ color: 'var(--primary)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="独立客户端 IP"
              value={overview?.unique_ips || 0}
              formatter={(v) => formatNumber(Number(v))}
              prefix={<DesktopOutlined style={{ color: 'var(--teal)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="涉及服务节点"
              value={overview?.node_count || 0}
              formatter={(v) => formatNumber(Number(v))}
              prefix={<ClusterOutlined style={{ color: 'var(--orange)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="首次访问时间"
              value={overview?.first_seen || '-'}
              valueStyle={{ fontSize: 13 }}
              prefix={<ClockCircleOutlined style={{ color: 'var(--teal)' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="最后访问时间"
              value={overview?.last_seen || '-'}
              valueStyle={{ fontSize: 13 }}
              prefix={<ClockCircleOutlined style={{ color: 'var(--orange)' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs: Users List & Access Logs */}
      <Card bordered={false}>
        <Tabs
          defaultActiveKey="users"
          items={[
            {
              key: 'users',
              label: `访问此域名的 UID 列表 (${userTotal})`,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                      统计在此时间段内访问过 <b>{host}</b> 的所有用户，支持按请求量和最后活跃时间排序：
                    </span>
                    <Radio.Group
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setOrder('desc');
                      }}
                      size="small"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="requests">按访问次数排序</Radio.Button>
                      <Radio.Button value="last_seen">按最近时间排序</Radio.Button>
                    </Radio.Group>
                  </div>

                  <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="user_id"
                    loading={loading}
                    pagination={{
                      current: userPage,
                      pageSize: userPageSize,
                      total: userTotal,
                      showSizeChanger: true,
                      pageSizeOptions: ['20', '50', '100', '200'],
                      onChange: (p, ps) => {
                        setUserPage(p);
                        setUserPageSize(ps);
                      },
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'logs',
              label: `原始访问明细流水 (${logTotal})`,
              children: (
                <Table
                  dataSource={logs}
                  columns={logColumns}
                  rowKey={(r, i) => `${r.time}-${r.user_id}-${i}`}
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

      {/* Single Log Detail Drawer */}
      <LogDetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  );
};
