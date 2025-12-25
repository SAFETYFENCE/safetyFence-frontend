import { Clock, Pill } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { CalendarEventItem } from '../../types/api';

interface MedicineItemProps {
    item: CalendarEventItem;
    index: number;
    total: number;
}

// Premium Color Palette - Health & Trust Theme
const THEME = {
    primary: '#0d9488', // Teal 600
    primaryDark: '#0f766e', // Teal 700
    primaryLight: '#ccfbf1', // Teal 100
    secondary: '#6366f1', // Indigo 500
    bg: '#f8fafc', // Slate 50
    surface: '#ffffff',
    textMain: '#0f172a', // Slate 900
    textSub: '#64748b', // Slate 500
    accent: '#f59e0b', // Amber 500
};

const MedicineItem: React.FC<MedicineItemProps> = ({ item, index, total }) => {
    const isLast = index === total - 1;

    // 시간 파싱 (HH:mm -> 오전/오후 HH:mm)
    const [h, m] = item.eventStartTime.split(':').map(Number);
    const ampm = h >= 12 ? '오후' : '오전';
    const hours12 = h % 12 || 12;
    const timeStr = `${ampm} ${hours12}:${m.toString().padStart(2, '0')}`;

    return (
        <View className="flex-row items-stretch">
            {/* Timeline Visuals */}
            <View className="width-16 items-center mr-4">
                <View className={`w-3 h-3 rounded-full border-2 z-10 bg-white ${index === 0 ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}`} />
                {!isLast && (
                    <View className="w-0.5 flex-1 bg-slate-200 my-1" />
                )}
            </View>

            {/* Content Card */}
            <View className="flex-1 pb-6">
                <View className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-row items-center">
                    <View className="h-12 w-12 rounded-full bg-teal-50 items-center justify-center mr-4">
                        <Pill size={20} color={THEME.primary} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-lg mb-1">{item.event}</Text>
                        <View className="flex-row items-center">
                            <Clock size={12} color={THEME.textSub} />
                            <Text className="text-slate-500 text-xs ml-1 font-medium">{timeStr}</Text>
                        </View>
                    </View>
                    <View className="bg-slate-50 px-3 py-1.5 rounded-lg">
                        <Text className="text-slate-600 text-xs font-bold">예정</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default MedicineItem;
