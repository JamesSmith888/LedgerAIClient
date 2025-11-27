/**
 * 数据导出页面
 * 支持导出交易记录、分类、支付方式等数据
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, FontWeights } from '../constants/theme';
import { Icon, AppIcons } from '../components/common';
import { toast } from '../utils/toast';
import { exportAPI, ExportFormat, ExportDataType, ExportOptions } from '../api/services/exportAPI';
import { useLedger } from '../context/LedgerContext';
import RNFS from 'react-native-fs';

// 导出格式选项
const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; icon: string }[] = [
    {
        value: 'JSON',
        label: 'JSON',
        description: '标准JSON格式，便于程序处理和二次开发',
        icon: AppIcons.codeSlash,
    },
    {
        value: 'CSV',
        label: 'CSV',
        description: '通用表格格式，可用Excel打开',
        icon: AppIcons.gridOutline,
    },
    {
        value: 'EXCEL',
        label: 'Excel',
        description: 'Microsoft Excel格式，支持多工作表',
        icon: AppIcons.documentOutline,
    },
];

// 数据类型选项
const DATA_TYPE_OPTIONS: { value: ExportDataType; label: string; description: string }[] = [
    { value: 'ALL', label: '全部数据', description: '导出所有账本、交易、分类、支付方式' },
    { value: 'TRANSACTIONS', label: '交易记录', description: '仅导出交易记录' },
    { value: 'CATEGORIES', label: '分类数据', description: '仅导出分类配置' },
    { value: 'PAYMENT_METHODS', label: '支付方式', description: '仅导出支付方式' },
    { value: 'LEDGERS', label: '账本信息', description: '仅导出账本基本信息' },
];

export const DataExportScreen: React.FC = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { ledgers } = useLedger();

    // 状态
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('JSON');
    const [selectedDataType, setSelectedDataType] = useState<ExportDataType>('ALL');
    const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string>('');

    // 处理导出
    const handleExport = async () => {
        try {
            setIsExporting(true);
            setExportProgress('正在准备导出...');

            const options: ExportOptions = {
                format: selectedFormat,
                dataType: selectedDataType,
                ledgerId: selectedLedgerId,
            };

            setExportProgress('正在获取数据...');
            const result = await exportAPI.exportData(options);

            if (!result.success) {
                throw new Error(result.message || '导出失败');
            }

            setExportProgress('正在保存文件...');

            // 获取文件扩展名
            const extension = selectedFormat === 'JSON' ? 'json' : selectedFormat === 'CSV' ? 'csv' : 'xlsx';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `ledger_export_${timestamp}.${extension}`;

            // 保存文件到本地
            const downloadPath = Platform.OS === 'ios'
                ? `${RNFS.DocumentDirectoryPath}/${fileName}`
                : `${RNFS.DownloadDirectoryPath}/${fileName}`;

            if (selectedFormat === 'EXCEL' && result.base64Data) {
                // Excel文件需要写入base64数据
                await RNFS.writeFile(downloadPath, result.base64Data, 'base64');
            } else if (result.data) {
                // JSON/CSV写入文本数据
                const content = selectedFormat === 'JSON'
                    ? JSON.stringify(result.data, null, 2)
                    : result.data;
                await RNFS.writeFile(downloadPath, content, 'utf8');
            }

            setExportProgress('导出完成！');

            // 显示成功提示和分享选项
            Alert.alert(
                '导出成功',
                `文件已保存到：${downloadPath}`,
                [
                    {
                        text: '分享',
                        onPress: () => shareFile(downloadPath),
                    },
                    {
                        text: '确定',
                        style: 'default',
                    },
                ]
            );

            toast.success('数据导出成功');
        } catch (error: any) {
            console.error('导出失败:', error);
            toast.error(error.message || '导出失败，请重试');
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    // 分享文件
    const shareFile = async (filePath: string) => {
        try {
            if (Platform.OS === 'ios') {
                await Share.share({
                    url: `file://${filePath}`,
                });
            } else {
                // Android 需要使用 content:// URI
                await Share.share({
                    message: `LedgerAI 数据导出文件`,
                    title: '分享导出数据',
                    url: `file://${filePath}`,
                });
            }
        } catch (error) {
            console.error('分享失败:', error);
        }
    };

    // 渲染格式选项
    const renderFormatOption = (option: typeof FORMAT_OPTIONS[0]) => {
        const isSelected = selectedFormat === option.value;
        return (
            <TouchableOpacity
                key={option.value}
                style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedFormat(option.value)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.optionIconContainer,
                    isSelected && styles.optionIconContainerSelected,
                ]}>
                    <Icon
                        name={option.icon}
                        size={24}
                        color={isSelected ? Colors.surface : Colors.primary}
                    />
                </View>
                <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                ]}>
                    {option.label}
                </Text>
                <Text style={[
                    styles.optionDescription,
                    isSelected && styles.optionDescriptionSelected,
                ]}>
                    {option.description}
                </Text>
                {isSelected && (
                    <View style={styles.checkmark}>
                        <Icon name={AppIcons.checkmark} size={16} color={Colors.surface} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // 渲染数据类型选项
    const renderDataTypeOption = (option: typeof DATA_TYPE_OPTIONS[0]) => {
        const isSelected = selectedDataType === option.value;
        return (
            <TouchableOpacity
                key={option.value}
                style={[
                    styles.dataTypeItem,
                    isSelected && styles.dataTypeItemSelected,
                ]}
                onPress={() => setSelectedDataType(option.value)}
                activeOpacity={0.7}
            >
                <View style={styles.dataTypeContent}>
                    <Text style={[
                        styles.dataTypeLabel,
                        isSelected && styles.dataTypeLabelSelected,
                    ]}>
                        {option.label}
                    </Text>
                    <Text style={styles.dataTypeDescription}>
                        {option.description}
                    </Text>
                </View>
                <View style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                ]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染账本选择器
    const renderLedgerSelector = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>选择账本（可选）</Text>
            <Text style={styles.sectionSubtitle}>不选择则导出所有账本的数据</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.ledgerList}
            >
                <TouchableOpacity
                    style={[
                        styles.ledgerChip,
                        selectedLedgerId === null && styles.ledgerChipSelected,
                    ]}
                    onPress={() => setSelectedLedgerId(null)}
                >
                    <Text style={[
                        styles.ledgerChipText,
                        selectedLedgerId === null && styles.ledgerChipTextSelected,
                    ]}>
                        全部账本
                    </Text>
                </TouchableOpacity>
                {ledgers.map(ledger => (
                    <TouchableOpacity
                        key={ledger.id}
                        style={[
                            styles.ledgerChip,
                            selectedLedgerId === ledger.id && styles.ledgerChipSelected,
                        ]}
                        onPress={() => setSelectedLedgerId(ledger.id)}
                    >
                        <Text style={[
                            styles.ledgerChipText,
                            selectedLedgerId === ledger.id && styles.ledgerChipTextSelected,
                        ]}>
                            {ledger.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* 头部导航 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>导出数据</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* 导出格式选择 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>选择导出格式</Text>
                    <View style={styles.formatOptions}>
                        {FORMAT_OPTIONS.map(renderFormatOption)}
                    </View>
                </View>

                {/* 数据类型选择 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>选择导出内容</Text>
                    <View style={styles.dataTypeList}>
                        {DATA_TYPE_OPTIONS.map(renderDataTypeOption)}
                    </View>
                </View>

                {/* 账本选择 */}
                {selectedDataType !== 'CATEGORIES' &&
                    selectedDataType !== 'PAYMENT_METHODS' &&
                    renderLedgerSelector()}

                {/* 导出说明 */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <Icon name={AppIcons.informationCircle} size={20} color={Colors.info} />
                        <Text style={styles.infoText}>
                            导出的数据将保存到您的设备本地，您可以通过分享功能发送到其他应用或备份到云端。
                        </Text>
                    </View>
                </View>

                {/* 底部间距 */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* 导出按钮 */}
            <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
                {exportProgress ? (
                    <View style={styles.progressContainer}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.progressText}>{exportProgress}</Text>
                    </View>
                ) : null}
                <TouchableOpacity
                    style={[
                        styles.exportButton,
                        isExporting && styles.exportButtonDisabled,
                    ]}
                    onPress={handleExport}
                    disabled={isExporting}
                    activeOpacity={0.8}
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color={Colors.surface} />
                    ) : (
                        <>
                            <Icon name={AppIcons.downloadOutline} size={22} color={Colors.surface} />
                            <Text style={styles.exportButtonText}>开始导出</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 32,
        color: Colors.text,
        fontWeight: '300',
    },
    headerTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    sectionSubtitle: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    formatOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    optionCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.border,
        position: 'relative',
        ...Shadows.sm,
    },
    optionCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    optionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    optionIconContainerSelected: {
        backgroundColor: Colors.primary,
    },
    optionLabel: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: Colors.primary,
    },
    optionDescription: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
    },
    optionDescriptionSelected: {
        color: Colors.textSecondary,
    },
    checkmark: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dataTypeList: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    dataTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    dataTypeItemSelected: {
        backgroundColor: Colors.primary + '08',
    },
    dataTypeContent: {
        flex: 1,
    },
    dataTypeLabel: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.medium,
        color: Colors.text,
    },
    dataTypeLabelSelected: {
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    dataTypeDescription: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: Colors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
    },
    ledgerList: {
        marginTop: Spacing.xs,
    },
    ledgerChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.round,
        backgroundColor: Colors.surface,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ledgerChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    ledgerChipText: {
        fontSize: FontSizes.sm,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
    ledgerChipTextSelected: {
        color: Colors.surface,
    },
    infoSection: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: Colors.info + '10',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.info,
        lineHeight: 20,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...Shadows.md,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    progressText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    exportButtonDisabled: {
        backgroundColor: Colors.textLight,
    },
    exportButtonText: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.surface,
    },
});
