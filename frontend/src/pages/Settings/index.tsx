import React, { useState, useEffect } from 'react';
import {
  Card,
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
} from '@ant-design/icons';
import { settingsApi } from '../../api/index.ts';
import { ClickHouseConfig, ClickHouseConfigResponse } from '../../api/types.ts';

const { Title } = Typography;

export const Settings: React.FC = () => {
  const [form] = Form.useForm();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>
      {/* Title */}
      <div>
        <Title level={4} style={{ margin: 0 }}>
          <DatabaseOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          ClickHouse 数据库连接配置
        </Title>
        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
          在此手动配置或修改 ClickHouse 数据库连接地址，支持 HTTP (8123) 与 Native (9000) 协议热重载，无需重启后台服务
        </div>
      </div>

      {/* Current Status Card */}
      <Card bordered={false} title="当前数据库连接状态" extra={<Button icon={<ReloadOutlined />} size="small" onClick={loadSettings} loading={loading}>刷新状态</Button>}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="连接状态">
            <Badge
              status={currentConfig?.connected ? 'success' : 'error'}
              text={
                <span style={{ fontWeight: 600 }}>
                  {currentConfig?.connected ? '已连接 (Online)' : '断开 / 未连接'}
                </span>
              }
            />
          </Descriptions.Item>
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

      {/* Configuration Form Card */}
      <Card bordered={false} title="修改 ClickHouse 连接参数">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="protocol"
            label="连接协议"
            rules={[{ required: true, message: '请选择连接协议' }]}
            extra="推荐使用 HTTP 协议连接 8123 端口；若使用 ClickHouse 原生 TCP 协议请选择 Native 并使用 9000 端口"
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

          <Space size="large" style={{ display: 'flex', width: '100%' }}>
            <Form.Item
              name="host"
              label="主机地址 (Host)"
              rules={[{ required: true, message: '请输入 ClickHouse 主机地址' }]}
              style={{ flex: 3 }}
            >
              <Input placeholder="例如 127.0.0.1 或 远程服务器 IP / 域名" />
            </Form.Item>

            <Form.Item
              name="port"
              label="端口 (Port)"
              rules={[{ required: true, message: '请输入端口号' }]}
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} placeholder="8123" min={1} max={65535} />
            </Form.Item>
          </Space>

          <Form.Item
            name="database"
            label="数据库名称 (Database)"
            rules={[{ required: true, message: '请输入数据库名' }]}
            initialValue="default"
          >
            <Input placeholder="default" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex', width: '100%' }}>
            <Form.Item
              name="username"
              label="数据库用户名 (Username)"
              rules={[{ required: true, message: '请输入用户名' }]}
              style={{ flex: 1 }}
              initialValue="default"
            >
              <Input placeholder="default" />
            </Form.Item>

            <Form.Item
              name="password"
              label="数据库密码 (Password)"
              style={{ flex: 1 }}
              extra={currentConfig?.has_password ? '当前已设置密码。留空则保持现有密码不变' : '无密码留空即可'}
            >
              <Input.Password placeholder="输入新密码 (留空则不修改现有密码)" />
            </Form.Item>
          </Space>

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

          <Space size="middle">
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
    </div>
  );
};
