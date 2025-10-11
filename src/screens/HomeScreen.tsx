/**
 * 主页 - 展示所有常用组件的示例
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '../components/common';
import { Colors, Spacing, FontSizes, FontWeights } from '../constants/theme';
import type { ListItem } from '../types';

export const HomeScreen: React.FC = () => {
  // 表单状态
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // 示例列表数据
  const [items] = useState<ListItem[]>([
    { id: '1', title: '项目一', subtitle: '这是第一个项目的描述' },
    { id: '2', title: '项目二', subtitle: '这是第二个项目的描述' },
    { id: '3', title: '项目三', subtitle: '这是第三个项目的描述' },
    { id: '4', title: '项目四', subtitle: '这是第四个项目的描述' },
  ]);

  // 验证邮箱
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError('请输入有效的邮箱地址');
    } else {
      setEmailError('');
    }
  };

  // 提交表单
  const handleSubmit = () => {
    if (!name || !email || emailError) {
      Alert.alert('提示', '请填写完整且正确的信息');
      return;
    }

    setLoading(true);
    // 模拟网络请求
    setTimeout(() => {
      setLoading(false);
      Alert.alert('成功', `欢迎 ${name}！\n邮箱: ${email}`);
    }, 1500);
  };

  // 渲染列表项
  const renderItem = ({ item }: { item: ListItem }) => (
    <Card style={styles.listCard}>
      <View style={styles.listItem}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.title.charAt(item.title.length - 1)}
          </Text>
        </View>
        <View style={styles.listContent}>
          <Text style={styles.listTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.listSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.title}>欢迎使用 LedgerAI</Text>
          <Text style={styles.subtitle}>React Native 组件示例</Text>
        </View>

        {/* 表单卡片 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📝 表单示例</Text>
          <Input
            label="姓名"
            placeholder="请输入您的姓名"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="邮箱"
            placeholder="请输入您的邮箱"
            value={email}
            onChangeText={validateEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {/* 开关示例 */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>接收通知</Text>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={isEnabled ? Colors.primary : Colors.surface}
            />
          </View>

          <Button
            title={loading ? '提交中...' : '提交'}
            onPress={handleSubmit}
            loading={loading}
          />
        </Card>

        {/* 按钮样式示例 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 按钮样式</Text>
          <View style={styles.buttonRow}>
            <Button
              title="主要按钮"
              onPress={() => Alert.alert('提示', '你点击了主要按钮')}
              variant="primary"
              size="medium"
              style={styles.buttonSpacing}
            />
            <Button
              title="次要按钮"
              onPress={() => Alert.alert('提示', '你点击了次要按钮')}
              variant="secondary"
              size="medium"
              style={styles.buttonSpacing}
            />
          </View>
          <View style={styles.buttonRow}>
            <Button
              title="轮廓按钮"
              onPress={() => Alert.alert('提示', '你点击了轮廓按钮')}
              variant="outline"
              size="small"
              style={styles.buttonSpacing}
            />
            <Button
              title="文本按钮"
              onPress={() => Alert.alert('提示', '你点击了文本按钮')}
              variant="text"
              size="small"
              style={styles.buttonSpacing}
            />
          </View>
          <Button
            title="禁用按钮"
            onPress={() => {}}
            disabled
          />
        </Card>

        {/* 统计卡片 */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>128</Text>
            <Text style={styles.statLabel}>用户</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>56</Text>
            <Text style={styles.statLabel}>项目</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>98%</Text>
            <Text style={styles.statLabel}>完成率</Text>
          </Card>
        </View>

        {/* 列表示例 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📋 列表示例</Text>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </Card>

        {/* 底部间距 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  section: {
    margin: Spacing.md,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  buttonSpacing: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  listCard: {
    padding: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.surface,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  listSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  separator: {
    height: Spacing.sm,
  },
  bottomSpacing: {
    height: Spacing.lg,
  },
});
