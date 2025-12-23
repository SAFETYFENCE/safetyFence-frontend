
import React from 'react';
import { Linking, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    error: string;
}

const MapErrorView: React.FC<Props> = ({ error }) => {
    return (
        <SafeAreaView className="flex-1 justify-center items-center bg-green-50 p-5">
            <Text style={{ fontFamily: 'System' }} className="text-red-600 text-lg text-center mb-4">
                오류 발생
            </Text>
            <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-base text-center">
                {error}
            </Text>
            {error.includes('권한') && (
                <TouchableOpacity
                    className="mt-6 bg-green-600 px-6 py-3 rounded-lg"
                    onPress={() => Linking.openSettings()}
                >
                    <Text style={{ fontFamily: 'System' }} className="text-white font-medium">
                        설정으로 이동
                    </Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

export default MapErrorView;
