import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './router/index.tsx';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved === 'dark';
  });

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme_mode', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: darkMode ? '#8db5df' : '#6c9bcf',
          colorInfo: darkMode ? '#8db5df' : '#6c9bcf',
          colorSuccess: '#1b9c85',
          colorBgLayout: darkMode ? '#181a1e' : '#f6f6f9',
          colorBgContainer: darkMode ? '#202528' : '#ffffff',
          colorBgElevated: darkMode ? '#293035' : '#ffffff',
          colorText: darkMode ? '#edeffd' : '#363949',
          colorTextSecondary: darkMode ? '#a3bdcc' : '#7d8da1',
          colorBorder: darkMode ? '#3a3d44' : '#e3e5e8',
          colorBorderSecondary: darkMode ? '#303339' : '#eceef0',
          borderRadius: 10,
          borderRadiusLG: 28,
          controlHeight: 38,
          fontSize: 13,
          motionEaseInOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
          motionDurationMid: '0.25s',
          motionDurationSlow: '0.4s',
          fontFamily:
            '"Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Layout: { headerBg: 'transparent', siderBg: darkMode ? '#202528' : '#ffffff' },
          Menu: {
            itemHeight: 52,
            itemBorderRadius: 0,
            itemSelectedBg: darkMode ? '#283947' : '#e9eff6',
            itemSelectedColor: darkMode ? '#8db5df' : '#6c9bcf',
            itemColor: darkMode ? '#a3bdcc' : '#7d8da1',
          },
          Card: { headerFontSize: 15, headerHeight: 64, bodyPadding: 24 },
          Table: {
            headerBg: darkMode ? '#202528' : '#ffffff',
            headerColor: darkMode ? '#a3bdcc' : '#7d8da1',
            rowHoverBg: darkMode ? '#282c31' : '#f1f3f5',
            cellPaddingBlock: 16,
          },
          Button: { primaryShadow: 'none', fontWeight: 500 },
          Statistic: { contentFontSize: 28, titleFontSize: 13 },
        },
      }}
    >
      <BrowserRouter>
        <AppRoutes darkMode={darkMode} onToggleTheme={toggleTheme} />
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
