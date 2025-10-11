import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Colors, FontSizes, FontWeights, Spacing } from '../constants/theme.ts';
import { Card } from '../components/common';

export const DiscoverScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>发现</Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🎯 推荐内容</Text>
          <Text style={styles.cardText}>这里可以展示推荐的内容</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📰 最新动态</Text>
          <Text style={styles.cardText}>这里可以展示最新的动态信息</Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔥 热门话题</Text>
          <Text style={styles.cardText}>这里可以展示热门话题</Text>
        </Card>
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
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  card: {
    margin: Spacing.md,
    marginTop: 0,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  cardText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});
