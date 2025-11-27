import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  Colors,
  FontSizes,
  FontWeights,
  Spacing,
  BorderRadius,
} from '../../constants/theme';

const QUICK_DATE_OPTIONS = [
  { label: '今天', offset: 0 },
  { label: '昨天', offset: -1 },
  { label: '前天', offset: -2 },
];

interface DatePickerProps {
  visible: boolean;
  onSelect: (date: Date) => void;
  onClose: () => void;
  currentDate: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  onSelect,
  onClose,
  currentDate,
}) => {
  // 修复：使用本地日期而不是 UTC 日期
  const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const getDateWithOffset = (offset: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offset);
    return base;
  };

  const [selectedDate, setSelectedDate] = useState(() => toISODate(currentDate));

  useEffect(() => {
    if (visible) {
      setSelectedDate(toISODate(currentDate));
    }
  }, [currentDate, visible]);

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleQuickSelect = (offset: number) => {
    const date = getDateWithOffset(offset);
    setSelectedDate(toISODate(date));
    onSelect(date);
    onClose();
  };

  const handleConfirm = () => {
    // 修复时区问题：使用本地时间，保留原始时间的时分秒
    const [year, month, day] = selectedDate.split('-').map(Number);
    const localDate = new Date(currentDate);
    localDate.setFullYear(year);
    localDate.setMonth(month - 1);
    localDate.setDate(day);
    onSelect(localDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>选择日期</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>快捷选择</Text>
            <View style={styles.quickButtons}>
              {QUICK_DATE_OPTIONS.map(option => {
                const quickDate = getDateWithOffset(option.offset);
                const iso = toISODate(quickDate);
                const isActive = selectedDate === iso;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.quickButton,
                      isActive && styles.quickButtonActive,
                    ]}
                    onPress={() => handleQuickSelect(option.offset)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.quickButtonText,
                        isActive && styles.quickButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: Colors.primary,
              },
            }}
            theme={{
              arrowColor: Colors.primary,
              todayTextColor: Colors.primary,
              textSectionTitleColor: Colors.textSecondary,
            }}
            style={styles.calendar}
          />
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>确定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  quickSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  quickTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
  },
  quickButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quickButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  quickButtonActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  quickButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  quickButtonTextActive: {
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  calendar: {
    marginHorizontal: Spacing.lg,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
});
