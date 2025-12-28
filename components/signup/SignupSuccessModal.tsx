import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    userName: string;
    onConfirm: () => void;
}

const SignupSuccessModal: React.FC<Props> = ({ visible, userName, onConfirm }) => {
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
                        회원가입 완료!
                    </Text>
                    <Text className="text-gray-500 text-center text-base mb-8 leading-6">
                        <Text className="font-bold text-gray-700">{userName}</Text>님 환영합니다.{'\n'}
                        이제 로그인을 진행해주세요.
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        className="w-full bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-200 active:bg-green-700"
                        onPress={onConfirm}
                    >
                        <Text className="text-white font-bold text-lg">
                            로그인하러 가기
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default SignupSuccessModal;
