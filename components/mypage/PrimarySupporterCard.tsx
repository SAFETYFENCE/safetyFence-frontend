import { linkService } from '@/services/linkService';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function PrimarySupporterCard() {
    const [primarySupporter, setPrimarySupporter] = useState<{ supporterName: string; relation: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchPrimarySupporter = useCallback(async () => {
        try {
            setLoading(true);
            const data = await linkService.getPrimarySupporter();
            setPrimarySupporter({ supporterName: data.supporterName, relation: data.relation });
            setError(false);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setPrimarySupporter(null);
            } else {
                setError(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrimarySupporter();
    }, [fetchPrimarySupporter]);

    if (loading) {
        return (
            <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <ActivityIndicator size="small" color="#0d9488" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <Text className="text-red-500 text-center">대표 보호자 정보를 불러올 수 없습니다.</Text>
            </View>
        );
    }

    return (
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <Text className="text-lg font-extrabold text-gray-900 mb-4">대표 보호자</Text>
            {primarySupporter ? (
                <View className="flex-row items-center justify-between bg-teal-50 p-4 rounded-xl border border-teal-100">
                    <View>
                        <Text className="text-base font-bold text-gray-900">{primarySupporter.supporterName}</Text>
                        <Text className="text-sm text-gray-600 mt-1">{primarySupporter.relation}</Text>
                    </View>
                    <View className="bg-teal-600 px-3 py-1 rounded-full">
                        <Text className="text-white text-xs font-bold">대표</Text>
                    </View>
                </View>
            ) : (
                <View className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                    <Text className="text-gray-500 text-center">대표 보호자가 설정되지 않았습니다.</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">보호자 목록에서 설정해주세요.</Text>
                </View>
            )}
        </View>
    );
}
