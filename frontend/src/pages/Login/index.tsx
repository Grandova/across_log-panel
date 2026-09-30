import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, DatabaseOutlined, ArrowRightOutlined } from '@ant-design/icons';
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
    <div className="login-page">
      <section className="login-story">
        <div className="brand"><span className="brand-mark"><DatabaseOutlined /></span><span className="brand-copy"><strong>Access<span>.</span></strong><small>LOG ANALYTICS</small></span></div>
        <div className="login-story-content">
          <div className="eyebrow">YOUR NETWORK, IN FOCUS</div>
          <h1>复杂的数据，<br />清晰的<span>洞察。</span></h1>
          <p>从每一次访问出发，连接用户、域名与节点。<br />在一个工作空间里，看见网络的全貌。</p>
          <div className="login-visual" aria-hidden="true">
            <div className="visual-title"><span className="visual-dot" />ACCESS OVERVIEW<span>● ● ●</span></div>
            <div className="visual-bars">{[32, 54, 43, 72, 57, 85, 67, 95, 76, 100, 88, 114].map((height, i) => <i key={i} style={{ height, animationDelay: `${i * 45}ms` }} />)}</div>
            <div className="visual-footer"><span>用户</span><span>域名</span><span>节点</span><span>访问轨迹</span></div>
          </div>
        </div>
        <div className="login-story-footer">ACCESS LOG ANALYTICS <span>让每一次访问，都有迹可循。</span></div>
      </section>
      <section className="login-form-panel">
        <Card className="login-card" bordered={false}>
        <div className="login-heading">
          <span className="login-welcome">WELCOME BACK</span>
          <Title level={2}>欢迎回来</Title>
          <Text type="secondary">登录你的数据分析工作空间</Text>
        </div>

        <Form layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="username"
            label="管理员账号"
            rules={[{ required: true, message: '请输入管理员账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入管理员账号" autoComplete="username" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="管理密码"
            rules={[{ required: true, message: '请输入管理密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录工作空间 <ArrowRightOutlined />
            </Button>
          </Form.Item>

        </Form>
        </Card>
        <span className="login-footer">Access Analytics · 数据，尽在掌握</span>
      </section>
    </div>
  );
};
