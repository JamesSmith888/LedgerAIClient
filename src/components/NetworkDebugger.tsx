import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { API_BASE_URL } from '../api/config';

interface NetworkDebuggerProps {
    visible?: boolean;
}

export const NetworkDebugger: React.FC<NetworkDebuggerProps> = ({ visible = false }) => {
    const [isVisible, setIsVisible] = useState(visible);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // 拦截 console.log 和 console.error
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            if (message.includes('[LedgerAI]')) {
                setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()} - ${message}`]);
            }
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            if (message.includes('[LedgerAI]')) {
                setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()} - ❌ ${message}`]);
            }
            originalError.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
        };
    }, []);

    if (!isVisible) {
        return (
            <TouchableOpacity 
                style={styles.floatingButton}
                onPress={() => setIsVisible(true)}
            >
                <Text style={styles.floatingButtonText}>🐛</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>网络调试器</Text>
                <TouchableOpacity onPress={() => setIsVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>环境:</Text>
                <Text style={styles.infoValue}>
                    {__DEV__ ? '开发环境' : '生产环境'}
                </Text>
            </View>
            
            <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>API 地址:</Text>
                <Text style={styles.infoValue}>{API_BASE_URL}</Text>
            </View>

            <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setLogs([])}
            >
                <Text style={styles.clearButtonText}>清空日志</Text>
            </TouchableOpacity>

            <ScrollView style={styles.logContainer}>
                {logs.length === 0 ? (
                    <Text style={styles.emptyText}>暂无日志</Text>
                ) : (
                    logs.map((log, index) => (
                        <Text key={index} style={styles.logText}>
                            {log}
                        </Text>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 100,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 9999,
    },
    floatingButtonText: {
        fontSize: 24,
    },
    container: {
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        bottom: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 10,
        padding: 15,
        zIndex: 10000,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    infoBox: {
        flexDirection: 'row',
        marginBottom: 10,
        padding: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 5,
    },
    infoLabel: {
        color: '#888',
        fontSize: 14,
        marginRight: 10,
    },
    infoValue: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    clearButton: {
        backgroundColor: '#FF5722',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    logContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 5,
        padding: 10,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    logText: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 5,
        fontFamily: 'monospace',
    },
});
