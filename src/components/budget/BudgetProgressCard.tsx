import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../constants/theme';
import { BudgetOverview } from '../../types/budget';
import Icon from 'react-native-vector-icons/Ionicons';

interface BudgetProgressCardProps {
  budget: BudgetOverview;
  onPress?: () => void;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({ budget, onPress }) => {
  const { totalBudget, totalExpense, remainingBudget, progress, status } = budget;

  const getStatusColor = () => {
    switch (status) {
      case 'EXCEEDED': return Colors.error;
      case 'WARNING': return Colors.warning;
      default: return Colors.primary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="pie-chart-outline" size={18} color={Colors.text} />
          <Text style={styles.title}>本月预算</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'EXCEEDED' ? '已超支' : status === 'WARNING' ? '即将超支' : '正常'}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.label}>剩余额度</Text>
          <Text style={[styles.amount, { color: remainingBudget < 0 ? Colors.error : Colors.text }]}>
            ¥{remainingBudget.toFixed(2)}
          </Text>
        </View>
        <View style={styles.rightAmount}>
          <Text style={styles.label}>总预算</Text>
          <Text style={styles.subAmount}>¥{totalBudget.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor }]} />
      </View>
      
      <View style={styles.progressLabels}>
        <Text style={styles.progressText}>已用 {progress}%</Text>
        <Text style={styles.progressText}>¥{totalExpense.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  rightAmount: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  progressContainer: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
