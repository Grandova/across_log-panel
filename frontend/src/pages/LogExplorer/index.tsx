import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Table,
  Typography,
  message,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { logApi } from '../../api/index.ts';
import { AccessLog, LogQueryFilter } from '../../api/types.ts';
import { TimeRangeSelector } from '../../components/TimeRangeSelector/index.tsx';
import { HostTag, UserTag, IPTag, NodeTag } from '../../components/DrilldownTags/index.tsx';
import { LogDetailDrawer } from '../../components/LogDetailDrawer/index.tsx';
import { formatNumber } from '../../utils/dayjs.ts';

const { Title } = Typography;

export const LogExplorer: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [data, setData] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [costMs, setCostMs] = useState<number>(0);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  const [timeRange, setTimeRange] = useState<{ preset?: string; startTime?: string; endTime?: string }>({
    preset: '24h',
  });

  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const buildFilter = (): LogQueryFilter => {
    const values = form.getFieldsValue(true);
    return {
      start_time: timeRange.startTime,
      end_time: timeRange.endTime,
      preset: timeRange.preset,
      user_id: values.user_id !== undefined && values.user_id !== '' && values.user_id !== null ? Number(values.user_id) : undefined,
      user_ip: values.user_ip?.trim() || undefined,
      host: values.host?.trim() || undefined,
      host_match: values.host_match || 'contains',
      node_id: values.node_id !== undefined && values.node_id !== '' && values.node_id !== null ? Number(values.node_id) : undefined,
      network: values.network || undefined,
      dest_ip: values.dest_ip?.trim() || undefined,
      dest_port: values.dest_port !== undefined && values.dest_port !== '' && values.dest_port !== null ? Number(values.dest_port) : undefined,
      page,
      page_size: pageSize,
    };
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filter = buildFilter();
      const res: any = await logApi.queryLogs(filter);
      setData(res.data || []);
      setTotal(res.total || 0);
      setCostMs(res.cost_ms || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [timeRange, page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleReset = () => {
    form.resetFields();
    setTimeRange({ preset: '24h' });
    setPage(1);
    setTimeout(() => {
      loadLogs();
    }, 50);
  };

  const handleExport = async () => {
    setExporting(true);
    message.loading({ content: '正在从 ClickHouse 流式生成 CSV 导出文件...', key: 'exportMsg', duration: 0 });
    try {
      const filter = buildFilter();
      await logApi.exportCSV(filter);
      message.success({ content: 'CSV 日志文件导出成功！', key: 'exportMsg' });
    } catch (err: any) {
      message.error({ content: err.message || '导出失败', key: 'exportMsg' });
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: '访问时间 (UTC+8)',
      dataIndex: 'time_local',
      key: 'time_local',
      width: 175,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '网络协议',
      dataIndex: 'network',
      key: 'network',
      width: 90,
      render: (net: string) => <Tag color="geekblue">{net || '-'}</Tag>,
    },
    {
      title: '节点',
      dataIndex: 'node_id',
      key: 'node_id',
      width: 100,
      render: (id: number) => <NodeTag nodeId={id} />,
    },
    {
      title: '用户 UID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 130,
      render: (uid: number) => <UserTag uid={uid} />,
    },
    {
      title: '客户端 IP (User IP)',
      dataIndex: 'user_ip',
      key: 'user_ip',
      width: 150,
      render: (ip: string) => <IPTag ip={ip} />,
    },
    {
      title: '目标域名 (Host)',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => <HostTag host={host} />,
    },
    {
      title: '出口目标 IP (Dest IP)',
      dataIndex: 'dest_ip',
      key: 'dest_ip',
      width: 140,
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip}</span>,
    },
    {
      title: '端口',
      dataIndex: 'dest_port',
      key: 'dest_port',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: AccessLog) => (
        <Button type="link" size="small" onClick={() => setSelectedLog(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title */}
      <div>
        <Title level={4} style={{ margin: 0 }}>
          <TableOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          访问日志明细检索 (Data Explorer)
        </Title>
        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
          支持多条件 AND 组合筛选，针对 ClickHouse 性能优化参数化分页查询，支持海量日志流式 CSV 导出
        </div>
      </div>

      {/* Filter Form Card */}
      <Card bordered={false}>
        <Form form={form} layout="vertical">
          <Row gutter={[16, 8]}>
            <Col xs={24} md={6}>
              <Form.Item name="user_id" label="用户 UID">
                <Input placeholder="精确匹配 UID，如 16728" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="user_ip" label="客户端 User IP">
                <Input placeholder="输入 IP 地址" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="host" label="目标 Host 域名">
                <Input placeholder="输入域名关键字" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="host_match" label="Host 匹配方式" initialValue="contains">
                <Select
                  options={[
                    { value: 'contains', label: '包含匹配 (LIKE)' },
                    { value: 'subdomain', label: '域名及子域名 (*.domain)' },
                    { value: 'exact', label: '精确匹配 (=)' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="node_id" label="服务节点 Node ID">
                <InputNumber placeholder="节点数字 ID" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="network" label="网络协议 (Network)">
                <Input placeholder="例如 tcp / udp" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="dest_ip" label="出口目标 IP (Dest IP)">
                <Input placeholder="输入目标出口 IP" allowClear />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item name="dest_port" label="目标端口 (Dest Port)">
                <InputNumber placeholder="如 443, 80" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <TimeRangeSelector value={timeRange} onChange={(range) => setTimeRange(range)} />

            <Space>
              <Button icon={<ClearOutlined />} onClick={handleReset}>
                清空筛选
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
                查询日志
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
                title="后端 ClickHouse 游标流式导出为 CSV，最多 100,000 条"
              >
                流式导出 CSV
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      {/* Logs Table Card */}
      <Card
        bordered={false}
        title={
          <span>
            查询结果: 共匹配 <b>{formatNumber(total)}</b> 条记录
            {costMs > 0 && (
              <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>
                (ClickHouse 执行耗时: {costMs}ms)
              </span>
            )}
          </span>
        }
        extra={
          <Button icon={<ReloadOutlined />} size="small" onClick={loadLogs} loading={loading}>
            刷新
          </Button>
        }
      >
        <Table
          dataSource={data}
          columns={columns}
          rowKey={(r, i) => `${r.time}-${r.user_id}-${i}`}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['50', '100', '200', '500'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <LogDetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  );
};
