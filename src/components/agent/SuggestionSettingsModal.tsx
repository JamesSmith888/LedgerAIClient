import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../../constants/theme';
import { Icon } from '../common';

interface SuggestionSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  enabled: boolean;
  onEnableChange: (value: boolean) => void;
  maxCount: number;
  onMaxCountChange: (value: number) => void;
}

export const SuggestionSettingsModal: React.FC<SuggestionSettingsModalProps> = ({
  visible,
  onClose,
  enabled,
  onEnableChange,
  maxCount,
  onMaxCountChange,
}) => {
  const counts = [1, 2, 3, 4, 5];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>智能建议设置</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* 启用开关 */}
                <View style={styles.row}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>启用智能建议</Text>
                    <Text style={styles.subLabel}>根据对话内容自动推荐后续操作</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={onEnableChange}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={'#fff'}
                  />
                </View>

                {/* 数量选择 */}
                {enabled && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>显示建议数量</Text>
                    <View style={styles.countContainer}>
                      {counts.map((count) => (
                        <TouchableOpacity
                          key={count}
                          style={[
                            styles.countButton,
                            maxCount === count && styles.countButtonActive,
                          ]}
                          onPress={() => onMaxCountChange(count)}
                        >
                          <Text
                            style={[
                              styles.countText,
                              maxCount === count && styles.countTextActive,
                            ]}
                          >
                            {count}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.hint}>
                      首条建议将自动填入输入框
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  labelContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  countButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  countText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  countTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
