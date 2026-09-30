import dayjs from 'dayjs';

export const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '-';
  const d = dayjs(dateStr);
  if (!d.isValid()) return '-';
  return d.format('YYYY-MM-DD HH:mm:ss');
};

export const formatNumber = (num?: number | null): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

export default dayjs;
