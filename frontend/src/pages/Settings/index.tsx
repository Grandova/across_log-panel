import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Descriptions,
  Badge,
  Divider,
} from 'antd';
import {
  DatabaseOutlined,
  ApiOutlined,
  SaveOutlined,
  ReloadOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi, settingsApi } from '../../api/index.ts';
import { ClickHouseConfig, ClickHouseConfigResponse } from '../../api/types.ts';

const { Title } = Typography;

export const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [accountForm] = Form.useForm();
  const [savingAccount, setSavingAccount] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentConfig, setCurrentConfig] = useState<ClickHouseConfigResponse | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
    latency_ms?: number;
  } | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getDatabase();
      setCurrentConfig(res);
      form.setFieldsValue({
        protocol: res.protocol || 'http',
        host: res.host || '127.0.0.1',
        port: res.port || 8123,
        database: res.database || 'default',
        username: res.username || 'default',
        password: '', // Blank by default to protect secret
        secure: !!res.secure,
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    authApi.getMe().then((res: any) => accountForm.setFieldsValue({ username: res.username })).catch(console.error);
  }, []);

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      setTestResult(null);

      const res: any = await settingsApi.testDatabase(values as ClickHouseConfig);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || '连接成功！',
          version: res.version,
          latency_ms: res.latency_ms,
        });
        message.success('ClickHouse 测试连接成功！');
      } else {
        setTestResult({
          success: false,
          message: res.error || '连接失败',
        });
        message.error('ClickHouse 连接失败，请检查配置');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '表单校验或请求失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const res: any = await settingsApi.saveDatabase(values as ClickHouseConfig);
      message.success(res.message || '配置已成功保存并即刻热重载！');
      setTestResult({
        success: true,
        message: `已连接！版本: ${res.version} (延迟: ${res.latency_ms}ms)`,
      });
      // Notify layout header to immediately refresh DB status badge
      window.dispatchEvent(new CustomEvent('db-status-updated'));
      loadSettings();
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAccountSave = async (values: { username: string; current_password: string; password?: string }) => {
    setSavingAccount(true);
    try {
      await authApi.updateAccount({ username: values.username, current_password: values.current_password, password: values.password });
      accountForm.resetFields();
      localStorage.removeItem('token');
      message.success('管理员账号已更新，请重新登录');
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <Title level={2}>系统设置</Title>
        <p>管理数据库连接与管理员登录账号。</p>
      </div>
      <div className="settings-grid">
        <Card className="connection-card" bordered={false}>
          <div className="connection-profile">
            <span className="connection-logo"><DatabaseOutlined /></span>
            <Title level={3}>ClickHouse</Title>
            <Badge status={currentConfig?.connected ? 'success' : 'error'} text={currentConfig?.connected ? '数据库已连接' : '数据库未连接'} />
          </div>
          <Divider />
          <div className="connection-heading"><strong>连接概况</strong><Button type="text" icon={<ReloadOutlined />} onClick={loadSettings} loading={loading} aria-label="刷新连接状态" /></div>
          <Descriptions layout="vertical" column={1} size="small" colon={false}>
            <Descriptions.Item label="当前协议与地址">
              <span style={{ fontFamily: 'monospace' }}>
                {currentConfig?.protocol?.toUpperCase()}://{currentConfig?.host}:{currentConfig?.port}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="目标数据库">
              <span style={{ fontFamily: 'monospace' }}>{currentConfig?.database}</span>
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              <span style={{ fontFamily: 'monospace' }}>{currentConfig?.username}</span>
            </Descriptions.Item>
            <Descriptions.Item label="服务器版本">
              {currentConfig?.version || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="通信延迟">
              {currentConfig?.connected ? `${currentConfig?.latency_ms} ms` : '-'}
            </Descriptions.Item>
          </Descriptions>

          {currentConfig?.last_error && !currentConfig?.connected && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message="ClickHouse 最近连接报错"
              description={<pre style={{ margin: 0, fontSize: 12 }}>{currentConfig.last_error}</pre>}
            />
          )}
        </Card>

        <Card className="settings-form-card" bordered={false}>
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <div className="form-section-heading"><span className="section-icon section-blue"><ApiOutlined /></span><div><h3>连接参数</h3><p>配置数据库的访问地址与协议</p></div></div>
            <Form.Item
              name="protocol"
              label="连接协议"
              rules={[{ required: true, message: '请选择连接协议' }]}
              extra="HTTP 默认端口 8123；Native 默认端口 9000。"
            >
              <Select
                options={[
                  { value: 'http', label: 'HTTP 协议 (默认端口 8123，推荐)' },
                  { value: 'native', label: 'Native 原生 TCP 协议 (默认端口 9000)' },
                ]}
                onChange={(val) => {
                  if (val === 'http' && form.getFieldValue('port') === 9000) {
                    form.setFieldValue('port', 8123);
                  } else if (val === 'native' && form.getFieldValue('port') === 8123) {
                    form.setFieldValue('port', 9000);
                  }
                }}
              />
            </Form.Item>

            <Row gutter={24} align="top">
              <Col xs={24} sm={16}>
                <Form.Item
                  name="host"
                  label="主机地址 (Host)"
                  rules={[{ required: true, message: '请输入 ClickHouse 主机地址' }]}
                >
                  <Input placeholder="例如 127.0.0.1 或 远程服务器 IP / 域名" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="port"
                  label="端口 (Port)"
                  rules={[{ required: true, message: '请输入端口号' }]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="8123" min={1} max={65535} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="database"
              label="数据库名称 (Database)"
              rules={[{ required: true, message: '请输入数据库名' }]}
              initialValue="default"
            >
              <Input placeholder="default" />
            </Form.Item>

            <Divider />
            <div className="form-section-heading"><span className="section-icon section-green"><LockOutlined /></span><div><h3>账户与安全</h3><p>设置数据库认证信息及传输方式</p></div></div>
            <Row gutter={24} align="top">
              <Col xs={24} sm={12}>
                <Form.Item
                  name="username"
                  label="数据库用户名 (Username)"
                  rules={[{ required: true, message: '请输入用户名' }]}
                  initialValue="default"
                >
                  <Input prefix={<UserOutlined />} placeholder="default" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label="数据库密码 (Password)"
                  extra={currentConfig?.has_password ? '当前已设置密码。留空则保持现有密码不变' : '无密码留空即可'}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="留空保持现有密码" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="secure"
              label="启用 TLS / HTTPS 加密传输"
              valuePropName="checked"
              extra="若 ClickHouse 启用了 HTTPS / SSL 证书，请开启此项"
            >
              <Switch />
            </Form.Item>

            {testResult && (
              <Alert
                type={testResult.success ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
                message={testResult.success ? '测试连接成功' : '测试连接失败'}
                description={testResult.message}
              />
            )}

            <Divider />

            <Space className="settings-actions" wrap size="middle">
              <Button
                type="default"
                icon={<ApiOutlined />}
                onClick={handleTest}
                loading={testing}
              >
                测试连接 (不保存)
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                保存并应用新配置
              </Button>
            </Space>
          </Form>
        </Card>
        <Card className="account-form-card" bordered={false}>
          <div className="form-section-heading"><span className="section-icon section-red"><UserOutlined /></span><div><h3>管理员账号</h3><p>修改后所有登录会话将失效，请使用新账号重新登录。</p></div></div>
          <Form name="admin-account" form={accountForm} layout="vertical" onFinish={handleAccountSave}>
            <Row gutter={24} align="top">
              <Col xs={24} sm={12}>
                <Form.Item name="username" label="管理员用户名" rules={[{ required: true, whitespace: true, message: '请输入管理员用户名' }, { max: 64, message: '用户名最多 64 个字符' }]}>
                  <Input prefix={<UserOutlined />} autoComplete="username" placeholder="输入管理员用户名" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="current_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码以验证身份' }]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="输入当前密码" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="password" label="新密码" extra="留空保持现有密码。新密码须为 8–72 字节。" rules={[{ validator: (_, value) => !value || (new TextEncoder().encode(value).length >= 8 && new TextEncoder().encode(value).length <= 72) ? Promise.resolve() : Promise.reject(new Error('新密码长度应为 8–72 字节')) }]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="输入新密码" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="confirm_password" label="确认新密码" dependencies={['password']} rules={[({ getFieldValue }) => ({ validator: (_, value) => (value || '') === (getFieldValue('password') || '') ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) })]}>
                  <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="再次输入新密码" />
                </Form.Item>
              </Col>
            </Row>
            <Space className="settings-actions">
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingAccount}>保存管理员账号</Button>
            </Space>
          </Form>
        </Card>
      </div>
    </div>
  );
};
