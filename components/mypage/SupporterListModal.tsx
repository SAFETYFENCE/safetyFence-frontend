import { linkService } from '@/services/linkService';
import type { SupporterItem } from '@/types/api';
import { formatPhoneNumber } from '@/utils/formatters';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface SupporterListModalProps {
    visible: boolean;
    onClose: () => void;
    onPrimarySet?: () => void;
}

export default function SupporterListModal({ visible, onClose, onPrimarySet }: SupporterListModalProps) {
    const [supporters, setSupporters] = useState<SupporterItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSupporters = useCallback(async () => {
        try {
            setLoading(true);
            const data = await linkService.getMySupporters();
            setSupporters(data);
        } catch (error) {
            console.error('보호자 목록 조회 실패:', error);
            Alert.alert('오류', '보호자 목록을 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchSupporters();
        }
    }, [visible, fetchSupporters]);

    const handleSetPrimary = async (linkId: number, supporterName: string) => {
        Alert.alert(
            '대표 보호자 설정',
            `${supporterName}님을 대표 보호자로 설정하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '설정',
                    onPress: async () => {
                        try {
                            await linkService.setPrimarySupporter(linkId);
                            Alert.alert('성공', '대표 보호자가 설정되었습니다.');
                            await fetchSupporters();
                            onPrimarySet?.();
                        } catch (error) {
                            console.error('대표 보호자 설정 실패:', error);
                            Alert.alert('오류', '대표 보호자 설정에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white rounded-t-[32px] h-[70%] shadow-2xl">
                    {/* Header */}
                    <View className="px-6 py-5 border-b border-gray-100 flex-row items-center justify-between">
                        <Text className="text-2xl font-extrabold text-gray-900">보호자 목록</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2.5 rounded-full">
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 px-6 py-6">
                        {loading ? (
                            <ActivityIndicator size="large" color="#0d9488" className="mt-10" />
                        ) : supporters.length === 0 ? (
                            <View className="items-center justify-center py-20">
                                <Text className="text-gray-400 text-lg">등록된 보호자가 없습니다.</Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {supporters.map((supporter) => (
                                    <View
                                        key={supporter.linkId}
                                        className={`p-5 rounded-2xl border ${supporter.isPrimary ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <View className="flex-row items-center justify-between mb-3">
                                            <View>
                                                <Text className="text-xl font-bold text-gray-900">{supporter.supporterName}</Text>
                                                <Text className="text-sm text-gray-600 mt-1">{supporter.relation}</Text>
                                                <Text className="text-sm text-gray-600 mt-1">{formatPhoneNumber(supporter.supporterNumber)}</Text>
                                            </View>
                                            {supporter.isPrimary && (
                                                <View className="bg-teal-600 px-3 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold">대표</Text>
                                                </View>
                                            )}
                                        </View>
                                        {!supporter.isPrimary && (
                                            <TouchableOpacity
                                                onPress={() => handleSetPrimary(supporter.linkId, supporter.supporterName)}
                                                className="bg-teal-600 py-2.5 rounded-xl items-center active:bg-teal-700"
                                            >
                                                <Text className="text-white font-bold">대표 보호자로 설정</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
