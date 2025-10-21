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
  amount: number;
  description: string;
  onDescriptionChange: (text: string) => void;
  onNumberPress: (num: string) => void;
  onDeletePress: () => void;
}

export const DetailedInputPanel: React.FC<DetailedInputPanelProps> = ({
  amount,
  description,
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
    backgroundColor: Colors.background,
    paddingTop: Spacing.lg,
  },
  divider: {
    height: 8,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  customAmountContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  currencySymbol: {
    fontSize: FontSizes.xl,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  amountText: {
    fontSize: FontSizes.xxxl,
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
});
