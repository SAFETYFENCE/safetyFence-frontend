import { UserMedicineData } from '@/hooks/useMedicineData';
import { CheckCircle2, Pill, Sparkles, User as UserIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface UserMedicineCardProps {
    item: UserMedicineData;
}

// Reusing theme for consistency
const THEME = {
    primary: '#0d9488',
    textSub: '#64748b',
};

const UserMedicineCard: React.FC<UserMedicineCardProps> = ({ item }) => {
    return (
        <View className="mb-8">
            <View className="flex-row items-end mb-4 px-1">
                <Text className="text-xl font-extrabold text-slate-800 mr-2">{item.user.userName}</Text>
                <Text className="text-sm font-medium text-slate-400 mb-1">님의 복용 일정</Text>
            </View>

            <View className="bg-white rounded-[28px] p-6 shadow-sm shadow-slate-200 border border-slate-100">
                {/* User Info Header in Card */}
                <View className="flex-row items-center justify-between mb-8">
                    <View className="flex-row items-center">
                        <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center border border-white shadow-sm overflow-hidden">
                            <UserIcon size={24} color="#94a3b8" />
                        </View>
                        <View className="ml-3">
                            <Text className="text-sm text-slate-500">연결된 계정</Text>
                            <Text className="text-base font-bold text-slate-800">{item.user.userNumber}</Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    <View className={`px-3 py-1.5 rounded-full flex-row items-center ${item.totalMedications > 0 ? 'bg-teal-50' : 'bg-slate-50'}`}>
                        {item.totalMedications > 0 ? (
                            <>
                                <Sparkles size={12} color={THEME.primary} />
                                <Text className="text-teal-700 font-bold text-xs ml-1">
                                    {item.checkedMedications}/{item.totalMedications} 복용
                                </Text>
                            </>
                        ) : (
                            <Text className="text-slate-500 font-bold text-xs">일정 없음</Text>
                        )}
                    </View>
                </View>

                {/* Medicine List or Empty State */}
                {item.error ? (
                    <View className="py-8 items-center justify-center bg-red-50 rounded-2xl border border-red-100">
                        <Text className="text-red-500 font-medium">일정을 불러올 수 없어요</Text>
                    </View>
                ) : item.medicines.length > 0 ? (
                    <View className="gap-3">
                        {item.medicines.map((medicine) => (
                            <View
                                key={medicine.id}
                                className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-row items-center"
                            >
                                <View className="h-12 w-12 rounded-full bg-teal-50 items-center justify-center mr-4">
                                    <Pill size={20} color={THEME.primary} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-lg mb-1">{medicine.name}</Text>
                                    {medicine.dosage && medicine.dosage !== '정보 없음' && (
                                        <Text className="text-slate-500 text-sm">용량: {medicine.dosage}</Text>
                                    )}
                                    {medicine.purpose && medicine.purpose !== '정보 없음' && (
                                        <Text className="text-slate-500 text-sm">목적: {medicine.purpose}</Text>
                                    )}
                                </View>
                                {medicine.checkedToday && (
                                    <View className="bg-teal-600 px-3 py-1.5 rounded-lg">
                                        <Text className="text-white text-xs font-bold">복용완료</Text>
                                    </View>
                                )}
                                {!medicine.checkedToday && (
                                    <View className="bg-slate-200 px-3 py-1.5 rounded-lg">
                                        <Text className="text-slate-600 text-xs font-bold">미복용</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="py-10 items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <View className="w-14 h-14 bg-white rounded-full items-center justify-center mb-3 shadow-sm">
                            <CheckCircle2 size={24} color="#cbd5e1" />
                        </View>
                        <Text className="text-slate-400 font-medium text-base">오늘은 챙겨드릴 약이 없어요</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default UserMedicineCard;
