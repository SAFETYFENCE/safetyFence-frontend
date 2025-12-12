import Global from '@/constants/Global';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, CheckSquare, Clock, Image as ImageIcon, MapPin, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import TodoModal from '../components/TodoModal';
import { calendarService } from '../services/calendarService';
import { GalleryPhoto, galleryService } from '../services/galleryService';

// --- 타입 정의 ---
type RootStackParamList = {
  MapPage: undefined;
  LinkPage: undefined;
  LogPage: undefined;
  CalendarPage: undefined;
};
type NavigationProp = StackNavigationProp<RootStackParamList, 'CalendarPage'>;

interface Schedule {
  id: number; // geofenceId
  name: string;
  address: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'permanent' | 'temporary';
}

interface Todo {
  id: number; // userEventId
  title: string;
  time: Date;
  description?: string;
  image?: string;
  date: string;
  type: 'todo';
}

interface Log {
  id: number; // logId
  location: string;
  address: string;
  arriveTime: string;
  date: string;
  type: 'log';
}

type CalendarItem =
  | (Schedule & { itemType: 'schedule' })
  | (Todo & { itemType: 'todo' })
  | (Log & { itemType: 'log' })
  | (GalleryPhoto & { itemType: 'photo' });

// --- 상수 ---
// 로컬 시간 기준으로 오늘 날짜 생성
const today = new Date();
const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

