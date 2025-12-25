import { User as UserIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

const MedicineEmptyState: React.FC = () => {
    return (
        <View className="items-center justify-center py-20 px-8">
            <View className="bg-white p-6 rounded-[32px] mb-8 shadow-sm border border-slate-100 relative">
                <View className="bg-slate-50 p-6 rounded-full">
                    <UserIcon size={48} color="#94a3b8" />
                </View>
                <View className="absolute -bottom-2 -right-2 bg-teal-500 w-12 h-12 rounded-full items-center justify-center border-4 border-white shadow-md">
                    <View className="w-4 h-0.5 bg-white rounded-full absolute" />
                    <View className="h-4 w-0.5 bg-white rounded-full absolute" />
                </View>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-3 text-center">보호자님, 환영합니다!</Text>
            <Text className="text-slate-500 text-center leading-7 text-base mb-8">
                아직 관리 중인 어르신이 없으시네요.{'\n'}
                하단 <Text className="font-bold text-teal-600">'연결'</Text> 탭에서 이용자를 추가하고{'\n'}
                건강 관리를 시작해보세요.
            </Text>
        </View>
    );
};

export default MedicineEmptyState;
