
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import Global from '../constants/Global';
import { calendarService } from '../services/calendarService';
import { geofenceService } from '../services/geofenceService';
import { medicationService } from '../services/medicationService';
import { GeofenceItem } from '../types/api';
import { CalendarItem, Log, MedicineLog, Schedule, Todo } from '../types/calendar';

export const useCalendarData = (todayDateStr: string) => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 캘린더 데이터 로드
    const loadCalendarData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. 서버 데이터 조회
            const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                ? Global.TARGET_NUMBER
                : undefined;

            // 캘린더 데이터와 지오펜스 목록 동시 조회
            const [calendarData, geofenceList] = await Promise.all([
                calendarService.getUserData(targetNumber),
                geofenceService.getList(targetNumber)
            ]);

            console.log('UseCalendarData - Fetched Data:', JSON.stringify(calendarData, null, 2));

            const allSchedules: Schedule[] = [];
            const allTodos: Todo[] = [];
            const allLogs: Log[] = [];

            if (calendarData) {
                calendarData.forEach((dayData) => {
                    if (dayData.logs) {
                        dayData.logs.forEach((log) => {
                            allLogs.push({
                                id: log.logId,
                                location: log.location,
                                address: log.locationAddress,
                                arriveTime: log.arriveTime,
                                date: dayData.date,
                                type: 'log',
                            });
                        });
                    }

                    if (dayData.geofences) {
                        dayData.geofences.forEach((fence) => {
                            // 일시적 지오펜스만 여기서 처리 (영구 지오펜스는 별도 처리)
                            if (fence.type === 1 && fence.startTime) {
                                const start = new Date(fence.startTime);
                                let arriveTimeStr = '00:00';
                                if (!isNaN(start.getTime())) {
                                    arriveTimeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
                                }

                                allLogs.push({
                                    id: `temp-${fence.geofenceId}` as any,
                                    location: fence.name + ' (일시적)',
                                    address: fence.address,
                                    arriveTime: arriveTimeStr,
                                    date: dayData.date,
                                    type: 'log',
                                });
                            }
                        });
                    }

                    if (dayData.userEvents) {
                        dayData.userEvents.forEach((event) => {
                            const [hours, minutes] = event.eventStartTime.split(':').map(Number);
                            const time = new Date();
                            time.setHours(hours);
                            time.setMinutes(minutes);
                            time.setSeconds(0);

                            // 모든 이벤트를 할 일로 처리 (약은 백엔드 medication API 사용)
                            allTodos.push({
                                id: event.userEventId,
                                title: event.event,
                                time,
                                date: dayData.date,
                                type: 'todo',
                            });
                        });
                    }
                });
            }

            setSchedules(allSchedules);
            setTodos(allTodos);
            setLogs(allLogs);

            // 3. 약 복용 기록 로드 (백엔드 API)
            const medicationHistoryLogs: MedicineLog[] = [];
            try {
                let medications: any[] = [];

                // 보호자가 피보호자의 캘린더를 볼 때
                if (Global.USER_ROLE === 'supporter' && targetNumber) {
                    // 보호자용 API로 피보호자들의 약 조회
                    const wards = await medicationService.getWardsToday();
                    // TARGET_NUMBER와 일치하는 피보호자의 약만 필터링
                    const targetWard = wards.find(ward => ward.wardNumber === targetNumber);
                    medications = targetWard ? targetWard.medications : [];
                } else {
                    // 이용자 본인의 약 조회
                    const medicationsResponse = await medicationService.getList();
                    medications = medicationsResponse.medications;
                }

                // 각 약의 복용 이력 조회 (병렬 처리)
                const historyPromises = medications.map(async (medication) => {
                    try {
                        const historyResponse = await medicationService.getHistory(medication.id);
                        return historyResponse.history.map((historyItem) => {
                            const checkedTime = new Date(historyItem.checkedDateTime);
                            const dateStr = `${checkedTime.getFullYear()}-${(checkedTime.getMonth() + 1).toString().padStart(2, '0')}-${checkedTime.getDate().toString().padStart(2, '0')}`;

                            return {
                                id: historyItem.logId,
                                medicineName: medication.name,
                                time: checkedTime,
                                taken: true,
                                date: dateStr,
                                type: 'medicine'
                            } as MedicineLog;
                        });
                    } catch (error) {
                        console.error(`약 ${medication.name} 이력 조회 실패:`, error);
                        return [];
                    }
                });

                const allHistories = await Promise.all(historyPromises);
                allHistories.forEach(histories => {
                    medicationHistoryLogs.push(...histories);
                });
            } catch (error) {
                console.error('약 복용 이력 로드 실패:', error);
            }

            // 백엔드 API의 약 복용 이력만 사용
            setMedicineLogs(medicationHistoryLogs);

        } catch (error) {
            console.error('캘린더 데이터 로드 실패:', error);
            Alert.alert('오류', '캘린더 데이터를 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 할 일 저장
    const handleTodoSave = async (selectedDate: string, data: { title: string; time: Date; description?: string }) => {
        try {
            const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                ? Global.TARGET_NUMBER
                : undefined;

            await calendarService.addEvent({
                event: data.title,
                eventDate: selectedDate,
                startTime: `${data.time.getHours().toString().padStart(2, '0')}:${data.time.getMinutes().toString().padStart(2, '0')}`,
            }, targetNumber);

            // 데이터 새로고침
            await loadCalendarData();
            Alert.alert('성공', '할 일이 추가되었습니다.');
        } catch (error) {
            console.error('할 일 추가 실패:', error);
            Alert.alert('오류', '할 일 추가에 실패했습니다.');
        }
    };

    // 할 일 삭제
    const handleTodoDelete = async (eventId: number) => {
        return new Promise<void>((resolve) => {
            Alert.alert('할 일 삭제', '이 할 일을 삭제하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                                ? Global.TARGET_NUMBER
                                : undefined;

                            await calendarService.deleteEvent(eventId, targetNumber);
                            setTodos(prev => prev.filter(todo => todo.id !== eventId));
                            Alert.alert('성공', '할 일이 삭제되었습니다.');
                            resolve();
                        } catch (error) {
                            console.error('할 일 삭제 실패:', error);
                            Alert.alert('오류', '할 일 삭제에 실패했습니다.');
                        }
                    },
                },
            ]);
        });
    };

    const itemsByDate = useMemo(() => {
        const map = new Map<string, CalendarItem[]>();

        // 모든 아이템 병합
        const allItems: any[] = [...logs, ...schedules, ...todos, ...medicineLogs];

        allItems.forEach(item => {
            const date = item.date;
            const items = map.get(date) || [];

            let typedItem: CalendarItem;
            if ('location' in item) typedItem = { ...item, itemType: 'log' };
            else if ('startTime' in item) typedItem = { ...item, itemType: 'schedule' };
            else if ('time' in item && 'medicineName' in item) typedItem = { ...item, itemType: 'medicine' };
            else if ('time' in item) typedItem = { ...item, itemType: 'todo' };
            else typedItem = { ...item, itemType: 'medicine' };

            map.set(date, [...items, typedItem]);
        });
        return map;
    }, [logs, schedules, todos, medicineLogs]);

    const hasItemsOnDate = useMemo(() => {
        const datesWithItems = new Set(itemsByDate.keys());
        return (currentMonth: Date, day: number): boolean => {
            const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            return datesWithItems.has(dateStr);
        };
    }, [itemsByDate]);

    const getSortedItemsForDate = useCallback((dateStr: string) => {
        const items = itemsByDate.get(dateStr) || [];

        // 영구 지오펜스는 로그에 표시하지 않음 (실제 방문 기록과 일시적 지오펜스만 표시)
        // 영구 지오펜스가 필요하면 마이페이지에서 관리

        return items.sort((a, b) => {
            // 정렬 우선순위: 시간 순
            const getTime = (item: CalendarItem) => {
                if (item.itemType === 'log') return item.arriveTime;
                if (item.itemType === 'schedule') return item.startTime;
                if (item.itemType === 'medicine') return item.time.getHours().toString().padStart(2, '0') + ':' + item.time.getMinutes().toString().padStart(2, '0');
                if (item.itemType === 'todo') return item.time.getHours().toString().padStart(2, '0') + ':' + item.time.getMinutes().toString().padStart(2, '0');
                return '23:59';
            };
            return getTime(a).localeCompare(getTime(b));
        });
    }, [itemsByDate]);

    return {
        isLoading,
        loadCalendarData,
        schedules,
        todos,
        logs,
        medicineLogs,

        handleTodoSave,
        handleTodoDelete,
        itemsByDate,
        hasItemsOnDate,
        getSortedItemsForDate
    };
};
