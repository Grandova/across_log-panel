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
  InputNumber,
  Tag,
} from 'antd';
import {
  ClusterOutlined,
  UserOutlined,
  GlobalOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { nodeApi } from '../../api/index.ts';
import { NodeOverview, NodeStatItem, AccessLog } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag, UserTag, IPTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { LogDetailDrawer } from '../../components/LogDetailDrawer/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const NodeAnalysis: React.FC = () => {
  const { nodeId: paramNodeId } = useParams<{ nodeId: string }>();
  const [currentNodeId, setCurrentNodeId] = useState<number | null>(paramNodeId ? Number(paramNodeId) : null);
  const [inputNodeId, setInputNodeId] = useState<number | null>(paramNodeId ? Number(paramNodeId) : null);

  const [overview, setOverview] = useState<NodeOverview | null>(null);
  const [ranking, setRanking] = useState<NodeStatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [logTotal, setLogTotal] = useState<number>(0);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(50);

  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (paramNodeId) {
      setCurrentNodeId(Number(paramNodeId));
      setInputNodeId(Number(paramNodeId));
    }
  }, [paramNodeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
      };

      // 1. Always load node ranking table
      const rankRes: any = await nodeApi.getRanking({ ...params, limit: 50 });
      setRanking(rankRes.data || []);

      // 2. If node selected, load node overview and logs
      if (currentNodeId !== null) {
        const [ovRes, logsRes]: any = await Promise.all([
          nodeApi.getOverview(currentNodeId, params),
          nodeApi.getLogs(currentNodeId, { ...params, page: logPage, page_size: logPageSize }),
        ]);
        setOverview(ovRes);
        setLogs(logsRes.data || []);
        setLogTotal(logsRes.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentNodeId, timeRange, logPage, logPageSize]);

  const handleSearch = () => {
    if (inputNodeId !== null) {
      navigate(`/nodes/${inputNodeId}`);
    }
  };

  const rankColumns = [
    {
      title: '排名',
      key: 'idx',
      width: 65,
      render: (_: any, __: any, index: number) => <b>{index + 1}</b>,
    },
    {
      title: '服务节点 ID',
      dataIndex: 'node_id',
      key: 'node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '总访问请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '服务 UID 数量',
      dataIndex: 'users',
      key: 'users',
      sorter: (a: any, b: any) => a.users - b.users,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '承载客户端 IP 数',
      dataIndex: 'ips',
      key: 'ips',
      sorter: (a: any, b: any) => a.ips - b.ips,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, r: NodeStatItem) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/nodes/${r.node_id}`)}
        >
          节点画像
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
      title: '目标 Host',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '客户端 IP',
      dataIndex: 'user_ip',
      key: 'user_ip',
      render: (ip: string) => <IPTag ip={ip} />,
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
      {/* Control Bar */}
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <InputNumber
              placeholder="输入节点 ID，例如 19"
              value={inputNodeId}
              onChange={(val) => setInputNodeId(val)}
              onPressEnter={handleSearch}
              style={{ width: 220 }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              分析节点
            </Button>
          </Space>

          <Space wrap>
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
          </Space>
        </div>
      </Card>

      {currentNodeId !== null ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              <ClusterOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
              服务节点 #{currentNodeId} 运行画像
            </Title>
          </div>

          {/* KPI Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="节点总处理请求"
                  value={overview?.total_requests || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<ClusterOutlined style={{ color: '#fa8c16' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="服务活跃 UID"
                  value={overview?.active_users || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<UserOutlined style={{ color: '#1677ff' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="承载独立 IP 数"
                  value={overview?.unique_ips || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<DesktopOutlined style={{ color: '#13c2c2' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="转发 Host 数量"
                  value={overview?.host_count || 0}
                  formatter={(v) => formatNumber(Number(v))}
                  prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false}>
                <Statistic
                  title="最早记录时间"
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

          {/* Node Logs */}
          <Card bordered={false} title={`节点 #${currentNodeId} 访问流水 (${logTotal})`}>
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
          </Card>
        </>
      ) : null}

      {/* Global Node Ranking Card */}
      <Card bordered={false} title="全网服务节点负载排行">
        <Table
          dataSource={ranking}
          columns={rankColumns}
          rowKey="node_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Detail Drawer */}
      <LogDetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  );
};
