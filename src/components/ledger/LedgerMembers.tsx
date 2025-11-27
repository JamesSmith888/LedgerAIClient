import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { ledgerMemberAPI } from '../../api/services/ledgerMemberAPI';
import { LedgerMember, getRoleName, getRoleColor } from '../../types/ledger';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows, FontWeights } from '../../constants/theme';
import { Icon } from '../common/Icon';

interface LedgerMembersProps {
    ledgerId: number;
    maxDisplay?: number;
    showName?: boolean;
    avatarSize?: number;
}

export const LedgerMembers: React.FC<LedgerMembersProps> = ({ 
    ledgerId, 
    maxDisplay = 3, 
    showName = false,
    avatarSize = 24
}) => {
    const [members, setMembers] = useState<LedgerMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [selectedMember, setSelectedMember] = useState<LedgerMember | null>(null);

    useEffect(() => {
        if (ledgerId) {
            loadMembers();
        }
    }, [ledgerId]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await ledgerMemberAPI.getMembers(ledgerId);
            setMembers(data);
        } catch (error) {
            console.error('Failed to load ledger members:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || members.length === 0) {
        return null;
    }

    const displayMembers = members.slice(0, maxDisplay);
    const remainingCount = members.length - maxDisplay;

    const renderAvatar = (member: LedgerMember, size: number) => {
        const name = member.nickname || member.userName || member.username || `User ${member.userId}`;
        const avatarUrl = member.userAvatar || member.avatarUrl;
        
        if (avatarUrl) {
            return (
                <Image 
                    source={{ uri: avatarUrl }} 
                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} 
                />
            );
        }
        
        return (
            <View style={[styles.avatar, styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
                <Text style={[styles.defaultAvatarText, { fontSize: size * 0.4 }]}>
                    {name.charAt(0).toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <>
            <TouchableOpacity 
                style={styles.container} 
                onPress={() => setShowAllMembers(true)}
                activeOpacity={0.7}
            >
                {displayMembers.map((member, index) => (
                    <TouchableOpacity 
                        key={member.id} 
                        style={[styles.memberItem, { zIndex: maxDisplay - index, marginLeft: index > 0 ? -8 : 0 }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            setSelectedMember(member);
                        }}
                    >
                        <View style={[styles.avatarWrapper, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                            {renderAvatar(member, avatarSize)}
                        </View>
                        {showName && (
                            <Text style={styles.memberName} numberOfLines={1}>
                                {member.nickname || member.userName || member.username}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
                
                {remainingCount > 0 && (
                    <View style={[styles.moreBadge, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, marginLeft: -8, zIndex: 0 }]}>
                        <Text style={[styles.moreText, { fontSize: avatarSize * 0.4 }]}>+{remainingCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* All Members Modal */}
            <Modal
                visible={showAllMembers}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAllMembers(false)}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => setShowAllMembers(false)}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>账本成员 ({members.length})</Text>
                            <TouchableOpacity onPress={() => setShowAllMembers(false)} style={styles.closeButton}>
                                <Icon name="close" size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
                            {members.map((member) => {
                                const name = member.nickname || member.userName || member.username || `User ${member.userId}`;
                                const roleName = getRoleName(member.role);
                                const roleColor = getRoleColor(member.role);
                                
                                return (
                                    <TouchableOpacity 
                                        key={member.id} 
                                        style={styles.memberListItem}
                                        onPress={() => {
                                            setShowAllMembers(false);
                                            setSelectedMember(member);
                                        }}
                                    >
                                        <View style={styles.memberListItemLeft}>
                                            {renderAvatar(member, 40)}
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberNameLarge}>{name}</Text>
                                                <Text style={styles.memberEmail}>ID: {member.userId}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                                            <Text style={[styles.roleText, { color: roleColor }]}>{roleName}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Single Member Modal */}
            <Modal
                visible={!!selectedMember}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedMember(null)}
            >
                <Pressable 
                    style={styles.modalOverlay} 
                    onPress={() => setSelectedMember(null)}
                >
                    <Pressable style={styles.singleMemberContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.singleMemberHeader}>
                            <Text style={styles.modalTitle}>成员信息</Text>
                            <TouchableOpacity onPress={() => setSelectedMember(null)} style={styles.closeButton}>
                                <Icon name="close" size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {selectedMember && (
                            <View style={styles.singleMemberBody}>
                                <View style={styles.largeAvatarContainer}>
                                    {renderAvatar(selectedMember, 80)}
                                </View>
                                <Text style={styles.largeMemberName}>
                                    {selectedMember.nickname || selectedMember.userName || selectedMember.username}
                                </Text>
                                <Text style={styles.memberIdText}>ID: {selectedMember.userId}</Text>
                                
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>角色</Text>
                                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedMember.role) + '15' }]}>
                                        <Text style={[styles.roleText, { color: getRoleColor(selectedMember.role) }]}>
                                            {getRoleName(selectedMember.role)}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>加入时间</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(selectedMember.joinedAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: Spacing.md,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        // Removed marginRight to allow overlapping
    },
    avatarWrapper: {
        backgroundColor: Colors.backgroundSecondary,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: Colors.surface,
    },
    avatar: {
        backgroundColor: Colors.backgroundSecondary,
    },
    defaultAvatar: {
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultAvatarText: {
        color: Colors.surface,
        fontWeight: 'bold',
    },
    memberName: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginLeft: 4,
        maxWidth: 80,
    },
    moreBadge: {
        backgroundColor: Colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.surface,
    },
    moreText: {
        color: Colors.textSecondary,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        ...Shadows.md,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    modalTitle: {
        fontSize: FontSizes.lg,
        fontWeight: FontWeights.bold,
        color: Colors.text,
    },
    closeButton: {
        padding: 4,
    },
    memberList: {
        padding: Spacing.md,
    },
    memberListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    memberListItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberInfo: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    memberNameLarge: {
        fontSize: FontSizes.md,
        fontWeight: FontWeights.semibold,
        color: Colors.text,
        marginBottom: 2,
    },
    memberEmail: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: FontWeights.medium,
    },
    // Single Member Modal Styles
    singleMemberContent: {
        width: '100%',
        maxWidth: 300,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        ...Shadows.md,
    },
    singleMemberHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    singleMemberBody: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    largeAvatarContainer: {
        marginBottom: Spacing.md,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.backgroundSecondary,
    },
    largeMemberName: {
        fontSize: FontSizes.xl,
        fontWeight: FontWeights.bold,
        color: Colors.text,
        marginBottom: 4,
    },
    memberIdText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    infoLabel: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    infoValue: {
        fontSize: FontSizes.md,
        color: Colors.text,
        fontWeight: FontWeights.medium,
    },
});
