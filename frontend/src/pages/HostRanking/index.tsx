import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Select, InputNumber, Tooltip } from 'antd';
import { TrophyOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hostApi } from '../../api/index.ts';
import { HostStatItem } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag } from '../../components/DrilldownTags/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const HostRanking: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HostStatItem[]>([]);
  const [limit, setLimit] = useState<number>(50);
  const [customLimit, setCustomLimit] = useState<number | null>(null);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const activeLimit = customLimit || limit;
      const res: any = await hostApi.getRanking({
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        limit: activeLimit,
      });
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange, limit, customLimit]);

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (r: number) => (
        <span
          style={{
            display: 'inline-block',
            width: 26,
            height: 26,
            borderRadius: '50%',
            textAlign: 'center',
            lineHeight: '26px',
            fontWeight: 'bold',
            fontSize: 13,
            backgroundColor: r === 1 ? '#ff4d4f' : r === 2 ? '#fa8c16' : r === 3 ? '#faad14' : '#f0f0f0',
            color: r <= 3 ? '#fff' : '#595959',
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
      title: '访问总请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600, fontSize: 14 }}>{formatNumber(v)}</span>,
    },
    {
      title: '访问 UID 数量 (UV)',
      dataIndex: 'users',
      key: 'users',
      sorter: (a: any, b: any) => a.users - b.users,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '客户端 IP 数量',
      dataIndex: 'ips',
      key: 'ips',
      sorter: (a: any, b: any) => a.ips - b.ips,
      render: (v: number) => formatNumber(v),
    },
    {
      title: '最后访问时间 (UTC+8)',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (v: string) => v || '-',
    },
    {
      title: '深度分析',
      key: 'action',
      width: 120,
      render: (_: any, record: HostStatItem) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/hosts/${encodeURIComponent(record.host)}`)}
        >
          查看画像
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Host 访问排行榜
          </Title>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
            多维统计全网访问频次最高的目标域名，点击域名可钻取访问该 Host 的用户画像
          </div>
        </div>

        <Space wrap align="center">
          <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />

          <Space size="small">
            <span style={{ fontSize: 13 }}>展示数量:</span>
            <Select
              value={customLimit ? 'custom' : limit}
              onChange={(val) => {
                if (val === 'custom') {
                  setCustomLimit(100);
                } else {
                  setCustomLimit(null);
                  setLimit(val as number);
                }
              }}
              style={{ width: 110 }}
              options={[
                { value: 10, label: 'Top 10' },
                { value: 20, label: 'Top 20' },
                { value: 50, label: 'Top 50' },
                { value: 100, label: 'Top 100' },
                { value: 200, label: 'Top 200' },
                { value: 500, label: 'Top 500' },
                { value: 'custom', label: '自定义' },
              ]}
            />
            {customLimit !== null && (
              <InputNumber
                min={1}
                max={5000}
                value={customLimit}
                onChange={(val) => setCustomLimit(val || 50)}
                placeholder="数量"
                style={{ width: 90 }}
              />
            )}
          </Space>

          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card bordered={false}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="host"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
          loading={loading}
        />
      </Card>
    </div>
  );
};
