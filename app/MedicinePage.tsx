import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Clock, Pill, User as UserIcon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    Text,
    View
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { calendarService } from '../services/calendarService';
import { linkService } from '../services/linkService';
import { CalendarEventItem, LinkItem } from '../types/api';

interface UserMedicineData {
    user: LinkItem;
    medicines: CalendarEventItem[];
    loading: boolean;
    error: boolean;
}

const MedicinePage: React.FC = () => {
    const [userMedicineList, setUserMedicineList] = useState<UserMedicineData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 색상 팔레트 - 의료/건강 테마 (Green & Teal & Soft Blue)
    const THEME = {
        primary: '#10b981', // Emerald 500
        primaryLight: '#ecfdf5', // Emerald 50
        secondary: '#3b82f6', // Blue 500
        textDark: '#111827',
        textGray: '#6b7280',
        cardBg: '#ffffff',
    };

    const fetchData = useCallback(async () => {
        try {
            const users = await linkService.getList();

            if (users.length === 0) {
                setUserMedicineList([]);
                setLoading(false);
                return;
            }

            const today = new Date();
            const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

            const promises = users.map(async (user) => {
                try {
                    const calendarData = await calendarService.getUserData(user.userNumber);
                    const todayData = calendarData.find(day => day.date === todayStr);

                    const medicines = todayData?.userEvents.filter(event =>
                        event.event.startsWith('[약]') || event.event.startsWith('[Medicine]')
                    ) || [];

                    // 시간순 정렬 (HH:mm)
                    medicines.sort((a, b) => a.eventStartTime.localeCompare(b.eventStartTime));

                    const processedMedicines = medicines.map(m => ({
                        ...m,
                        displayEvent: m.event.replace(/^\[.*?\]\s*/, '')
                    }));

                    return {
                        user,
                        medicines: processedMedicines,
                        loading: false,
                        error: false
                    };
                } catch (error) {
                    console.error(`Failed to fetch data for user ${user.userNumber}:`, error);
                    return {
                        user,
                        medicines: [],
                        loading: false,
                        error: true
                    };
                }
            });

            const results = await Promise.all(promises);

            const finalResults: UserMedicineData[] = results.map(r => ({
                ...r,
                medicines: r.medicines.map(m => ({ ...m, event: m.displayEvent ? m.displayEvent : m.event }))
            }));

            setUserMedicineList(finalResults as any);
        } catch (error) {
            console.error('데이터 불러오기 실패:', error);
            Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatDate = (date: Date) => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
    };

    const renderMedicineItem = (item: CalendarEventItem, index: number, total: number) => {
        const isLast = index === total - 1;

        return (
            <View key={item.userEventId} className="flex-row">
                {/* 타임라인 라인 및 점 */}
                <View className="items-center mr-4 w-6">
                    <View className="w-0.5 h-full bg-gray-200" style={{ opacity: isLast ? 0 : 1 }} />
                    <View className="absolute top-4 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                </View>

                {/* 컨텐츠 */}
                <View className="flex-1 pb-6">
                    <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm mr-1">
                        <View className="bg-white p-2.5 rounded-xl mr-3 shadow-sm border border-gray-50">
                            <Pill size={20} color={THEME.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-base mb-1">{item.event}</Text>
                            <View className="flex-row items-center">
                                <Clock size={12} color={THEME.textGray} />
                                <Text className="text-gray-500 text-xs ml-1 font-medium">{item.eventStartTime}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderUserCard = ({ item }: { item: UserMedicineData }) => (
        <View className="bg-white rounded-[24px] p-6 mb-6 shadow-md border border-gray-100" style={{ elevation: 4 }}>
            {/* 유저 헤더 */}
            <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                    <View className="w-14 h-14 bg-green-50 rounded-full items-center justify-center border border-green-100 mr-3">
                        <UserIcon size={26} color={THEME.primary} />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">{item.user.relation}</Text>
                        <Text className="text-gray-500 text-sm font-medium">연결된 이용자</Text>
                    </View>
                </View>
                {item.medicines.length > 0 ? (
                    <View className="bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                        <Text className="text-green-700 font-bold text-xs">약 {item.medicines.length}개</Text>
                    </View>
                ) : (
                    <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                        <Text className="text-gray-500 font-bold text-xs">일정 없음</Text>
                    </View>
                )}
            </View>

            <View className="h-px bg-gray-100 mb-6" />

            {/* 약 목록 */}
            {item.error ? (
                <View className="py-6 items-center justify-center bg-red-50 rounded-2xl">
                    <Text className="text-red-500 font-medium">데이터를 불러올 수 없습니다.</Text>
                </View>
            ) : item.medicines.length > 0 ? (
                <View className="pl-1">
                    {item.medicines.map((medicine, index) =>
                        renderMedicineItem(medicine, index, item.medicines.length)
                    )}
                </View>
            ) : (
                <View className="py-8 items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mb-2">
                        <Pill size={24} color="#9ca3af" className="opacity-50" />
                    </View>
                    <Text className="text-gray-400 font-medium text-sm">오늘 예정된 약 복용 일정이 없습니다</Text>
                </View>
            )}
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 bg-white pt-safe justify-center items-center">
                <ActivityIndicator size="large" color={THEME.primary} />
                <Text className="text-gray-500 mt-4 font-medium animate-pulse">복용 정보를 불러오는 중...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50 pt-safe">
            <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

            {/* 메인 헤더 */}
            <View className="px-6 py-4 bg-white border-b border-gray-100 mb-2">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">약 관리</Text>
                    <View className="flex-row items-center bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                        <CalendarDays size={14} color={THEME.primary} />
                        <Text className="text-green-700 font-bold text-xs ml-1.5">
                            {formatDate(new Date())}
                        </Text>
                    </View>
                </View>
                <Text className="text-gray-500 font-medium text-base">
                    어르신들의 오늘 하루 약 복용 일정을 확인하세요
                </Text>
            </View>

            <View className="flex-1 px-5 pt-4">
                <FlatList
                    data={userMedicineList}
                    renderItem={renderUserCard}
                    keyExtractor={(item) => item.user.userNumber}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} tintColor={THEME.primary} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-8">
                            <View className="bg-white p-8 rounded-full mb-6 shadow-lg border border-gray-50 relative">
                                <UserIcon size={64} color="#d1d5db" />
                                <View className="absolute -bottom-1 -right-1 bg-green-500 w-10 h-10 rounded-full items-center justify-center border-4 border-white shadow-sm">
                                    <Text className="text-white font-bold text-lg">+</Text>
                                </View>
                            </View>
                            <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">연결된 이용자가 없어요</Text>
                            <Text className="text-gray-500 text-center leading-7 text-base">
                                하단 '연결' 탭에서 이용자를 추가하시면{'\n'}
                                이 곳에서 약 복용 일정을{'\n'}
                                편리하게 관리하실 수 있습니다.
                            </Text>
                        </View>
                    }
                />
            </View>

            <BottomNavigation currentScreen="MedicinePage" />
        </SafeAreaView>
    );
};

export default MedicinePage;
