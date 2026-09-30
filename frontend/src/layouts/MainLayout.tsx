import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Badge,
  Dropdown,
  Tooltip,
  theme,
  Alert,
} from 'antd';
import {
  DashboardOutlined,
  TrophyOutlined,
  SearchOutlined,
  TableOutlined,
  UserOutlined,
  GlobalOutlined,
  ClusterOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { GlobalSearch } from '../components/GlobalSearch/index.tsx';
import { settingsApi, authApi } from '../api/index.ts';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ darkMode, onToggleTheme }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [ckStatus, setCkStatus] = useState<{ connected: boolean; latency: number; version: string }>({
    connected: false,
    latency: 0,
    version: '',
  });
  const [username, setUsername] = useState<string>('admin');

  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  // Load status periodically
  const fetchStatus = async () => {
    try {
      const res: any = await settingsApi.getDatabase();
      setCkStatus({
        connected: res.connected,
        latency: res.latency_ms,
        version: res.version,
      });
    } catch (err) {
      setCkStatus({ connected: false, latency: 0, version: '' });
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30s
    const handleStatusEvent = () => fetchStatus();
    window.addEventListener('db-status-updated', handleStatusEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('db-status-updated', handleStatusEvent);
    };
  }, []);

  useEffect(() => {
    authApi.getMe()
      .then((res: any) => {
        if (res && res.username) {
          setUsername(res.username);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘 Dashboard',
    },
    {
      key: '/hosts/ranking',
      icon: <TrophyOutlined />,
      label: 'Host 访问排行',
    },
    {
      key: '/lookup/domain',
      icon: <SearchOutlined />,
      label: '域名反查 UID',
    },
    {
      key: '/logs',
      icon: <TableOutlined />,
      label: '访问日志明细',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'UID 用户画像',
    },
    {
      key: '/ips',
      icon: <GlobalOutlined />,
      label: 'IP 行为分析',
    },
    {
      key: '/nodes',
      icon: <ClusterOutlined />,
      label: '节点统计分析',
    },
    {
      key: '/audit',
      icon: <SafetyCertificateOutlined />,
      label: '查询审计日志',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '数据库与系统设置',
    },
  ];

  // Match active menu key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/hosts/ranking')) return '/hosts/ranking';
    if (path.startsWith('/hosts/')) return '/hosts/ranking';
    if (path.startsWith('/users/')) return '/users';
    if (path.startsWith('/ips/')) return '/ips';
    if (path.startsWith('/nodes/')) return '/nodes';
    return path;
  };

  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '数据库设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(val) => setCollapsed(val)}
        theme={darkMode ? 'dark' : 'light'}
        width={220}
        style={{
          boxShadow: '1px 0 6px rgba(0, 21, 41, 0.08)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: darkMode ? '1px solid #303030' : '1px solid #f0f0f0',
            fontWeight: 700,
            fontSize: 16,
            color: '#1677ff',
            letterSpacing: 0.5,
          }}
        >
          <DatabaseOutlined style={{ fontSize: 22, marginRight: collapsed ? 0 : 10 }} />
          {!collapsed && <span>Access Analytics</span>}
        </div>

        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            borderBottom: darkMode ? '1px solid #303030' : '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
          }}
        >
          <Space size="large" align="center">
            <GlobalSearch />
          </Space>

          <Space size="middle" align="center">
            {/* ClickHouse Status Indicator */}
            <Tooltip
              title={
                ckStatus.connected
                  ? `ClickHouse 已连接 (版本: ${ckStatus.version}, 延迟: ${ckStatus.latency}ms)`
                  : 'ClickHouse 未连接，点击前往设置面板配置'
              }
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: darkMode ? '#262626' : '#f5f5f5',
                }}
                onClick={() => navigate('/settings')}
              >
                <Badge
                  status={ckStatus.connected ? 'success' : 'error'}
                  text={
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {ckStatus.connected ? 'ClickHouse 在线' : 'ClickHouse 断开'}
                    </span>
                  }
                />
              </div>
            </Tooltip>

            {/* Dark / Light Toggle */}
            <Button
              type="text"
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={onToggleTheme}
              title={darkMode ? '切换为亮色模式' : '切换为暗色模式'}
            />

            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" style={{ height: 40 }}>
                <Space>
                  <UserOutlined />
                  <span style={{ fontWeight: 600 }}>{username}</span>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        {/* Global Alert if DB disconnected */}
        {!ckStatus.connected && (
          <Alert
            message="ClickHouse 数据库未连接"
            description="当前无法从 ClickHouse 加载访问日志，请前往「数据库与系统设置」配置并测试连接地址。"
            type="warning"
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => navigate('/settings')}>
                立即配置
              </Button>
            }
            banner
          />
        )}

        <Content
          style={{
            margin: '16px 20px',
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
