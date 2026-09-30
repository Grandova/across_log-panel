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
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#141414';
      document.body.style.color = '#fff';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#f5f5f5';
      document.body.style.color = '#000';
    }
  }, [darkMode]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
