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
  onConfirm?: () => void; // 改为可选
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
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>
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
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  key: {
    flex: 1,
    height: 48, // 减小高度
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2, // 减小间距
  },
  keyText: {
    fontSize: 24, // 增大字体
    color: Colors.text,
    fontWeight: '400', // 正常字重
  },
});
