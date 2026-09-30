-- ====================================================================
-- 可选升级脚本: 物化视图预聚合 (适合千万~上亿条海量日志场景)
-- 第一版无需执行此脚本即可直接使用 access_log 查询。
-- ====================================================================

-- 1. 小时级 Host 统计物化视图
CREATE TABLE IF NOT EXISTS default.access_log_hourly_host
(
    bucket_time DateTime,
    host        String,
    node_id     Int32,
    requests    SimpleAggregateFunction(sum, UInt64),
    users       AggregateFunction(uniqExact, Int64),
    ips         AggregateFunction(uniqExact, String)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(bucket_time)
ORDER BY (bucket_time, host, node_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS default.mv_access_log_hourly_host
TO default.access_log_hourly_host AS
SELECT
    toStartOfHour(time) AS bucket_time,
    host,
    node_id,
    count() AS requests,
    uniqExactState(user_id) AS users,
    uniqExactState(user_ip) AS ips
FROM default.access_log
GROUP BY bucket_time, host, node_id;
