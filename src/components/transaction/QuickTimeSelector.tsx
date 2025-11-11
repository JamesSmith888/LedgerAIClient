import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { QUICK_TIME_OPTIONS } from '../../types/transaction.ts';

interface QuickTimeSelectorProps {
  selectedDaysAgo: number;
  onSelect: (daysAgo: number) => void;
}

export const QuickTimeSelector: React.FC<QuickTimeSelectorProps> = ({
  selectedDaysAgo,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>时间</Text>
      <View style={styles.timeButtons}>
        {QUICK_TIME_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.timeButton,
              selectedDaysAgo === option.value && styles.timeButtonSelected,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.timeButtonText,
                selectedDaysAgo === option.value &&
                  styles.timeButtonTextSelected,
              ]}
            >
              {option.label}
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
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    letterSpacing: 0.2,
  },
  timeButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  timeButton: {
    flex: 1,
    paddingVertical: Spacing.md + 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.sm,
  },
  timeButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.05 }],
    ...Shadows.md,
  },
  timeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  timeButtonTextSelected: {
    color: Colors.surface,
    fontWeight: '700',
  },
});
