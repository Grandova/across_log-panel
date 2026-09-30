import React from 'react';
import { Drawer, Descriptions, Button, Space, message, Divider, Tag } from 'antd';
import { CopyOutlined, ExportOutlined } from '@ant-design/icons';
import { AccessLog } from '../../api/types.ts';
import { HostTag, UserTag, IPTag, NodeTag } from '../DrilldownTags/index.tsx';

interface LogDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  log: AccessLog | null;
}

export const LogDetailDrawer: React.FC<LogDetailDrawerProps> = ({ open, onClose, log }) => {
  if (!log) return null;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`已复制 ${label}: ${text}`);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    message.success('已复制完整日志 JSON 数据');
  };

  return (
    <Drawer
      title="访问记录详情"
      placement="right"
      width={560}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button icon={<CopyOutlined />} size="small" onClick={copyJSON}>
            复制 JSON
          </Button>
        </Space>
      }
    >
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="展示时间 (UTC+8)">
          <Space>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{log.time_local}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyText(log.time_local, '本地时间')}
            />
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="原始时间 (UTC+0)">
          <Space>
            <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{log.time_utc}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyText(log.time_utc, 'UTC 时间')}
            />
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="用户 UID">
          <UserTag uid={log.user_id} />
        </Descriptions.Item>

        <Descriptions.Item label="目标 Host (域名)">
          <HostTag host={log.host} />
        </Descriptions.Item>

        <Descriptions.Item label="客户端 User IP">
          <IPTag ip={log.user_ip} />
        </Descriptions.Item>

        <Descriptions.Item label="节点 ID">
          <NodeTag nodeId={log.node_id} />
        </Descriptions.Item>

        <Descriptions.Item label="网络协议 (Network)">
          <Tag color="geekblue">{log.network || '-'}</Tag>
        </Descriptions.Item>

        <Descriptions.Item label="目标出口 IP (Dest IP)">
          <Space>
            <span style={{ fontFamily: 'monospace' }}>{log.dest_ip || '-'}</span>
            {log.dest_ip && (
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyText(log.dest_ip, '目标 IP')}
              />
            )}
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="目标端口 (Dest Port)">
          <Tag color="volcano">{log.dest_port || '-'}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Divider />
      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        💡 提示：点击 UID、Host、IP、节点标签可直接下钻进入对应的专属画像与分析页面。
      </div>
    </Drawer>
  );
};
