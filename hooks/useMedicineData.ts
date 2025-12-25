import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { calendarService } from '../services/calendarService';
import { linkService } from '../services/linkService';
import { CalendarEventItem, LinkItem } from '../types/api';

export interface UserMedicineData {
    user: LinkItem;
    medicines: CalendarEventItem[];
    loading: boolean;
    error: boolean;
}

export const useMedicineData = () => {
    const [userMedicineList, setUserMedicineList] = useState<UserMedicineData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const users = await linkService.getList();

            if (users.length === 0) {
                setUserMedicineList([]);
                setLoading(false);
                return;
            }

            const targetDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

            const promises = users.map(async (user) => {
                try {
                    const calendarData = await calendarService.getUserData(user.userNumber);
                    const dayData = calendarData.find(day => day.date === targetDateStr);

                    const medicines = dayData?.userEvents.filter(event =>
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

            setUserMedicineList(finalResults);
        } catch (error) {
            console.error('데이터 불러오기 실패:', error);
            Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate]);

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
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekDay = days[date.getDay()];
        return { month, day, weekDay };
    };

    return {
        userMedicineList,
        loading,
        refreshing,
        selectedDate,
        setSelectedDate,
        showDatePicker,
        setShowDatePicker,
        onRefresh,
        formatDate
    };
};
