import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { medicationService } from '../services/medicationService';
import type { MedicationItem } from '../types/api';

export interface UserMedicineData {
    user: {
        userNumber: string;
        userName: string;
    };
    medicines: MedicationItem[];
    totalMedications: number;
    checkedMedications: number;
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
            // 날짜를 yyyy-MM-dd 형식으로 변환
            const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

            const wards = await medicationService.getWardsToday(dateStr);

            const userMedicineData: UserMedicineData[] = wards.map(ward => ({
                user: {
                    userNumber: ward.wardNumber,
                    userName: ward.wardName,
                },
                medicines: ward.medications,
                totalMedications: ward.totalMedications,
                checkedMedications: ward.checkedMedications,
                loading: false,
                error: false,
            }));

            setUserMedicineList(userMedicineData);
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
