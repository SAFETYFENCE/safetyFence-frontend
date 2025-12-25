import CustomDatePicker from '@/components/common/CustomDatePicker';
import MedicineEmptyState from '@/components/medicine/MedicineEmptyState';
import UserMedicineCard from '@/components/medicine/UserMedicineCard';
import { useMedicineData } from '@/hooks/useMedicineData';
import { CalendarDays } from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';

const MedicinePage: React.FC = () => {
    const {
        userMedicineList,
        loading,
        refreshing,
        selectedDate,
        setSelectedDate,
        showDatePicker,
        setShowDatePicker,
        onRefresh,
        formatDate
    } = useMedicineData();

    // Premium Color Palette - Health & Trust Theme
    const THEME = {
        primary: '#0d9488', // Teal 600
        bg: '#f8fafc', // Slate 50
    };

    const { month, day, weekDay } = formatDate(selectedDate);

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 bg-white pt-safe justify-center items-center">
                <ActivityIndicator size="large" color={THEME.primary} />
                <Text className="text-slate-400 mt-4 font-medium animate-pulse">건강 정보를 불러오는 중...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#f8fafc] pt-safe">
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Custom Dashboard Header */}
            <View className="px-6 pt-2 pb-6">
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-3xl font-extrabold text-slate-900 leading-tight">
                            약 복용일지
                        </Text>
                    </View>
                    <TouchableOpacity
                        className="flex-row items-center bg-teal-50 px-4 py-2 rounded-full border border-teal-100 active:bg-teal-100"
                        onPress={() => setShowDatePicker(true)}
                    >
                        <CalendarDays size={18} color="#0d9488" />
                        <Text className="text-sm font-bold text-teal-700 ml-2">{month}월 {day}일 {weekDay}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date Picker Modal */}
            <CustomDatePicker
                visible={showDatePicker}
                mode="date"
                value={selectedDate}
                onClose={() => setShowDatePicker(false)}
                onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                        setSelectedDate(date);
                    }
                }}
            />

            <View className="flex-1 px-5">
                <FlatList
                    data={userMedicineList}
                    renderItem={({ item }) => <UserMedicineCard item={item} />}
                    keyExtractor={(item) => item.user.userNumber}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} tintColor={THEME.primary} />
                    }
                    ListEmptyComponent={<MedicineEmptyState />}
                />
            </View>

            <BottomNavigation currentScreen="MedicinePage" />
        </SafeAreaView>
    );
};

export default MedicinePage;
