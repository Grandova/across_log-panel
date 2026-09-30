import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Radio,
  Button,
  Space,
  Table,
  Typography,
  Tag,
  Tooltip,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupApi } from '../../api/index.ts';
import { DomainLookupItem } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { UserTag } from '../../components/DrilldownTags/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const DomainLookup: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDomain = searchParams.get('domain') || '';

  const [domainInput, setDomainInput] = useState<string>(initialDomain);
  const [searchedDomain, setSearchedDomain] = useState<string>(initialDomain);
  const [matchMode, setMatchMode] = useState<'subdomain' | 'exact' | 'contains'>('subdomain');

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DomainLookupItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = domainInput.trim();
    if (!trimmed) return;
    setSearchedDomain(trimmed);
    setPage(1);
    setSearchParams({ domain: trimmed });
  };

  const loadData = async () => {
    if (!searchedDomain) return;
    setLoading(true);
    try {
      const res: any = await lookupApi.domainLookup({
        domain: searchedDomain,
        mode: matchMode,
        preset: timeRange.preset,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        page,
        page_size: pageSize,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchedDomain) {
      loadData();
    }
  }, [searchedDomain, matchMode, timeRange, page, pageSize]);

  const columns = [
    {
      title: '用户 UID',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (uid: number) => <UserTag uid={uid} />,
    },
    {
      title: '访问总请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{formatNumber(v)}</span>,
    },
    {
      title: '使用独立 IP 数',
      dataIndex: 'ip_count',
      key: 'ip_count',
      render: (v: number) => formatNumber(v),
    },
    {
      title: '首次访问时间 (UTC+8)',
      dataIndex: 'first_seen',
      key: 'first_seen',
      render: (v: string) => v || '-',
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
      render: (_: any, r: DomainLookupItem) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/users/${r.user_id}`)}
        >
          查看 UID 画像
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title */}
      <div>
        <Title level={4} style={{ margin: 0 }}>
          <GlobalOutlined style={{ color: 'var(--primary)', marginRight: 8 }} />
          域名反查 UID
        </Title>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
          输入域名快速排查是哪些 UID 在访问该域名，支持精确匹配、包含匹配及子域名自动级联匹配
        </div>
      </div>

      {/* Filter Control Card */}
      <Card bordered={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Input
              prefix={<GlobalOutlined />}
              placeholder="输入目标域名，例如 youtube.com、openai.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 340 }}
              allowClear
            />

            <Radio.Group
              value={matchMode}
              onChange={(e) => setMatchMode(e.target.value)}
              buttonStyle="solid"
            >
              <Tooltip title="推荐模式：匹配 youtube.com 及所有形如 *.youtube.com 的子域名">
                <Radio.Button value="subdomain">域名 + 子域名 (推荐)</Radio.Button>
              </Tooltip>
              <Tooltip title="仅匹配 host = 输入域名">
                <Radio.Button value="exact">精确匹配</Radio.Button>
              </Tooltip>
              <Tooltip title="包含模糊匹配 host LIKE %输入值%">
                <Radio.Button value="contains">包含匹配</Radio.Button>
              </Tooltip>
            </Radio.Group>

            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              反查 UID
            </Button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />

            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} disabled={!searchedDomain}>
              刷新
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      {searchedDomain ? (
        <Card
          bordered={false}
          title={
            <span>
              反查结果：访问过 <b>{searchedDomain}</b> 的 UID 列表
              <Tag color="green" style={{ marginLeft: 8 }}>
                共 {total} 个用户
              </Tag>
            </span>
          }
        >
          <Table
            dataSource={data}
            columns={columns}
            rowKey="user_id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100', '200'],
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </Card>
      ) : (
        <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
          <GlobalOutlined style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 16 }} />
          <Title level={4}>请输入想要反查的目标域名</Title>
          <div style={{ color: 'var(--muted)' }}>
            支持 youtube.com、gstatic.com 等域名，系统将秒级聚合访问过该域名的所有用户 UID 并统计总请求量
          </div>
        </Card>
      )}
    </div>
  );
};
