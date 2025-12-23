
import DaumPostcode, { DaumPostcodeData } from '@/utils/DaumPostcode';
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    title?: string;
    onClose: () => void;
    onSelect: (data: DaumPostcodeData) => void;
}

const PostcodeModal: React.FC<Props> = ({ visible, title = "주소 검색", onClose, onSelect }) => {
    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <Text className="text-lg font-bold text-gray-900">{title}</Text>
                    <TouchableOpacity onPress={onClose} className="p-2">
                        <X size={24} color="#111827" />
                    </TouchableOpacity>
                </View>
                <DaumPostcode
                    onSubmit={onSelect}
                    onClose={onClose}
                />
            </SafeAreaView>
        </Modal>
    );
};

export default PostcodeModal;
