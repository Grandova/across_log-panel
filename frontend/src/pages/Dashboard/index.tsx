import React, { useState, useEffect } from 'react';
import { Card, Statistic, Table, Button, Typography, Skeleton, Empty, theme } from 'antd';
import {
  FireOutlined,
  UserOutlined,
  GlobalOutlined,
  ClusterOutlined,
  EyeOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
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
  const { token } = theme.useToken();

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

  const getTrendChartOption = () => {
    const xData = trendPoints.map((p) => p.bucket_local);
    const reqData = trendPoints.map((p) => p.requests);
    const userData = trendPoints.map((p) => p.users);

    return {
      animationDuration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
      animationDurationUpdate: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450,
      animationEasing: 'cubicOut',
      textStyle: { fontFamily: token.fontFamily },
      tooltip: {
        backgroundColor: token.colorBgElevated,
        borderColor: token.colorBorderSecondary,
        textStyle: { color: token.colorText },
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['访问请求数 (PV)', '活跃用户数 (UV)'],
        top: 0,
        right: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 16,
        textStyle: { color: token.colorTextSecondary, fontSize: 11 },
      },
      grid: {
        left: '2%',
        right: '3%',
        bottom: '8%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: token.colorTextSecondary,
          rotate: xData.length > 20 ? 30 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '请求数',
          axisLabel: { color: token.colorTextSecondary },
          splitLine: { lineStyle: { color: token.colorBorderSecondary, type: 'dashed' } },
        },
        {
          type: 'value',
          name: '用户数',
          axisLabel: { color: token.colorTextSecondary },
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
          lineStyle: { width: 3 },
          itemStyle: { color: darkMode ? '#8db5df' : '#6c9bcf' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(25, 118, 210, 0.16)' },
                { offset: 1, color: 'rgba(25, 118, 210, 0.01)' },
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
          lineStyle: { width: 3 },
          itemStyle: { color: '#1b9c85' },
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
        <span className={`rank-badge${r <= 3 ? ' rank-top' : ''}`}>{String(r).padStart(2, '0')}</span>
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

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <Title level={2}>访问数据总览</Title>
          <p>访问统计 / 用户活跃 / 节点分析</p>
        </div>
        <Button className="refresh-button" icon={<ReloadOutlined />} onClick={loadData} loading={loading}>刷新数据</Button>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="metrics-grid">
            {[
              { title: '今日访问请求', value: overview?.total_requests, icon: <FireOutlined />, color: 'green' },
              { title: '今日活跃用户', value: overview?.active_users, icon: <UserOutlined />, color: 'red' },
              { title: '今日独立 IP', value: overview?.unique_ips, icon: <GlobalOutlined />, color: 'blue' },
            ].map((item) => (
              <Card key={item.title} className={`metric-card metric-${item.color}`} bordered={false}>
                {loading && !overview ? <Skeleton active paragraph={{ rows: 1 }} /> : (
                  <Statistic title={item.title} value={item.value || 0} formatter={(v) => formatNumber(Number(v))} />
                )}
                <div className="metric-ring" aria-hidden="true">
                  <svg viewBox="0 0 90 90"><circle cx="45" cy="45" r="36" pathLength="100" /></svg>
                  <span>{item.icon}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="dashboard-toolbar">
            <div><span className="section-indicator" />访问分析</div>
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />
          </div>

          <Card
            className="trend-card"
            title={<div className="card-heading">访问趋势<span>请求量与活跃用户随时间的变化</span></div>}
            bordered={false}
            extra={
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                按所选时间范围自动聚合
              </span>
            }
          >
            {loading && trendPoints.length === 0 ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : trendPoints.length === 0 ? (
              <div className="chart-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前时间范围暂无访问数据" /></div>
            ) : (
              <ReactECharts option={getTrendChartOption()} style={{ height: 310, width: '100%' }} />
            )}
          </Card>

          <Card
            title={<div className="card-heading">热门访问域名<span>HOST RANKING · TOP 20</span></div>}
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
              scroll={{ x: 'max-content' }}
              loading={loading}
            />
          </Card>
        </div>
        <aside className="dashboard-rail">
          <Card className="analytics-profile" bordered={false}>
            <div className="profile-emblem"><DatabaseOutlined /></div>
            <Title level={3}>Access<span>Log</span></Title>
            <p>用户访问日志分析</p>
            <Button type="link" onClick={() => navigate('/settings')}>管理数据连接 <ArrowRightOutlined /></Button>
          </Card>
          <h3 className="rail-heading">网络概况</h3>
          <Card className="network-metric" bordered={false}>
            <span className="section-icon section-green"><GlobalOutlined /></span>
            <Statistic title="今日访问域名" value={overview?.total_hosts || 0} formatter={(v) => formatNumber(Number(v))} />
          </Card>
          <Card className="network-metric" bordered={false}>
            <span className="section-icon section-red"><ClusterOutlined /></span>
            <Statistic title="今日服务节点" value={overview?.total_nodes || 0} formatter={(v) => formatNumber(Number(v))} />
          </Card>
          <Card
            title={<div className="card-heading">节点负载排行<span>NODE RANKING · TOP 10</span></div>}
            bordered={false}
            extra={
              <Button type="link" onClick={() => navigate('/nodes')}>
                节点分析 <ArrowRightOutlined />
              </Button>
            }
          >
            {loading && topNodes.length === 0 ? <Skeleton active /> : topNodes.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <div className="node-ranking">
                {topNodes.map((node, index) => (
                  <div className="node-ranking-row" key={node.node_id}>
                    <span className="node-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div><NodeTag nodeId={node.node_id} /><small>{formatNumber(node.users)} 用户 · {formatNumber(node.ips)} IP</small></div>
                    <strong>{formatNumber(node.requests)}<small>请求</small></strong>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
};
