
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const SignupHeader: React.FC = () => {
    const router = useRouter();

    return (
        <View className="bg-green-500 px-6 pt-6 pb-10 rounded-b-[30px] shadow-sm mb-6">
            <View className="flex-row items-center justify-center relative mb-2">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute left-0 w-10 h-10 items-center justify-center rounded-full bg-white/20"
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-3xl font-bold text-white">회원가입</Text>
            </View>
            <Text className="text-green-100 text-base text-center">
                서비스 이용을 위해 정보를 입력해주세요
            </Text>
        </View>
    );
};

export default SignupHeader;
