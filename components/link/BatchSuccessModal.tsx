import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    type: 'schedule' | 'medicine' | 'location';
    itemName: string;
    totalCount: number;
    successCount: number;
    failCount: number;
    onConfirm: () => void;
}

const BatchSuccessModal: React.FC<Props> = ({
    visible,
    type,
    itemName,
    totalCount,
    successCount,
    failCount,
    onConfirm
}) => {
    const getTypeLabel = () => {
        switch (type) {
            case 'schedule':
                return '일정';
            case 'medicine':
                return '약';
            case 'location':
                return '위치';
        }
    };

    const getIconName = () => {
        switch (type) {
            case 'schedule':
                return 'calendar' as const;
            case 'medicine':
                return 'medkit' as const;
            case 'location':
                return 'location' as const;
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                <View className="bg-white w-full rounded-[30px] p-8 items-center shadow-2xl">
                    {/* Success Icon */}
                    <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                    </View>

                    {/* Title & Message */}
                    <Text className="text-2xl font-extrabold text-gray-900 mb-2 text-center">
                        {getTypeLabel()} 추가 완료!
                    </Text>

                    <View className="items-center mb-6">
                        <View className="flex-row items-center mb-3">
                            <View className="bg-blue-50 p-2 rounded-xl mr-2">
                                <Ionicons name={getIconName()} size={20} color="#3b82f6" />
                            </View>
                            <Text className="text-lg font-bold text-gray-700">
                                '{itemName}'
                            </Text>
                        </View>

                        <Text className="text-gray-500 text-center text-base leading-6">
                            {getTypeLabel()}을(를) 추가했습니다.
                        </Text>
                    </View>

                    {/* Stats */}
                    <View className="w-full bg-gray-50 rounded-2xl p-4 mb-6">
                        <View className="flex-row justify-around">
                            <View className="items-center">
                                <Text className="text-sm text-gray-500 mb-1">전체</Text>
                                <Text className="text-2xl font-bold text-gray-900">{totalCount}명</Text>
                            </View>
                            <View className="w-px bg-gray-300" />
                            <View className="items-center">
                                <Text className="text-sm text-gray-500 mb-1">성공</Text>
                                <Text className="text-2xl font-bold text-green-600">{successCount}명</Text>
                            </View>
                            {failCount > 0 && (
                                <>
                                    <View className="w-px bg-gray-300" />
                                    <View className="items-center">
                                        <Text className="text-sm text-gray-500 mb-1">실패</Text>
                                        <Text className="text-2xl font-bold text-red-600">{failCount}명</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Button */}
                    <TouchableOpacity
                        className="w-full bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-200 active:bg-green-700"
                        onPress={onConfirm}
                    >
                        <Text className="text-white font-bold text-lg">
                            확인
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default BatchSuccessModal;
