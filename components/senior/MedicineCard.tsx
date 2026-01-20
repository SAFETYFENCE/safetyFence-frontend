import { MedicineLog } from '@/types/calendar';
import { Clock, Pill, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface MedicineCardProps {
    log: MedicineLog;
    onDelete?: (medicationId: number, logId: number) => void;
}

export default function MedicineCard({ log, onDelete }: MedicineCardProps) {
    const timeString = `${log.time.getHours().toString().padStart(2, '0')}:${log.time.getMinutes().toString().padStart(2, '0')}`;

    return (
        <View className="bg-white rounded-xl shadow p-4 mb-3 border-l-4 border-blue-500">
            <View className="flex-row items-start">
                <View className="h-11 w-11 bg-blue-50 rounded-lg items-center justify-center mr-3">
                    <Pill size={20} color="#3b82f6" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900 mb-1">{log.medicineName}</Text>
                    <View className="flex-row items-center mb-2">
                        <Clock size={13} color="#6b7280" />
                        <Text className="text-sm text-gray-600 ml-1.5">{timeString}</Text>
                    </View>
                    <View className="self-start px-2.5 py-1 rounded-full bg-blue-100">
                        <Text className="text-xs font-semibold text-blue-700">
                            복용 완료
                        </Text>
                    </View>
                </View>
                {onDelete && (
                    <TouchableOpacity
                        onPress={() => onDelete(log.medicationId, log.id)}
                        activeOpacity={0.7}
                        className="bg-red-50 w-10 h-10 rounded-full items-center justify-center"
                    >
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
