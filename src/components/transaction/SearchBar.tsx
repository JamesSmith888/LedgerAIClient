/**
 * 交易搜索栏组件
 * 支持模糊搜索、防抖、快速清除等功能
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Keyboard,
    Text,
    ViewStyle,
} from 'react-native';
import { Icon } from '../common';
import {
    Colors,
    Spacing,
    FontSizes,
    BorderRadius,
    FontWeights,
    Shadows,
} from '../../constants/theme';

interface SearchBarProps {
    /** 搜索关键词变化回调（已防抖） */
    onSearch: (keyword: string) => void;
    /** 防抖延迟（毫秒），默认 400ms */
    debounceDelay?: number;
    /** 占位符文本 */
    placeholder?: string;
    /** 是否自动聚焦 */
    autoFocus?: boolean;
    /** 容器样式 */
    containerStyle?: ViewStyle;
    /** 是否显示取消按钮 */
    showCancelButton?: boolean;
    /** 取消按钮点击回调 */
    onCancel?: () => void;
    /** 初始关键词 */
    initialKeyword?: string;
    /** 搜索结果数量（用于显示） */
    resultCount?: number;
    /** 是否正在搜索 */
    isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    onSearch,
    debounceDelay = 400,
    placeholder = '搜索交易记录...',
    autoFocus = false,
    containerStyle,
    showCancelButton = true,
    onCancel,
    initialKeyword = '',
    resultCount,
    isSearching = false,
}) => {
    const [inputValue, setInputValue] = useState(initialKeyword);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // 动画值
    const cancelButtonWidth = useRef(new Animated.Value(initialKeyword ? 60 : 0)).current;
    const inputScaleX = useRef(new Animated.Value(1)).current;

    // 防抖搜索
    const debouncedSearch = useCallback((keyword: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            onSearch(keyword.trim());
        }, debounceDelay);
    }, [onSearch, debounceDelay]);

    // 输入变化处理
    const handleInputChange = useCallback((text: string) => {
        setInputValue(text);
        debouncedSearch(text);
    }, [debouncedSearch]);

    // 清除输入
    const handleClear = useCallback(() => {
        setInputValue('');
        onSearch('');
        inputRef.current?.focus();
    }, [onSearch]);

    // 取消搜索
    const handleCancel = useCallback(() => {
        setInputValue('');
        onSearch('');
        Keyboard.dismiss();
        setIsFocused(false);
        onCancel?.();
    }, [onSearch, onCancel]);

    // 聚焦处理
    const handleFocus = useCallback(() => {
        setIsFocused(true);
        if (showCancelButton) {
            Animated.parallel([
                Animated.timing(cancelButtonWidth, {
                    toValue: 60,
                    duration: 200,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [cancelButtonWidth, showCancelButton]);

    // 失焦处理
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // 如果没有输入内容，收起取消按钮
        if (!inputValue && showCancelButton) {
            Animated.timing(cancelButtonWidth, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
    }, [cancelButtonWidth, inputValue, showCancelButton]);

    // 清理防抖定时器
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // 同步外部初始关键词变化
    useEffect(() => {
        if (initialKeyword !== inputValue && initialKeyword === '') {
            setInputValue('');
        }
    }, [initialKeyword]);

    const hasInput = inputValue.length > 0;

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
                hasInput && styles.inputContainerActive,
            ]}>
                {/* 搜索图标 */}
                <Icon
                    name="search"
                    size={18}
                    color={isFocused || hasInput ? Colors.primary : Colors.textLight}
                    style={styles.searchIcon}
                />

                {/* 输入框 */}
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={inputValue}
                    onChangeText={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textLight}
                    returnKeyType="search"
                    autoFocus={autoFocus}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="never"
                />

                {/* 加载指示器或清除按钮 */}
                {hasInput && (
                    isSearching ? (
                        <View style={styles.loadingContainer}>
                            <Icon name="reload" size={16} color={Colors.textLight} />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClear}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="close-circle" size={18} color={Colors.textLight} />
                        </TouchableOpacity>
                    )
                )}
            </View>

            {/* 取消按钮 */}
            {showCancelButton && (
                <Animated.View style={[styles.cancelButtonWrapper, { width: cancelButtonWidth }]}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
};

// ========== 可展开/收起的搜索按钮版本 ==========
interface CollapsibleSearchBarProps extends Omit<SearchBarProps, 'showCancelButton' | 'onCancel'> {
    /** 是否展开状态 */
    expanded: boolean;
    /** 展开/收起切换回调 */
    onToggle: () => void;
}

export const CollapsibleSearchBar: React.FC<CollapsibleSearchBarProps> = ({
    expanded,
    onToggle,
    ...searchBarProps
}) => {
    const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(expandAnim, {
            toValue: expanded ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [expanded, expandAnim]);

    const searchBarOpacity = expandAnim;
    const searchBarHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 52],
    });

    if (!expanded) {
        return null;
    }

    return (
        <Animated.View 
            style={[
                styles.collapsibleContainer,
                {
                    opacity: searchBarOpacity,
                    height: searchBarHeight,
                }
            ]}
        >
            <SearchBar
                {...searchBarProps}
                showCancelButton={true}
                onCancel={onToggle}
                autoFocus={expanded}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.sm,
        height: 40,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputContainerFocused: {
        borderColor: Colors.primary + '50',
        backgroundColor: Colors.surface,
    },
    inputContainerActive: {
        backgroundColor: Colors.surface,
        borderColor: Colors.primary + '30',
    },
    searchIcon: {
        marginRight: Spacing.xs,
    },
    input: {
        flex: 1,
        fontSize: FontSizes.md,
        color: Colors.text,
        paddingVertical: 0,
        height: 40,
    },
    clearButton: {
        padding: Spacing.xs,
    },
    loadingContainer: {
        padding: Spacing.xs,
    },
    cancelButtonWrapper: {
        overflow: 'hidden',
    },
    cancelButton: {
        paddingLeft: Spacing.sm,
        justifyContent: 'center',
        height: 40,
    },
    cancelButtonText: {
        fontSize: FontSizes.md,
        color: Colors.primary,
        fontWeight: FontWeights.medium,
    },
    collapsibleContainer: {
        overflow: 'hidden',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.xs,
    },
});
