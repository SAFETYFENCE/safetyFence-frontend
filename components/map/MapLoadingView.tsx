
import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    message?: string;
}

const MapLoadingView: React.FC<Props> = ({ message = '위치 정보를 불러오는 중...' }) => {
    return (
        <SafeAreaView className="flex-1 justify-center items-center bg-green-50">
            <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-lg">{message}</Text>
        </SafeAreaView>
    );
};

export default MapLoadingView;
