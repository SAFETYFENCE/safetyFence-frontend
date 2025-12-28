import PostcodeModal from '@/components/signup/PostcodeModal';
import { DaumPostcodeData } from '@/utils/DaumPostcode';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddressChangeModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { zipCode: string; streetAddress: string; detailAddress?: string }) => void;
    type: 'home' | 'center';
}

export default function AddressChangeModal({ visible, onClose, onSubmit, type }: AddressChangeModalProps) {
    const [showPostcode, setShowPostcode] = useState(false);
    const [zipCode, setZipCode] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [detailAddress, setDetailAddress] = useState('');

    const title = type === 'home' ? '집 주소 변경' : '센터 주소 변경';
    const needsDetail = type === 'home';

    const handlePostcodeSelect = (data: DaumPostcodeData) => {
        setZipCode(data.postcode);
        setStreetAddress(data.roadAddress);
        setShowPostcode(false);
    };

    const handleSubmit = () => {
        if (!zipCode || !streetAddress) {
            Alert.alert('알림', '주소를 입력해주세요.');
            return;
        }

        if (needsDetail && !detailAddress.trim()) {
            Alert.alert('알림', '상세 주소를 입력해주세요.');
            return;
        }

        onSubmit({
            zipCode,
            streetAddress,
            ...(needsDetail && { detailAddress: detailAddress.trim() }),
        });

        // 초기화
        setZipCode('');
        setStreetAddress('');
        setDetailAddress('');
    };

    const handleClose = () => {
        setZipCode('');
        setStreetAddress('');
        setDetailAddress('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white rounded-t-[32px] h-[75%] shadow-2xl">
                    {/* Header */}
                    <View className="px-6 py-5 border-b border-gray-100 flex-row items-center justify-between">
                        <Text className="text-2xl font-extrabold text-gray-900">{title}</Text>
                        <TouchableOpacity onPress={handleClose} className="bg-gray-100 p-2.5 rounded-full">
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 py-6">
                        {/* 우편번호 + 도로명 주소 */}
                        <View className="mb-4">
                            <Text className="text-sm font-bold text-gray-700 mb-2">우편번호 및 도로명 주소</Text>
                            <TouchableOpacity
                                onPress={() => setShowPostcode(true)}
                                className="bg-teal-600 py-3 rounded-xl items-center active:bg-teal-700"
                            >
                                <Text className="text-white font-bold">주소 검색</Text>
                            </TouchableOpacity>

                            {zipCode && streetAddress && (
                                <View className="mt-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <Text className="text-xs text-gray-500 mb-1">우편번호</Text>
                                    <Text className="text-base font-bold text-gray-900 mb-2">{zipCode}</Text>
                                    <Text className="text-xs text-gray-500 mb-1">도로명 주소</Text>
                                    <Text className="text-base font-bold text-gray-900">{streetAddress}</Text>
                                </View>
                            )}
                        </View>

                        {/* 상세 주소 (집 주소만) */}
                        {needsDetail && (
                            <View className="mb-4">
                                <Text className="text-sm font-bold text-gray-700 mb-2">상세 주소</Text>
                                <TextInput
                                    className="bg-gray-50 px-5 py-4 rounded-xl text-base border border-gray-200 text-gray-900"
                                    placeholder="예: 101동 202호"
                                    value={detailAddress}
                                    onChangeText={setDetailAddress}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        )}

                        {/* 제출 버튼 */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            className="bg-teal-600 py-4 rounded-xl items-center mt-4 active:bg-teal-700"
                        >
                            <Text className="text-white text-lg font-bold">주소 변경하기</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>

            {/* 주소 검색 모달 */}
            <PostcodeModal
                visible={showPostcode}
                onClose={() => setShowPostcode(false)}
                onSelect={handlePostcodeSelect}
            />
        </Modal>
    );
}
