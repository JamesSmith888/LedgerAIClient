import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Shadows,
  Spacing,
} from '../../constants/theme.ts';
import { QUICK_AMOUNTS } from '../../types/transaction.ts';

interface QuickAmountSelectorProps {
  selectedAmount?: number;
  onSelect: (amount: number) => void;
}

export const QuickAmountSelector: React.FC<QuickAmountSelectorProps> = ({
  selectedAmount,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>快速选择金额</Text>
      <View style={styles.grid}>
        {QUICK_AMOUNTS.map(amount => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.amountButton,
              selectedAmount === amount && styles.amountButtonSelected,
            ]}
            onPress={() => onSelect(amount)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.amountText,
                selectedAmount === amount && styles.amountTextSelected,
              ]}
            >
              ￥{amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  amountButton: {
    width: '18%',
    aspectRatio: 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  amountButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.05 }],
    ...Shadows.md,
  },
  amountText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  amountTextSelected: {
    color: Colors.surface,
    fontWeight: '700',
  },
});
