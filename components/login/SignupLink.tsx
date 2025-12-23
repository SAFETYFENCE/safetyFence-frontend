
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface Props {
    onSignup: () => void;
}

const SignupLink: React.FC<Props> = ({ onSignup }) => {
    return (
        <View className="flex-row justify-center items-center mb-8">
            <Text className="text-gray-500 text-base">
                계정이 없으신가요?
            </Text>
            <TouchableOpacity onPress={onSignup} className="ml-2 py-2">
                <Text className="text-green-500 font-bold text-base">
                    회원가입
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default SignupLink;