// --- 캘린더 날짜 유틸리티 ---
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // 해당 월의 총 일수
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // 1일의 요일을 직접 계산
  const firstDayOfMonth = new Date(year, month, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay();

  const days: (number | null)[] = [];

  // 1일 이전 빈 칸 채우기
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // 실제 날짜 채우기
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // 마지막 주를 7의 배수로 맞추기
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

// --- 분리된 일정 카드 컴포넌트 ---
const ScheduleCard: React.FC<{ schedule: Schedule }> = React.memo(({ schedule }) => (
  <View className="bg-white rounded-xl shadow p-4 mb-3 border border-gray-100">
    <View className="flex-row items-start">
      <View className="h-11 w-11 bg-green-50 rounded-lg items-center justify-center mr-3">
        <MapPin size={20} color="#25eb5aff" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 mb-1">{schedule.name}</Text>
        <View className="flex-row items-center mb-2">
          <Clock size={13} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-1.5">
            {schedule.startTime} - {schedule.endTime}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mb-3">{schedule.address}</Text>
        <View className={`self-start px-2.5 py-1 rounded-full 
          ${schedule.type === 'permanent' ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <Text className={`text-xs font-semibold 
            ${schedule.type === 'permanent' ? 'text-green-700' : 'text-yellow-700'}`}>
            {schedule.type === 'permanent' ? '영구 영역' : '일시적 일정'}
          </Text>
        </View>
      </View>
    </View>
  </View>
));

// --- 분리된 할 일 카드 컴포넌트 ---
const TodoCard: React.FC<{ todo: Todo; onDelete: (id: number) => void }> = React.memo(({ todo, onDelete }) => (
  <View className="bg-white rounded-xl shadow p-4 mb-3 border border-gray-100">
    <View className="flex-row items-start">
      <View className="h-11 w-11 bg-purple-50 rounded-lg items-center justify-center mr-3">
        <CheckSquare size={20} color="#8B5CF6" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 mb-1">{todo.title}</Text>
        <View className="flex-row items-center mb-2">
          <Clock size={13} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-1.5">
            {todo.time.getHours().toString().padStart(2, '0')}:{todo.time.getMinutes().toString().padStart(2, '0')}
          </Text>
        </View>
        {todo.description && (
          <Text className="text-sm text-gray-500 mb-3">{todo.description}</Text>
        )}
        {todo.image && (
          <Image source={{ uri: todo.image }} className="w-full h-40 rounded-lg my-2" />
        )}
        <View className="self-start px-2.5 py-1 rounded-full bg-purple-100">
          <Text className="text-xs font-semibold text-purple-700">
            할 일
          </Text>
        </View>
      </View>
      <TouchableOpacity
        className="p-2"
        onPress={() => onDelete(todo.id)}
      >
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  </View>
));

// --- 분리된 로그 카드 컴포넌트 ---
const LogCard: React.FC<{ log: Log }> = React.memo(({ log }) => (
  <View className="bg-white rounded-xl shadow p-4 mb-3 border border-gray-100">
    <View className="flex-row items-start">
      <View className="h-11 w-11 bg-blue-50 rounded-lg items-center justify-center mr-3">
        <MapPin size={20} color="#3B82F6" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 mb-1">{log.location}</Text>
        <View className="flex-row items-center mb-2">
          <Clock size={13} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-1.5">
            {log.arriveTime}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mb-3">{log.address}</Text>
        <View className="self-start px-2.5 py-1 rounded-full bg-blue-100">
          <Text className="text-xs font-semibold text-blue-700">
            과거 로그
          </Text>
        </View>
      </View>
    </View>
  </View>
));

// --- 분리된 갤러리 사진 카드 컴포넌트 ---
const PhotoCard: React.FC<{ photo: GalleryPhoto }> = React.memo(({ photo }) => (
  <View className="bg-white rounded-xl shadow p-4 mb-3 border border-gray-100">
    <View className="flex-row items-start">
      <View className="h-11 w-11 bg-orange-50 rounded-lg items-center justify-center mr-3">
        <ImageIcon size={20} color="#F97316" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 mb-1">{photo.title || '갤러리 사진'}</Text>
        <Image source={{ uri: photo.uri }} className="w-full h-48 rounded-lg my-2" resizeMode="cover" />
        {photo.description && (
          <Text className="text-sm text-gray-500 mb-2">{photo.description}</Text>
        )}
        <View className="self-start px-2.5 py-1 rounded-full bg-orange-100">
          <Text className="text-xs font-semibold text-orange-700">
            갤러리
          </Text>
        </View>
      </View>
    </View>
  </View>
));

// --- 메인 캘린더 페이지 컴포넌트 ---
const CalendarPage: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [isTodoModalVisible, setIsTodoModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 캘린더 데이터 로드
  const loadCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. 서버 데이터 조회
      const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
        ? Global.TARGET_NUMBER
        : undefined;

      const calendarData = await calendarService.getUserData(targetNumber);

      const allSchedules: Schedule[] = [];
      const allTodos: Todo[] = [];
      const allLogs: Log[] = [];

      calendarData.forEach((dayData) => {
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

        dayData.geofences.forEach((fence) => {
          const start = new Date(fence.startTime);
          const end = new Date(fence.endTime);

          allSchedules.push({
            id: fence.geofenceId,
            name: fence.name,
            address: fence.address,
            startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
            endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
            date: dayData.date,
            type: 'temporary',
          });
        });

        dayData.userEvents.forEach((event) => {
          const [hours, minutes] = event.eventStartTime.split(':').map(Number);
          const time = new Date();
          time.setHours(hours);
          time.setMinutes(minutes);
          time.setSeconds(0);

          allTodos.push({
            id: event.userEventId,
            title: event.event,
            time,
            date: dayData.date,
            type: 'todo',
          });
        });
      });

      setSchedules(allSchedules);
      setTodos(allTodos);
      setLogs(allLogs);

      // 2. 로컬 갤러리 데이터 조회 (보호자 모드일 때는 로컬 사진은 안 보임 - 본인 기기 저장소이므로)
      // 만약 보호자도 사진을 봐야 한다면 서버를 통해야 함. 현재는 로컬 저장소 방식이므로 본인 것만 조회.
      if (Global.USER_ROLE === 'user') {
        const galleryData = await galleryService.getPhotos();
        setPhotos(galleryData);
      } else {
        setPhotos([]); // 보호자는 로컬 사진 접근 불가 (추후 서버 연동 필요)
      }

    } catch (error) {
      console.error('캘린더 데이터 로드 실패:', error);
      Alert.alert('오류', '캘린더 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [loadCalendarData])
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    // 모든 아이템 병합
    const allItems: any[] = [...logs, ...schedules, ...todos, ...photos];

    allItems.forEach(item => {
      const date = item.date;
      const items = map.get(date) || [];

      let typedItem: CalendarItem;
      if ('location' in item) typedItem = { ...item, itemType: 'log' };
      else if ('startTime' in item) typedItem = { ...item, itemType: 'schedule' };
      else if ('time' in item) typedItem = { ...item, itemType: 'todo' };
      else typedItem = { ...item, itemType: 'photo' };

      map.set(date, [...items, typedItem]);
    });
    return map;
  }, [logs, schedules, todos, photos]);

  const sortedSelectedDateItems = useMemo(() => {
    const items = itemsByDate.get(selectedDate) || [];
    return [...items].sort((a, b) => {
      // 정렬 우선순위: 시간 순 (사진은 시간이 없으므로 마지막이나 생성시간 기준)
      const getTime = (item: CalendarItem) => {
        if (item.itemType === 'log') return item.arriveTime;
        if (item.itemType === 'schedule') return item.startTime;
        if (item.itemType === 'todo') return item.time.getHours().toString().padStart(2, '0') + ':' + item.time.getMinutes().toString().padStart(2, '0');
        return '23:59'; // 사진은 시간 정보가 없으면 뒤로 보냄
      };
      return getTime(a).localeCompare(getTime(b));
    });
  }, [itemsByDate, selectedDate]);

  const hasItemsOnDate = useMemo(() => {
    const datesWithItems = new Set(itemsByDate.keys());
    return (day: number): boolean => {
      const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      return datesWithItems.has(dateStr);
    };
  }, [itemsByDate, currentMonth]);

  const daysInMonth = getDaysInMonth(currentMonth);

  const handleTodoSave = async (data: { title: string; time: Date; description?: string }) => {
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
      loadCalendarData();
      Alert.alert('성공', '할 일이 추가되었습니다.');
    } catch (error) {
      console.error('할 일 추가 실패:', error);
      Alert.alert('오류', '할 일 추가에 실패했습니다.');
    }
  };

  const handleTodoDelete = async (eventId: number) => {
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
          } catch (error) {
            console.error('할 일 삭제 실패:', error);
            Alert.alert('오류', '할 일 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CalendarItem }) => {
    if (item.itemType === 'log') {
      return <LogCard key={`log-${item.id}`} log={item} />;
    } else if (item.itemType === 'schedule') {
      return <ScheduleCard key={`schedule-${item.id}`} schedule={item} />;
    } else if (item.itemType === 'photo') {
      return <PhotoCard key={`photo-${item.id}`} photo={item} />;
    } else {
      return <TodoCard key={`todo-${item.id}`} todo={item} onDelete={handleTodoDelete} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 pt-safe">
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* 헤더 */}
        <View className="px-5 pt-5 pb-4">
          <Text className="text-3xl font-bold text-gray-900">
            {Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
              ? `${(Global.TARGET_RELATION || Global.TARGET_NUMBER)}의 캘린더`
              : '캘린더'}
          </Text>
        </View>

        {/* 캘린더 카드 */}
        <View className="bg-white rounded-xl shadow-md p-4 mx-4 mb-6">
          {/* 월 네비게이션 */}
          <View className="flex-row items-center justify-between mb-4 px-2">
            <TouchableOpacity
              onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 rounded-full active:bg-gray-100">
              <Text className="text-xl font-bold text-gray-500">‹</Text>
            </TouchableOpacity>

            <Text className="text-lg font-semibold text-gray-900">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </Text>

            <TouchableOpacity
              onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 rounded-full active:bg-gray-100">
              <Text className="text-xl font-bold text-gray-500">›</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View className="flex-row mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <View key={day} className="flex-1 items-center py-2">
                <Text className="text-sm font-medium text-gray-400">{day}</Text>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View>
            {Array.from({ length: Math.ceil(daysInMonth.length / 7) }, (_, weekIndex) => {
              const weekStart = weekIndex * 7;
              const weekDays = daysInMonth.slice(weekStart, weekStart + 7);

              return (
                <View key={weekIndex} style={{ flexDirection: 'row' }}>
                  {weekDays.map((day, dayIndex) => {
                    const index = weekStart + dayIndex;
                    const dateStr = day ? `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` : '';
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayDateStr;
                    const hasItems = day ? hasItemsOnDate(day) : false;

                    return (
                      <View
                        key={index}
                        style={{
                          flex: 1,
                          aspectRatio: 1,
                          padding: 4,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {day ? (
                          <TouchableOpacity
                            onPress={() => setSelectedDate(dateStr)}
                            activeOpacity={0.8}
                            style={{
                              width: '92%',
                              height: '92%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 999,
                              backgroundColor: isSelected ? '#25eb67ff' : isToday ? '#DBEAFE' : 'transparent',
                            }}
                          >
                            <Text style={{
                              fontSize: 13,
                              color: isSelected ? '#ffffff' : isToday ? '#2563eb' : hasItems ? '#374151' : '#9CA3AF',
                              fontWeight: isSelected || isToday || hasItems ? '600' as any : '400' as any,
                            }}>
                              {day}
                            </Text>
                            {!isSelected && !isToday && hasItems && (
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb', marginTop: 4 }} />
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: '92%', height: '92%' }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-xl font-bold text-gray-900">
              {formatDate(selectedDate)}
            </Text>
            <TouchableOpacity
              className="flex-row items-center bg-green-500 px-3.5 py-2 rounded-lg shadow-sm"
              onPress={() => setIsTodoModalVisible(true)}
            >
              <Plus size={18} color="white" />
              <Text className="text-white text-sm font-semibold ml-1">할 일 추가</Text>
            </TouchableOpacity>
          </View>

          {sortedSelectedDateItems.length > 0 ? (
            sortedSelectedDateItems.map(item => renderItem({ item }))
          ) : (
            <View className="items-center justify-center pt-16">
              <Calendar size={48} color="#cbd5e1" />
              <Text className="text-gray-500 text-lg mt-4">등록된 일정이 없습니다</Text>
              <Text className="text-gray-400 text-sm mt-1">버튼을 눌러 새 할 일을 추가해 보세요</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <BottomNavigation currentScreen="CalendarPage" />

      <TodoModal
        visible={isTodoModalVisible}
        onClose={() => setIsTodoModalVisible(false)}
        onSave={handleTodoSave}
        selectedDate={selectedDate}
      />
    </SafeAreaView>
  );
};

// --- 헬퍼 함수 ---
const formatDate = (dateStr: string) => {
  if (!dateStr) return "날짜 선택";
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
};

export default CalendarPage;
