import React, { useState } from 'react';
import { Space, Radio, DatePicker, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface TimeRangeSelectorProps {
  value?: {
    preset?: string;
    startTime?: string;
    endTime?: string;
  };
  onChange: (range: { preset?: string; startTime?: string; endTime?: string }) => void;
  showCustom?: boolean;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value = { preset: '24h' },
  onChange,
  showCustom = true,
}) => {
  const [isCustom, setIsCustom] = useState<boolean>(!value.preset && !!(value.startTime || value.endTime));

  const handlePresetChange = (e: any) => {
    const preset = e.target.value;
    if (preset === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange({ preset, startTime: undefined, endTime: undefined });
    }
  };

  const handleRangePickerChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const startTime = dates[0].format('YYYY-MM-DD HH:mm:ss');
      const endTime = dates[1].format('YYYY-MM-DD HH:mm:ss');
      onChange({ preset: undefined, startTime, endTime });
    } else {
      onChange({ preset: '24h' });
    }
  };

  return (
    <Space className="time-range" wrap size="small" align="center">
      <Tooltip title="所有时间均以东八区 Asia/Shanghai 标准时区展示与输入，后端自动按 UTC 范围精确查询 ClickHouse">
        <Tag className="timezone-tag">
          UTC+8
        </Tag>
      </Tooltip>

      <Radio.Group
        value={isCustom ? 'custom' : value.preset || '24h'}
        onChange={handlePresetChange}
        buttonStyle="solid"
        size="middle"
      >
        <Radio.Button value="1h">1小时</Radio.Button>
        <Radio.Button value="6h">6小时</Radio.Button>
        <Radio.Button value="24h">24小时</Radio.Button>
        <Radio.Button value="today">今天</Radio.Button>
        <Radio.Button value="yesterday">昨天</Radio.Button>
        <Radio.Button value="7d">最近7天</Radio.Button>
        <Radio.Button value="30d">最近30天</Radio.Button>
        {showCustom && <Radio.Button value="custom">自定义范围</Radio.Button>}
      </Radio.Group>

      {isCustom && showCustom && (
        <RangePicker
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          defaultValue={
            value.startTime && value.endTime
              ? [dayjs(value.startTime), dayjs(value.endTime)]
              : [dayjs().subtract(24, 'hour'), dayjs()]
          }
          onChange={handleRangePickerChange}
          style={{ width: 'min(360px, 100%)' }}
        />
      )}
    </Space>
  );
};
