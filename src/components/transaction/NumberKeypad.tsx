import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontSizes,
  Spacing,
} from '../../constants/theme';

interface NumberKeypadProps {
  onNumberPress: (num: string) => void;
  onDeletePress: () => void;
}

export const NumberKeypad: React.FC<NumberKeypadProps> = ({
  onNumberPress,
  onDeletePress,
}) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  return (
    <View style={styles.container}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(key => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              onPress={() => {
                if (key === '⌫') {
                  onDeletePress();
                } else {
                  onNumberPress(key);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.keyText, key === '⌫' && styles.deleteKeyText]}
              >
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  key: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  keyText: {
    fontSize: FontSizes.xxl,
    color: Colors.text,
    fontWeight: '500',
  },
  deleteKeyText: {
    fontSize: FontSizes.xl,
    color: Colors.error,
    fontWeight: '600',
  },
});
