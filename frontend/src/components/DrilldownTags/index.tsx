import React from 'react';
import { Tag, Tooltip, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CopyOutlined } from '@ant-design/icons';

interface HostTagProps {
  host: string;
}

export const HostTag: React.FC<HostTagProps> = ({ host }) => {
  const navigate = useNavigate();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(host);
    message.success(`已复制域名: ${host}`);
  };

  return (
    <Tag
      color="green"
      style={{ cursor: 'pointer', margin: '2px 0', fontFamily: 'monospace' }}
      onClick={() => navigate(`/hosts/${encodeURIComponent(host)}`)}
    >
      <Tooltip title="点击查看 Host 画像">
        <span>{host}</span>
      </Tooltip>
      <CopyOutlined onClick={handleCopy} style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }} />
    </Tag>
  );
};

interface UserTagProps {
  uid: number | string;
}

export const UserTag: React.FC<UserTagProps> = ({ uid }) => {
  const navigate = useNavigate();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(uid));
    message.success(`已复制 UID: ${uid}`);
  };

  return (
    <Tag
      color="blue"
      style={{ cursor: 'pointer', margin: '2px 0', fontWeight: 600, fontFamily: 'monospace' }}
      onClick={() => navigate(`/users/${uid}`)}
    >
      <Tooltip title="点击查看用户画像">
        <span>UID: {uid}</span>
      </Tooltip>
      <CopyOutlined onClick={handleCopy} style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }} />
    </Tag>
  );
};

interface IPTagProps {
  ip: string;
}

export const IPTag: React.FC<IPTagProps> = ({ ip }) => {
  const navigate = useNavigate();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    message.success(`已复制 IP: ${ip}`);
  };

  return (
    <Tag
      color="cyan"
      style={{ cursor: 'pointer', margin: '2px 0', fontFamily: 'monospace' }}
      onClick={() => navigate(`/ips/${encodeURIComponent(ip)}`)}
    >
      <Tooltip title="点击查看 IP 分析">
        <span>{ip}</span>
      </Tooltip>
      <CopyOutlined onClick={handleCopy} style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }} />
    </Tag>
  );
};

interface NodeTagProps {
  nodeId: number;
}

export const NodeTag: React.FC<NodeTagProps> = ({ nodeId }) => {
  const navigate = useNavigate();

  return (
    <Tag
      color="orange"
      style={{ cursor: 'pointer', margin: '2px 0' }}
      onClick={() => navigate(`/nodes/${nodeId}`)}
    >
      <Tooltip title="点击查看节点分析">
        <span>节点 #{nodeId}</span>
      </Tooltip>
    </Tag>
  );
};
