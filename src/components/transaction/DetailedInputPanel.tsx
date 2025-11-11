import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '../common/Input';
import { NumberKeypad } from './NumberKeypad';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Spacing,
} from '../../constants/theme';

interface DetailedInputPanelProps {
  amount: string;
  description: string;
  onAmountChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onNumberPress: (num: string) => void;
  onDeletePress: () => void;
}

export const DetailedInputPanel: React.FC<DetailedInputPanelProps> = ({
  amount,
  description,
  onAmountChange,
  onDescriptionChange,
  onNumberPress,
  onDeletePress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.divider} />

      <Text style={styles.title}>详细信息</Text>

      <View style={styles.customAmountContainer}>
        <Text style={styles.label}>自定义金额</Text>
        <View style={styles.amountDisplay}>
          <Text style={styles.currencySymbol}>¥</Text>
          <Text style={styles.amountText}>{amount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Input
          label="备注"
          placeholder="添加备注信息（可选）"
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={3}
        />
      </View>

      <NumberKeypad
        onNumberPress={onNumberPress}
        onDeletePress={onDeletePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceSecondary,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    letterSpacing: 0.2,
  },
  customAmountContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    marginRight: 8,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
