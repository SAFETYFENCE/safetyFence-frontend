
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import Global from '../constants/Global';
import { calendarService } from '../services/calendarService';
import { GalleryPhoto, galleryService } from '../services/galleryService';
import { geofenceService } from '../services/geofenceService';
import { GeofenceItem } from '../types/api';
import { CalendarItem, Log, MedicineLog, Schedule, Todo } from '../types/calendar';
import { storage } from '../utils/storage';

export const useCalendarData = (todayDateStr: string) => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [permanentGeofences, setPermanentGeofences] = useState<GeofenceItem[]>([]);
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

            // 영구 지오펜스 분리 및 설정 (별도 State로 관리하여 모든 날짜에 표시)
            const perms = geofenceList.filter(g => g.type === 0);
            setPermanentGeofences(perms);

            const allSchedules: Schedule[] = [];
            const allTodos: Todo[] = [];
            const allLogs: Log[] = [];
            const allMedicineLogs: MedicineLog[] = [];

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
                                    id: fence.geofenceId,
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

                            if (event.event.startsWith('[약]')) {
                                // 약 복용 기록으로 처리
                                const medicineName = event.event.replace('[약]', '').trim();
                                allMedicineLogs.push({
                                    id: event.userEventId,
                                    medicineName: medicineName,
                                    time: time,
                                    taken: false, // 서버 이벤트는 복용 여부를 알 수 없으므로 기본값
                                    date: dayData.date,
                                    type: 'medicine'
                                } as any);
                            } else {
                                // 일반 할 일로 처리
                                allTodos.push({
                                    id: event.userEventId,
                                    title: event.event,
                                    time,
                                    date: dayData.date,
                                    type: 'todo',
                                });
                            }
                        });
                    }
                });
            }

            setSchedules(allSchedules);
            setTodos(allTodos);
            setLogs(allLogs);

            // 2. 로컬 갤러리 데이터 조회
            if (Global.USER_ROLE === 'user') {
                const galleryData = await galleryService.getPhotos();
                setPhotos(galleryData);
            } else {
                setPhotos([]);
            }

            // 3. 약 복용 기록 로드
            const localMediLogs = await storage.getMedicineLogs();
            setMedicineLogs([...allMedicineLogs, ...localMediLogs]);

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
        const allItems: any[] = [...logs, ...schedules, ...todos, ...photos, ...medicineLogs];

        allItems.forEach(item => {
            const date = item.date;
            const items = map.get(date) || [];

            let typedItem: CalendarItem;
            if ('location' in item) typedItem = { ...item, itemType: 'log' };
            else if ('startTime' in item) typedItem = { ...item, itemType: 'schedule' };
            else if ('time' in item && 'medicineName' in item) typedItem = { ...item, itemType: 'medicine' };
            else if ('time' in item) typedItem = { ...item, itemType: 'todo' };
            else typedItem = { ...item, itemType: 'photo' };

            map.set(date, [...items, typedItem]);
        });
        return map;
    }, [logs, schedules, todos, photos, medicineLogs]);

    const hasItemsOnDate = useMemo(() => {
        const datesWithItems = new Set(itemsByDate.keys());
        return (currentMonth: Date, day: number): boolean => {
            const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            return datesWithItems.has(dateStr);
        };
    }, [itemsByDate]);

    const getSortedItemsForDate = useCallback((dateStr: string) => {
        const items = itemsByDate.get(dateStr) || [];

        // 영구 지오펜스 추가 (모든 날짜에 표시)
        const permanentItems: CalendarItem[] = permanentGeofences.map(fence => ({
            id: fence.id,
            location: fence.name + ' (상시)',
            address: fence.address,
            arriveTime: '00:00', // 상시 표시를 위한 기본값
            date: dateStr,
            type: 'log',
            itemType: 'log'
        }));

        return [...items, ...permanentItems].sort((a, b) => {
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
    }, [itemsByDate, permanentGeofences]);

    return {
        isLoading,
        loadCalendarData,
        schedules,
        todos,
        logs,
        medicineLogs,
        photos,
        handleTodoSave,
        handleTodoDelete,
        itemsByDate,
        hasItemsOnDate,
        getSortedItemsForDate
    };
};
