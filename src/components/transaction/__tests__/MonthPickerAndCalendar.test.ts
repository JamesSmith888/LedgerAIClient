/**
 * 月份选择器和日历热力图组件测试
 */

// MonthPickerSheet 测试数据
export const mockMonthPickerProps = {
    visible: true,
    selectedDate: new Date(2024, 10, 19), // 2024年11月19日
    onClose: () => console.log('关闭月份选择器'),
    onSelectMonth: (date: Date) => console.log('选择月份:', date),
};

// DailyStatisticsCalendar 测试数据
export const mockDailyStatistics = [
    // 大额消费日
    { date: '2024-11-01', income: 0, expense: 1500, count: 3 },
    { date: '2024-11-05', income: 0, expense: 800, count: 5 },
    
    // 中等消费日
    { date: '2024-11-03', income: 0, expense: 350, count: 4 },
    { date: '2024-11-08', income: 0, expense: 220, count: 3 },
    { date: '2024-11-12', income: 0, expense: 480, count: 6 },
    
    // 小额消费日
    { date: '2024-11-02', income: 0, expense: 45, count: 2 },
    { date: '2024-11-06', income: 0, expense: 78, count: 3 },
    { date: '2024-11-10', income: 0, expense: 92, count: 4 },
    
    // 有收入的日子
    { date: '2024-11-15', income: 5000, expense: 0, count: 1 },
    { date: '2024-11-18', income: 500, expense: 120, count: 3 },
    
    // 今天（假设是11月19日）
    { date: '2024-11-19', income: 0, expense: 65, count: 2 },
    
    // 其他日期
    { date: '2024-11-04', income: 0, expense: 180, count: 5 },
    { date: '2024-11-07', income: 0, expense: 320, count: 4 },
    { date: '2024-11-09', income: 0, expense: 150, count: 2 },
    { date: '2024-11-11', income: 0, expense: 420, count: 3 },
    { date: '2024-11-13', income: 0, expense: 90, count: 2 },
    { date: '2024-11-14', income: 0, expense: 560, count: 7 },
    { date: '2024-11-16', income: 0, expense: 280, count: 4 },
    { date: '2024-11-17', income: 0, expense: 650, count: 5 },
];

export const mockCalendarProps = {
    selectedMonth: new Date(2024, 10, 1), // 2024年11月
    statistics: mockDailyStatistics,
    visible: true,
    onDayPress: (date: Date) => console.log('点击日期:', date),
};

// 模拟月度统计汇总
export const mockMonthSummary = {
    totalIncome: mockDailyStatistics.reduce((sum, stat) => sum + stat.income, 0),
    totalExpense: mockDailyStatistics.reduce((sum, stat) => sum + stat.expense, 0),
    totalCount: mockDailyStatistics.reduce((sum, stat) => sum + stat.count, 0),
    daysWithTransactions: mockDailyStatistics.length,
};

console.log('📊 月度汇总统计:');
console.log(`- 总收入: ¥${mockMonthSummary.totalIncome.toFixed(2)}`);
console.log(`- 总支出: ¥${mockMonthSummary.totalExpense.toFixed(2)}`);
console.log(`- 总笔数: ${mockMonthSummary.totalCount}`);
console.log(`- 记账天数: ${mockMonthSummary.daysWithTransactions}`);
console.log(`- 日均消费: ¥${(mockMonthSummary.totalExpense / mockMonthSummary.daysWithTransactions).toFixed(2)}`);

/**
 * 测试热度等级计算
 */
export const testHeatLevels = () => {
    console.log('\n🔥 热度等级测试:');
    
    mockDailyStatistics.forEach(stat => {
        const total = stat.expense + stat.income;
        let level = 0;
        
        if (total > 0) {
            if (total < 100) level = 1;
            else if (total < 500) level = 2;
            else if (total < 1000) level = 3;
            else level = 4;
        }
        
        console.log(`${stat.date}: ¥${total.toFixed(2)} -> Level ${level}`);
    });
};
