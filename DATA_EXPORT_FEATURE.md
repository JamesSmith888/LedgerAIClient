# 数据导出功能

## 功能概述

数据导出功能允许用户将账本系统中的数据以标准格式导出，便于：
- 数据备份
- 迁移到其他应用
- 数据分析和报表

## 功能入口

`个人中心` -> `设置` -> `导出数据`

## 支持的导出格式

| 格式 | 说明 | 用途 |
|------|------|------|
| JSON | 标准JSON格式 | 便于程序处理和二次开发 |
| CSV | 通用表格格式 | 可用Excel、Numbers等打开 |
| Excel | Microsoft Excel格式 | 支持多工作表（简化版CSV） |

## 可导出的数据类型

| 类型 | 说明 |
|------|------|
| 全部数据 | 导出所有账本、交易、分类、支付方式 |
| 交易记录 | 仅导出交易记录 |
| 分类数据 | 仅导出分类配置 |
| 支付方式 | 仅导出支付方式 |
| 账本信息 | 仅导出账本基本信息 |

## 导出数据结构

### JSON 完整导出格式

```json
{
  "exportVersion": "1.0",
  "exportTime": "2025-11-26 10:30:00",
  "userId": 12345,
  "ledgers": [...],
  "transactions": [...],
  "categories": [...],
  "paymentMethods": [...],
  "statistics": {
    "ledgerCount": 2,
    "transactionCount": 150,
    "categoryCount": 20,
    "paymentMethodCount": 5
  }
}
```

### 交易记录字段

| 字段 | 说明 |
|------|------|
| id | 交易ID |
| name | 交易名称 |
| description | 交易描述 |
| amount | 金额 |
| type | 类型（INCOME/EXPENSE） |
| transactionDateTime | 交易时间 |
| ledgerName | 账本名称 |
| categoryName | 分类名称 |
| categoryIcon | 分类图标 |
| paymentMethodName | 支付方式名称 |
| createTime | 创建时间 |

## API 接口

### 导出数据
```
POST /api/export/data
```

请求体：
```json
{
  "format": "JSON",        // JSON, CSV, EXCEL
  "dataType": "ALL",       // ALL, TRANSACTIONS, CATEGORIES, PAYMENT_METHODS, LEDGERS
  "ledgerId": null,        // 可选，指定账本ID
  "startDate": null,       // 可选，开始日期
  "endDate": null          // 可选，结束日期
}
```

### 获取导出预览
```
POST /api/export/preview
```

返回数据量预估和文件大小估算。

## 文件结构

### 前端
- `src/screens/SettingsScreen.tsx` - 设置页面
- `src/screens/DataExportScreen.tsx` - 数据导出页面
- `src/api/services/exportAPI.ts` - 导出API服务

### 后端
- `ledger/controller/ExportController.java` - 导出控制器
- `ledger/service/ExportService.java` - 导出服务
- `ledger/vo/export/` - 导出相关VO类

## 注意事项

1. 导出的数据仅包含用户有权限访问的账本数据
2. 共享账本中的交易记录也会被导出
3. Excel格式目前使用CSV兼容模式，如需真正的xlsx格式需要添加Apache POI依赖
4. 大量数据导出时建议选择特定账本或数据类型

## 后续扩展

- [ ] 数据导入功能
- [ ] 定时自动备份
- [ ] 云端备份集成
- [ ] 更多导出格式支持
