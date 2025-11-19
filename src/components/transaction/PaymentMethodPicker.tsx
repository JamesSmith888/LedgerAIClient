import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../../constants/theme';
import type { PaymentMethod } from '../../types/paymentMethod';
import { PaymentIcon } from '../payment/PaymentIcon';

interface PaymentMethodPickerProps {
  visible: boolean;
  paymentMethods: PaymentMethod[];
  currentPaymentMethod?: PaymentMethod;
  onSelect: (paymentMethod: PaymentMethod) => void;
  onClose: () => void;
  title?: string;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  visible,
  paymentMethods,
  currentPaymentMethod,
  onSelect,
  onClose,
  title = '选择支付方式',
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={styles.container}>
            {/* 把手 */}
            <View style={styles.handle} />

            {/* 标题栏 */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 支付方式列表 */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {paymentMethods.map(method => {
                const isSelected = currentPaymentMethod?.id === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.methodItem, isSelected && styles.methodItemSelected]}
                    onPress={() => onSelect(method)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.methodLeft}>
                      <View
                        style={[
                          styles.methodIconContainer,
                          isSelected && styles.methodIconContainerSelected,
                        ]}
                      >
                        <PaymentIcon 
                          type={method.type}
                          iconName={method.icon}
                          size={24}
                        />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text
                          style={[styles.methodName, isSelected && styles.methodNameSelected]}
                        >
                          {method.name}
                        </Text>
                        {method.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>默认</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.background,
  },
  methodItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodIconContainerSelected: {
    backgroundColor: Colors.primary + '15',
  },
  methodIcon: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  methodName: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  methodNameSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  defaultBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  checkIcon: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
});
