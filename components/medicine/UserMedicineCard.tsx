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
        <View className="mb-6">
            <View className="flex-row items-end mb-3 px-1">
                <Text className="text-lg font-extrabold text-gray-800 mr-2">{item.user.userName}</Text>
                <Text className="text-sm font-medium text-gray-500 mb-1">님의 복용 일정</Text>
            </View>

            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {/* User Info Header in Card */}
                <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 mr-3">
                            <UserIcon size={20} color="#9ca3af" />
                        </View>
                        <View>
                            <Text className="text-xs text-gray-400 font-medium">연결 ID</Text>
                            <Text className="text-sm font-bold text-gray-700">{item.user.userNumber}</Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    <View className={`px-3 py-1.5 rounded-full flex-row items-center ${item.totalMedications > 0 && item.checkedMedications === item.totalMedications ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {item.totalMedications > 0 ? (
                            <>
                                <Sparkles size={12} color={item.checkedMedications === item.totalMedications ? '#15803d' : '#6b7280'} />
                                <Text className={`text-xs font-bold ml-1.5 ${item.checkedMedications === item.totalMedications ? 'text-green-700' : 'text-gray-600'}`}>
                                    {item.checkedMedications}/{item.totalMedications} 완료
                                </Text>
                            </>
                        ) : (
                            <Text className="text-gray-500 font-bold text-xs">일정 없음</Text>
                        )}
                    </View>
                </View>

                {/* Medicine List or Empty State */}
                {item.error ? (
                    <View className="py-6 items-center justify-center bg-red-50 rounded-xl border border-red-100">
                        <Text className="text-red-500 font-medium text-sm">일정을 불러올 수 없어요</Text>
                    </View>
                ) : item.medicines.length > 0 ? (
                    <View className="gap-3">
                        {item.medicines.map((medicine) => (
                            <View
                                key={medicine.id}
                                className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row items-start"
                            >
                                <View className={`h-10 w-10 rounded-lg items-center justify-center mr-3 ${medicine.checkedToday ? 'bg-green-100' : 'bg-white border border-gray-200'}`}>
                                    <Pill size={18} color={medicine.checkedToday ? '#15803d' : '#64748b'} />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row justify-between items-start">
                                        <View>
                                            <Text className={`text-base font-bold mb-1 ${medicine.checkedToday ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {medicine.name}
                                            </Text>
                                            <View className="flex-row flex-wrap gap-2">
                                                {medicine.dosage && medicine.dosage !== '정보 없음' && (
                                                    <Text className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                        {medicine.dosage}
                                                    </Text>
                                                )}
                                                {medicine.purpose && medicine.purpose !== '정보 없음' && (
                                                    <Text className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                        {medicine.purpose}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {medicine.checkedToday ? (
                                            <View className="bg-green-500 px-2.5 py-1 rounded-lg shadow-sm">
                                                <Text className="text-white text-xs font-bold">복용함</Text>
                                            </View>
                                        ) : (
                                            <View className="bg-gray-200 px-2.5 py-1 rounded-lg">
                                                <Text className="text-gray-500 text-xs font-bold">미복용</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="py-8 items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
                        <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center mb-2">
                            <CheckCircle2 size={20} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-400 font-medium text-sm">오늘은 예정된 약이 없어요</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default UserMedicineCard;
