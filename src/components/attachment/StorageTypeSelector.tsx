/**
 * 存储类型选择器组件
 * 允许用户选择云端或本地存储，并显示对比说明
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Icon } from '../common';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';
import { StorageType, StorageOption } from '../../types/attachment';

// 存储选项配置
const STORAGE_OPTIONS: StorageOption[] = [
  {
    type: 'local',
    title: '本地存储',
    description: '文件保存在手机本地',
    icon: '📱',
    pros: [
      '完全免费，不占用服务器空间',
      '访问速度快，无需网络',
      '隐私性强，数据完全在本地',
      '无流量消耗',
    ],
    cons: [
      '换设备后附件不会同步',
      '卸载应用会丢失附件',
      '占用手机存储空间',
      '无法多设备查看',
    ],
  },
  {
    type: 'cloud',
    title: '云端存储',
    description: '文件上传到服务器',
    icon: '☁️',
    pros: [
      '多设备同步，随时随地访问',
      '换设备不会丢失',
      '卸载应用后数据保留',
      '支持分享和协作',
    ],
    cons: [
      '占用服务器空间（可能收费）',
      '需要网络连接',
      '上传需要消耗流量',
      '受服务器限制',
    ],
  },
];

interface StorageTypeSelectorProps {
  selectedType: StorageType;
  onTypeChange: (type: StorageType) => void;
  showCompactMode?: boolean; // 紧凑模式，只显示选择按钮
}

export const StorageTypeSelector: React.FC<StorageTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  showCompactMode = false,
}) => {
  const [showModal, setShowModal] = useState(false);

  const selectedOption = STORAGE_OPTIONS.find(opt => opt.type === selectedType);

  const renderOption = (option: StorageOption, isSelected: boolean) => (
    <TouchableOpacity
      key={option.type}
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
      ]}
      onPress={() => {
        onTypeChange(option.type);
        if (!showCompactMode) {
          setShowModal(false);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.optionHeader}>
        <Text style={styles.optionIcon}>{option.icon}</Text>
        <View style={styles.optionHeaderText}>
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
            {option.title}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Icon name="checkmark-circle" size={24} color={Colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.optionDetails}>
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>✅ 优点：</Text>
          {option.pros.map((pro, index) => (
            <Text key={index} style={styles.detailItem}>• {pro}</Text>
          ))}
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>⚠️ 缺点：</Text>
          {option.cons.map((con, index) => (
            <Text key={index} style={styles.detailItem}>• {con}</Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  // 紧凑模式：只显示选择按钮和问号
  if (showCompactMode) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactOptions}>
          {STORAGE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.compactOption,
                selectedType === option.type && styles.compactOptionSelected,
              ]}
              onPress={() => onTypeChange(option.type)}
            >
              <Text style={styles.compactOptionIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.compactOptionText,
                  selectedType === option.type && styles.compactOptionTextSelected,
                ]}
              >
                {option.title}
              </Text>
              {selectedType === option.type && (
                <Icon name="checkmark" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.compactHelpButton}
            onPress={() => setShowModal(true)}
          >
            <Icon name="help-circle-outline" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* 对比说明 Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>存储方式对比</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowModal(false)}
                >
                  <Icon name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {STORAGE_OPTIONS.map(option =>
                  renderOption(option, option.type === selectedType)
                )}

                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationTitle}>💡 推荐</Text>
                  <Text style={styles.recommendationText}>
                    <Text style={styles.recommendationBold}>个人使用</Text>
                    ：推荐选择本地存储，完全免费且速度快。
                  </Text>
                  <Text style={styles.recommendationText}>
                    <Text style={styles.recommendationBold}>多设备同步</Text>
                    ：如需多设备查看或协作记账，请选择云端存储。
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalConfirmText}>我知道了</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 完整模式：直接显示选项卡片
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>选择存储方式</Text>
        <Text style={styles.headerSubtitle}>根据需求选择合适的存储方式</Text>
      </View>
      {STORAGE_OPTIONS.map(option =>
        renderOption(option, option.type === selectedType)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 完整模式样式
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  // 紧凑模式样式
  compactContainer: {
    marginBottom: Spacing.xs,
  },
  compactOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 4,
  },
  compactOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  compactOptionIcon: {
    fontSize: 14,
  },
  compactOptionText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    fontWeight: FontWeights.regular,
  },
  compactOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  compactHelpButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.background,
  },

  // 选项卡片样式
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  optionHeaderText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  selectedBadge: {
    marginLeft: Spacing.sm,
  },
  optionDetails: {
    gap: Spacing.sm,
  },
  detailSection: {
    gap: 4,
  },
  detailTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  detailItem: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: Spacing.xs,
  },

  // Modal样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  recommendationBox: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recommendationTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  recommendationText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  recommendationBold: {
    fontWeight: FontWeights.bold,
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalConfirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.surface,
  },
});
