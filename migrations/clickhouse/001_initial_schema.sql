-- ====================================================================
-- Access Log Analytics: 基础表结构与索引说明
-- ====================================================================
-- 适用于 ClickHouse 数据库。当前表为 default.access_log
--
-- 原始表结构建议：
-- 1. PARTITION BY toYYYYMM(time): 按月份分区，保障数据生命周期与清理效率
-- 2. ORDER BY (host, user_id, time): 使得 Host 排行与 UID 查询达到极致性能
--    或者 ORDER BY (time, host, user_id): 适合按时间流检索
-- ====================================================================

CREATE TABLE IF NOT EXISTS default.access_log
(
    time        DateTime COMMENT '访问时间，存储为 UTC+0',
    network     LowCardinality(String) COMMENT '网络协议/类型',
    node_id     Int32 COMMENT '节点标识 ID',
    user_id     Int64 COMMENT '用户唯一标识 UID',
    user_ip     String COMMENT '客户端 IP',
    host        String COMMENT '目标主机名/域名',
    dest_ip     String COMMENT '目标出口 IP',
    dest_port   UInt16 COMMENT '目标端口'
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(time)
ORDER BY (time, host, user_id)
SETTINGS index_granularity = 8192;
