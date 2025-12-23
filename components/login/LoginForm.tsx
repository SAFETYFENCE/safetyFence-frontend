
import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    number: string;
    password: string;
    isLoading: boolean;
    onNumberChange: (text: string) => void;
    onPasswordChange: (text: string) => void;
    onSubmit: () => void;
}

const LoginForm: React.FC<Props> = ({
    number,
    password,
    isLoading,
    onNumberChange,
    onPasswordChange,
    onSubmit
}) => {
    return (
        <View className="mb-6">
            <Text className="text-gray-600 font-semibold mb-2 ml-1">전화번호</Text>
            <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base mb-5"
                placeholder="01012345678"
                placeholderTextColor="#9ca3af"
                value={number}
                onChangeText={onNumberChange}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <Text className="text-gray-600 font-semibold mb-2 ml-1">비밀번호</Text>
            <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base mb-8"
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry
            />

            <TouchableOpacity
                className={`w-full py-4 rounded-2xl items-center justify-center shadow-lg shadow-green-200 ${isLoading ? 'bg-green-400' : 'bg-green-500 active:bg-green-600'
                    }`}
                onPress={onSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <View className="flex-row items-center">
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-white font-bold text-lg ml-2">
                            로그인 중...
                        </Text>
                    </View>
                ) : (
                    <Text className="text-white font-bold text-lg">
                        로그인
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default LoginForm;
