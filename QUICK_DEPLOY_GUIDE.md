# 性能优化快速部署指南

## 🚀 快速开始

### 1. 后端部署（5分钟）

#### 步骤1：数据库迁移
```bash
cd /Users/xin.y/IdeaProjects/ledger-server

# 启动应用，Flyway会自动执行迁移
./mvnw spring-boot:run
```

#### 步骤2：验证索引
```sql
-- 连接到数据库
mysql -u your_user -p your_database

-- 查看transaction表的索引
SHOW INDEX FROM transaction;

-- 应该看到以下8个新索引：
-- idx_transaction_ledger_query
-- idx_transaction_user_query
-- idx_transaction_ledger_type
-- idx_transaction_user_type
-- idx_transaction_category
-- idx_transaction_ledger_datetime
-- idx_transaction_user_datetime
-- idx_transaction_payment_method
```

#### 步骤3：重启服务
```bash
# 如果服务已运行，重启使更改生效
./mvnw spring-boot:run
```

---

### 2. 前端部署（3分钟）

#### 步骤1：清理缓存
```bash
cd /Users/xin.y/IdeaProjects/LedgerAIClient

# 清理缓存
rm -rf node_modules/.cache
rm -rf .expo
```

#### 步骤2：重新启动
```bash
# 开发环境
npm start

# 或使用Expo
npx expo start --clear
```

#### 步骤3：测试验证
在应用中进行以下测试：
- [ ] 打开交易列表页
- [ ] 滚动列表，观察流畅度
- [ ] 切换分组方式
- [ ] 切换月份
- [ ] 下拉刷新

---

## 📊 性能监控

### 后端监控

#### 查询性能
```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query%';

-- 分析具体查询
EXPLAIN SELECT * FROM transaction 
WHERE ledger_id = 1 
AND delete_time IS NULL 
ORDER BY transaction_date_time DESC;
```

#### 索引使用情况
```sql
-- 查看索引统计
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database'
AND TABLE_NAME = 'transaction';
```

### 前端监控

#### React DevTools Profiler
1. 打开Chrome DevTools
2. 选择"Profiler"标签
3. 点击"Record"
4. 操作应用
5. 停止记录，查看性能数据

#### 内存监控
```javascript
// 在控制台运行
if (global.performance && global.performance.memory) {
    console.log({
        usedJSHeapSize: (global.performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (global.performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    });
}
```

---

## 🐛 常见问题

### Q1: 数据库迁移失败
**症状**: Flyway执行失败  
**解决方案**:
```bash
# 1. 检查迁移文件
ls -la src/main/resources/db/migration/

# 2. 手动执行SQL
mysql -u user -p database < src/main/resources/db/migration/V1_9__add_transaction_indexes.sql

# 3. 更新Flyway元数据
UPDATE flyway_schema_history 
SET success = 1 
WHERE version = '1.9';
```

### Q2: 索引创建慢
**症状**: 大表创建索引耗时长  
**解决方案**:
```sql
-- 在低峰期执行
-- 使用ALGORITHM=INPLACE减少锁定时间
ALTER TABLE transaction 
ADD INDEX idx_transaction_ledger_query (ledger_id, delete_time, transaction_date_time),
ALGORITHM=INPLACE, LOCK=NONE;
```

### Q3: 前端滚动仍然卡顿
**检查清单**:
- [ ] 确认FlatList配置已应用
- [ ] 检查是否有console.log影响性能
- [ ] 验证图片是否过大
- [ ] 检查是否有内存泄漏

**解决方案**:
```typescript
// 1. 移除开发环境的console.log
if (__DEV__) {
    console.log = () => {};
}

// 2. 优化图片
<Image 
    source={uri} 
    resizeMode="cover"
    style={{ width: 40, height: 40 }}
/>

// 3. 使用React DevTools定位性能瓶颈
```

### Q4: 批量查询返回空Map
**症状**: attachmentCountMap为空  
**调试步骤**:
```java
// 在TransactionController中添加日志
logger.debug("Transaction IDs: {}", transactionIds);
logger.debug("Attachment count map: {}", attachmentCountMap);

// 验证Repository查询
List<Object[]> results = attachmentRepository.countByTransactionIds(transactionIds);
logger.debug("Raw results: {}", results);
```

---

## 🎯 性能基准

### 预期性能指标

| 指标 | 20条记录 | 50条记录 | 100条记录 |
|------|----------|----------|-----------|
| 后端响应时间 | < 60ms | < 100ms | < 150ms |
| 前端渲染时间 | < 150ms | < 200ms | < 300ms |
| 滚动帧率 | 60fps | 60fps | 55-60fps |
| 内存占用 | < 80MB | < 100MB | < 120MB |

### 性能测试脚本

#### 后端压力测试
```bash
# 使用Apache Bench
ab -n 1000 -c 10 \
   -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:8080/api/transactions/query

# 使用curl循环测试
for i in {1..100}; do
    time curl -X POST http://localhost:8080/api/transactions/query \
        -H "Content-Type: application/json" \
        -d '{"page":0,"size":20}'
done
```

#### 前端性能测试
```javascript
// 在App.tsx中添加性能监控
import { performance } from 'perf_hooks';

const startTime = performance.now();
// 执行操作
const endTime = performance.now();
console.log(`操作耗时: ${endTime - startTime}ms`);
```

---

## 📋 部署清单

### 上线前检查
- [ ] 数据库索引已创建
- [ ] 后端代码已编译无错误
- [ ] 前端代码已编译无错误
- [ ] 性能测试通过
- [ ] 内存测试通过
- [ ] 单元测试通过

### 回滚计划
如果出现问题，执行以下步骤：

#### 后端回滚
```sql
-- 删除新索引
DROP INDEX idx_transaction_ledger_query ON transaction;
DROP INDEX idx_transaction_user_query ON transaction;
-- ... 删除其他索引

-- 回滚代码
git revert <commit-hash>
```

#### 前端回滚
```bash
# 回滚到上一个版本
git revert <commit-hash>

# 重新部署
npm install
npm start
```

---

## 🔍 性能分析工具

### 推荐工具
1. **后端**:
   - JProfiler（Java性能分析）
   - MySQL Workbench（查询分析）
   - Spring Boot Actuator（监控指标）

2. **前端**:
   - React DevTools Profiler
   - Chrome DevTools Performance
   - Flipper（React Native调试）

3. **数据库**:
   - MySQL EXPLAIN
   - Percona Toolkit
   - pt-query-digest

---

## 📞 支持

如遇到问题：
1. 查看详细文档：`PERFORMANCE_OPTIMIZATION.md`
2. 检查日志文件
3. 使用性能分析工具定位问题
4. 联系开发团队

---

**最后更新**: 2024年11月24日  
**版本**: v1.9.0
