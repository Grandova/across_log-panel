import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Space, Typography, Skeleton } from 'antd';
import {
  FireOutlined,
  UserOutlined,
  GlobalOutlined,
  ClusterOutlined,
  EyeOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/index.ts';
import { DashboardOverview, HostStatItem, NodeStatItem, TrendPoint } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

interface DashboardProps {
  darkMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ darkMode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [topHosts, setTopHosts] = useState<HostStatItem[]>([]);
  const [topNodes, setTopNodes] = useState<NodeStatItem[]>([]);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
      };

      const [ovRes, trendRes, hostsRes, nodesRes]: any = await Promise.all([
        dashboardApi.getOverview({ preset: 'today' }), // KPI cards focus on today
        dashboardApi.getTrend(params),
        dashboardApi.getTopHosts({ ...params, limit: 20 }),
        dashboardApi.getTopNodes({ ...params, limit: 10 }),
      ]);

      setOverview(ovRes);
      setTrendPoints(trendRes || []);
      setTopHosts(hostsRes || []);
      setTopNodes(nodesRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  // ECharts options for Trend
  const getTrendChartOption = () => {
    const xData = trendPoints.map((p) => p.bucket_local);
    const reqData = trendPoints.map((p) => p.requests);
    const userData = trendPoints.map((p) => p.users);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['访问请求数 (PV)', '活跃用户数 (UV)'],
        top: 0,
        textStyle: { color: darkMode ? '#e0e0e0' : '#333' },
      },
      grid: {
        left: '2%',
        right: '3%',
        bottom: '8%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: {
          color: darkMode ? '#a0a0a0' : '#666',
          rotate: xData.length > 20 ? 30 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '请求数',
          axisLabel: { color: darkMode ? '#a0a0a0' : '#666' },
          splitLine: { lineStyle: { color: darkMode ? '#333' : '#f0f0f0' } },
        },
        {
          type: 'value',
          name: '用户数',
          axisLabel: { color: darkMode ? '#a0a0a0' : '#666' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '访问请求数 (PV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: reqData,
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.4)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
              ],
            },
          },
        },
        {
          name: '活跃用户数 (UV)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: userData,
          itemStyle: { color: '#52c41a' },
        },
      ],
    };
  };

  const hostColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 65,
      render: (r: number) => (
        <span
          style={{
            display: 'inline-block',
            width: 24,
            height: 24,
            borderRadius: '50%',
            textAlign: 'center',
            lineHeight: '24px',
            fontWeight: 'bold',
            fontSize: 12,
            backgroundColor: r === 1 ? '#ff4d4f' : r === 2 ? '#fa8c16' : r === 3 ? '#faad14' : 'transparent',
            color: r <= 3 ? '#fff' : 'inherit',
          }}
        >
          {r}
        </span>
      ),
    },
    {
      title: 'Host 目标域名',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '访问请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: 'UID 用户数',
      dataIndex: 'users',
      key: 'users',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '独立 IP 数',
      dataIndex: 'ips',
      key: 'ips',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: any, record: HostStatItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/hosts/${encodeURIComponent(record.host)}`)}
        >
          画像
        </Button>
      ),
    },
  ];

  const nodeColumns = [
    {
      title: '节点 ID',
      dataIndex: 'node_id',
      key: 'node_id',
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '总请求量',
      dataIndex: 'requests',
      key: 'requests',
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '服务 UID',
      dataIndex: 'users',
      key: 'users',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '客户端 IP',
      dataIndex: 'ips',
      key: 'ips',
      render: (v: number) => formatNumber(v),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Bar: Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            实时访问大盘
          </Title>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
            基于 ClickHouse 高性能检索，全链路实时分析
          </div>
        </div>

        <Space wrap>
          <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ minWidth: 200, flex: 1 }}>
          <Card bordered={false} hoverable>
            {loading && !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="今日访问总记录"
                value={overview?.total_requests || 0}
                prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                formatter={(v) => formatNumber(Number(v))}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ minWidth: 200, flex: 1 }}>
          <Card bordered={false} hoverable>
            {loading && !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="今日活跃 UID"
                value={overview?.active_users || 0}
                prefix={<UserOutlined style={{ color: '#1677ff' }} />}
                formatter={(v) => formatNumber(Number(v))}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ minWidth: 200, flex: 1 }}>
          <Card bordered={false} hoverable>
            {loading && !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="今日独立用户 IP"
                value={overview?.unique_ips || 0}
                prefix={<GlobalOutlined style={{ color: '#13c2c2' }} />}
                formatter={(v) => formatNumber(Number(v))}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ minWidth: 200, flex: 1 }}>
          <Card bordered={false} hoverable>
            {loading && !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="今日访问 Host 数量"
                value={overview?.total_hosts || 0}
                prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                formatter={(v) => formatNumber(Number(v))}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ minWidth: 200, flex: 1 }}>
          <Card bordered={false} hoverable>
            {loading && !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="今日服务节点数"
                value={overview?.total_nodes || 0}
                prefix={<ClusterOutlined style={{ color: '#fa8c16' }} />}
                formatter={(v) => formatNumber(Number(v))}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Trend Line Chart */}
      <Card
        title="访问量与活跃用户趋势 (动态时间聚合)"
        bordered={false}
        extra={
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            根据所选时间范围自动按 5分钟/1小时/1天 划分时隙
          </span>
        }
      >
        {loading && trendPoints.length === 0 ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <ReactECharts option={getTrendChartOption()} style={{ height: 350, width: '100%' }} />
        )}
      </Card>

      {/* Host Top 20 & Node Top 10 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Host 访问 Top 20 排行"
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/hosts/ranking')}>
                查看完整榜单 <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              dataSource={topHosts}
              columns={hostColumns}
              rowKey="host"
              pagination={false}
              size="middle"
              loading={loading}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="节点负载排行 (Top 10)"
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/nodes')}>
                节点分析 <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              dataSource={topNodes}
              columns={nodeColumns}
              rowKey="node_id"
              pagination={false}
              size="middle"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
