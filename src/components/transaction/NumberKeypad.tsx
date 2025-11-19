import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontSizes,
  FontWeights,
  Shadows,
  Spacing,
} from '../../constants/theme';

interface NumberKeypadProps {
  onNumberPress: (num: string) => void;
  onDeletePress: () => void;
  onOperatorPress?: (operator: '+' | '-') => void; // 操作符回调
  onEquals?: () => void; // 等号按钮回调
}

export const NumberKeypad: React.FC<NumberKeypadProps> = ({
  onNumberPress,
  onDeletePress,
  onOperatorPress,
  onEquals,
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mainKeypad}>
        {/* 数字键盘区域 */}
        <View style={styles.numbersSection}>
          {keys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    key === '⌫' && styles.deleteKey,
                  ]}
                  onPress={() => {
                    if (key === '⌫') {
                      onDeletePress();
                    } else {
                      onNumberPress(key);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.keyText,
                    key === '⌫' && styles.deleteKeyText,
                  ]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* 操作符区域 */}
        {onOperatorPress && (
          <View style={styles.operatorsSection}>
            <TouchableOpacity
              style={styles.operatorKey}
              onPress={() => onOperatorPress('+')}
              activeOpacity={0.7}
            >
              <Text style={styles.operatorText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.operatorKey}
              onPress={() => onOperatorPress('-')}
              activeOpacity={0.7}
            >
              <Text style={styles.operatorText}>−</Text>
            </TouchableOpacity>
            {/* 等号按钮 */}
            {onEquals && (
              <TouchableOpacity
                style={styles.equalsKey}
                onPress={onEquals}
                activeOpacity={0.7}
              >
                <Text style={styles.equalsText}>=</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  mainKeypad: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  numbersSection: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  key: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  deleteKey: {
    backgroundColor: Colors.backgroundSecondary,
  },
  keyText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  deleteKeyText: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  operatorsSection: {
    width: 64,
    gap: Spacing.xs,
  },
  operatorKey: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  operatorText: {
    fontSize: 28,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  equalsKey: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  equalsText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
  },
});
