import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag } from 'antd';
import { SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { auditApi } from '../../api/index.ts';
import { AuditLogEntry } from '../../api/types.ts';

const { Title } = Typography;

export const AuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await auditApi.getLogs({ page, page_size: pageSize });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'QUERY_LOGS':
        return 'blue';
      case 'QUERY_UID':
        return 'cyan';
      case 'QUERY_HOST':
        return 'purple';
      case 'QUERY_IP':
        return 'green';
      case 'EXPORT_CSV':
        return 'gold';
      case 'UPDATE_CONFIG':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '操作时间 (UTC+8)',
      dataIndex: 'time_local',
      key: 'time_local',
      width: 175,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '管理员账号',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (u: string) => <b>{u}</b>,
    },
    {
      title: '来源 IP',
      dataIndex: 'client_ip',
      key: 'client_ip',
      width: 140,
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip}</span>,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (act: string) => <Tag color={getActionColor(act)}>{act}</Tag>,
    },
    {
      title: '检索目标 / 范围',
      dataIndex: 'target',
      key: 'target',
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>,
    },
    {
      title: '操作说明 / 结果',
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: '响应耗时',
      dataIndex: 'cost_ms',
      key: 'cost_ms',
      width: 100,
      render: (c: number) => (c ? `${c} ms` : '-'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            管理员查询审计日志
          </Title>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
            自动追踪记录管理员何时查询了哪位用户 UID、哪个 Host 域名、哪段 IP 以及 CSV 导出操作
          </div>
        </div>

        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      <Card bordered={false}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
};
