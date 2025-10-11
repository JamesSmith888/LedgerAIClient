/**
 * 消息页面
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';

// 模拟消息数据
const messages = [
  { id: '1', name: '张三', message: '明天一起去吃饭吧', time: '10:30' },
  { id: '2', name: '李四', message: '项目进度怎么样了？', time: '昨天' },
  { id: '3', name: '王五', message: '收到，马上处理', time: '星期一' },
];

export const MessagesScreen: React.FC = () => {
  const renderMessage = ({ item }: any) => (
    <Card style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageTop}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={1}>
            {item.message}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>消息</Text>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  messageCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  time: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  messageText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
