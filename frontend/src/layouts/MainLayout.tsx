import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Badge,
  Dropdown,
  Tooltip,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
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

  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) setCollapsed(true);
  }, [location.pathname]);

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
      label: '数据总览',
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
      label: '系统设置',
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
    <Layout className={`app-shell${collapsed ? ' is-collapsed' : ''}`}>
      {!collapsed && <button className="nav-backdrop" aria-label="关闭导航" onClick={() => setCollapsed(true)} />}
      <Sider
        className="app-sidebar"
        collapsed={collapsed}
        trigger={null}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
        width={204}
        collapsedWidth={76}
      >
        <a className="brand" href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} aria-label="Access Analytics 首页">
          <span className="brand-mark"><DatabaseOutlined /></span>
          <span className="brand-copy"><strong>Access<span>Log</span></strong></span>
        </a>
        <div className="sidebar-panel">
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
          <div className="sidebar-bottom">
            <Button type="text" block icon={<LogoutOutlined />} onClick={handleLogout} className="sidebar-logout" aria-label="退出登录">{!collapsed && '退出登录'}</Button>
            <Button className="sidebar-collapse" type="text" block
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
              {!collapsed && '收起侧栏'}
            </Button>
          </div>
        </div>
      </Sider>

      <Layout className="app-main">
        <Header className="app-header">
          <div className="header-left">
            <Button className="mobile-menu" type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '展开导航' : '收起导航'} />
            <div className="header-breadcrumb">工作空间 <span>/</span> <strong>{menuItems.find((item) => item.key === getSelectedKey())?.label}</strong></div>
          </div>
          <div className="header-actions">
            <GlobalSearch />
            <div className="theme-switch" role="group" aria-label="主题模式">
              <button className={!darkMode ? 'active' : ''} onClick={() => { if (darkMode) onToggleTheme(); }} aria-label="亮色模式" aria-pressed={!darkMode}><SunOutlined /></button>
              <button className={darkMode ? 'active' : ''} onClick={() => { if (!darkMode) onToggleTheme(); }} aria-label="暗色模式" aria-pressed={darkMode}><MoonOutlined /></button>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button className="user-button" type="text">
                <span className="user-copy"><strong>Hey, {username}</strong><small>管理员</small></span>
                <span className="user-avatar">{username.slice(0, 1).toUpperCase()}</span>
                <DownOutlined className="user-chevron" />
              </Button>
            </Dropdown>
          </div>
        </Header>

        <div className="workspace-bar">
          <span>数据分析控制台 <span className="workspace-divider">/</span> <span className="workspace-subtitle">Access Log Analytics</span></span>
          <Tooltip title={ckStatus.connected
            ? `ClickHouse 已连接 (版本: ${ckStatus.version}, 延迟: ${ckStatus.latency}ms)`
            : 'ClickHouse 未连接，点击前往设置面板配置'}>
            <button className="database-status" onClick={() => navigate('/settings')}>
              <Badge status={ckStatus.connected ? 'success' : 'error'} />
              ClickHouse {ckStatus.connected ? '已连接' : '未连接'}
              {ckStatus.connected && <span>{ckStatus.latency} ms</span>}
            </button>
          </Tooltip>
        </div>

        {!ckStatus.connected && (
          <Alert className="connection-alert"
            message="ClickHouse 数据库未连接"
            description="请配置并测试数据库连接，以加载访问日志。"
            type="warning" showIcon
            action={<Button size="small" onClick={() => navigate('/settings')}>立即配置</Button>}
          />
        )}

        <Content className="app-content">
          <div className="page-enter" key={location.pathname}><Outlet /></div>
          <footer className="app-footer"><span>Access Analytics</span><span>让数据清晰，让分析简单。</span></footer>
        </Content>
      </Layout>
    </Layout>
  );
};
