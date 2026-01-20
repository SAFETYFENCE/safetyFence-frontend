
import { CheckSquare, Square } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    number: string;
    password: string;
    isLoading: boolean;
    autoLogin: boolean;
    onNumberChange: (text: string) => void;
    onPasswordChange: (text: string) => void;
    onAutoLoginChange: (value: boolean) => void;
    onSubmit: () => void;
}

const LoginForm: React.FC<Props> = ({
    number,
    password,
    isLoading,
    autoLogin,
    onNumberChange,
    onPasswordChange,
    onAutoLoginChange,
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

            <View className="flex-row items-center mb-2 ml-1">
                <Text className="text-gray-600 font-semibold">비밀번호</Text>
                <Text className="text-green-600 text-xs ml-2">(비밀번호는 "111" 고정입니다)</Text>
            </View>
            <TextInput
                className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base mb-4"
                placeholder="111"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry
                editable={false}
            />

            {/* 자동 로그인 체크박스 */}
            <TouchableOpacity
                className="flex-row items-center mb-6 ml-1"
                onPress={() => onAutoLoginChange(!autoLogin)}
                activeOpacity={0.7}
            >
                {autoLogin ? (
                    <CheckSquare size={20} color="#22c55e" />
                ) : (
                    <Square size={20} color="#9ca3af" />
                )}
                <Text className="text-gray-700 text-base ml-2">자동 로그인</Text>
            </TouchableOpacity>

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
