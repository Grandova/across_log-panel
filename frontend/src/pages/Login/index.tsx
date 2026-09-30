import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/index.ts';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await authApi.login({
        username: values.username,
        password: values.password,
      });

      if (res && res.token) {
        localStorage.setItem('token', res.token);
        message.success('登录成功，欢迎使用！');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)',
        padding: 20,
      }}
    >
      <Card
        bordered={false}
        style={{
          width: 420,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#e6f4ff',
              color: '#1677ff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            <DatabaseOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            Access Log Analytics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            ClickHouse 用户访问日志可视化分析后台
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            name="username"
            label="管理员账号"
            rules={[{ required: true, message: '请输入管理员账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="管理密码"
            rules={[{ required: true, message: '请输入管理密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="初始密码 admin123" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登 录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12 }}>
            安全提示：密码经 Bcrypt 加盐哈希，5次输错触发 IP 锁定防爆破
          </div>
        </Form>
      </Card>
    </div>
  );
};
