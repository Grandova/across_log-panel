import React, { useState, useEffect } from 'react';
import { Input, Select, Space, Tag, AutoComplete } from 'antd';
import { SearchOutlined, UserOutlined, GlobalOutlined, DesktopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { lookupApi } from '../../api/index.ts';
import { SearchDetectResult } from '../../api/types.ts';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'auto' | 'uid' | 'host' | 'ip'>('auto');
  const [detected, setDetected] = useState<SearchDetectResult | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDetected(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res: any = await lookupApi.detectSearch(trimmed);
        setDetected(res);
      } catch (err) {
        // Fallback local detection
        if (/^\d+$/.test(trimmed)) {
          setDetected({
            query: trimmed,
            type: 'uid',
            target_url: `/users/${trimmed}`,
            label: `查询用户 UID: ${trimmed}`,
          });
        } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
          setDetected({
            query: trimmed,
            type: 'ip',
            target_url: `/ips/${trimmed}`,
            label: `查询 IP: ${trimmed}`,
          });
        } else {
          setDetected({
            query: trimmed,
            type: 'host',
            target_url: `/hosts/${encodeURIComponent(trimmed)}`,
            label: `查询 Host 画像: ${trimmed}`,
          });
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (value: string) => {
    const target = value.trim();
    if (!target) return;

    if (searchMode === 'uid') {
      navigate(`/users/${target}`);
    } else if (searchMode === 'host') {
      navigate(`/hosts/${encodeURIComponent(target)}`);
    } else if (searchMode === 'ip') {
      navigate(`/ips/${encodeURIComponent(target)}`);
    } else if (detected && detected.target_url) {
      navigate(detected.target_url);
    } else {
      navigate(`/hosts/${encodeURIComponent(target)}`);
    }
  };

  const getTagColor = (type?: string) => {
    switch (type) {
      case 'uid':
        return 'blue';
      case 'ip':
        return 'cyan';
      case 'host':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'uid':
        return <UserOutlined />;
      case 'ip':
        return <DesktopOutlined />;
      case 'host':
        return <GlobalOutlined />;
      default:
        return <SearchOutlined />;
    }
  };

  return (
    <Space.Compact style={{ width: 440 }}>
      <Select
        value={searchMode}
        onChange={(val) => setSearchMode(val)}
        style={{ width: 110 }}
        options={[
          { value: 'auto', label: '智能识别' },
          { value: 'uid', label: 'UID' },
          { value: 'host', label: 'Host/域名' },
          { value: 'ip', label: 'User IP' },
        ]}
      />
      <Input.Search
        placeholder="输入 UID (如 16728)、Host (如 youtube.com) 或 IP (如 39.173.x.x)"
        allowClear
        enterButton={
          <span>
            <SearchOutlined /> 搜索
          </span>
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSearch={handleSearch}
        suffix={
          searchMode === 'auto' && detected && detected.type !== 'unknown' ? (
            <Tag color={getTagColor(detected.type)} style={{ marginRight: 0 }}>
              {getIcon(detected.type)} {detected.type.toUpperCase()}
            </Tag>
          ) : null
        }
      />
    </Space.Compact>
  );
};
