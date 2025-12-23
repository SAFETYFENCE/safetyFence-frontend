
import React from 'react';
import { Image, Text, View } from 'react-native';

const LoginHeader: React.FC = () => {
    return (
        <View className="bg-green-500 px-6 pt-16 pb-12 rounded-b-[40px] shadow-sm mb-8 items-center">
            <View className="mb-6 p-2 bg-white/20 rounded-full">
                <Image
                    source={require('../../assets/images/logo.png')}
                    className="w-24 h-24 rounded-full"
                    resizeMode="cover"
                />
            </View>
            <Text className="text-3xl font-bold text-white mb-2 tracking-tight text-center">
                Safety Fence
            </Text>
            <Text className="text-green-100 text-base font-medium text-center">
                안전하고 편리한 케어 서비스
            </Text>
        </View>
    );
};

export default LoginHeader;
