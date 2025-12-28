import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  Calendar as CalendarIcon, CheckSquare,
  MoreVertical,
  Plus,
  Search,
  Square,
  User as UserIcon
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import CustomDatePicker from '../components/common/CustomDatePicker';
import GeofenceModal, { GeofenceData } from '../components/GeofenceModal';
import { calendarService } from '../services/calendarService';
import { geofenceService } from '../services/geofenceService';
import { linkService } from '../services/linkService';
import { medicationService } from '../services/medicationService';

interface UserItem {
  id: number;
  userNumber: string;
  relation: string;
}

type RootStackParamList = {
  MapPage: undefined;
  LinkPage: undefined;
  LogPage: undefined;
  MyPage: undefined;
};

const UsersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { setSupporterTarget } = useLocation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserRelationship, setNewUserRelationship] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [selectedUserNumber, setSelectedUserNumber] = useState<string | null>(Global.TARGET_NUMBER || null);

  // Batch Add Feature States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchEventTitle, setBatchEventTitle] = useState('');
  const [batchEventDate, setBatchEventDate] = useState('');
  const [batchEventTime, setBatchEventTime] = useState('');
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [showBatchDatePicker, setShowBatchDatePicker] = useState(false);
  const [showBatchTimePicker, setShowBatchTimePicker] = useState(false);

  // Batch Input Tab State
  const [activeBatchTab, setActiveBatchTab] = useState<'schedule' | 'medicine' | 'location'>('schedule');

  // Medicine Batch State
  const [batchMedicineName, setBatchMedicineName] = useState('');
  const [batchMedicineDosage, setBatchMedicineDosage] = useState('');
  const [batchMedicinePurpose, setBatchMedicinePurpose] = useState('');
  const [batchMedicineFrequency, setBatchMedicineFrequency] = useState('');

  // Location Batch State
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [batchGeofenceData, setBatchGeofenceData] = useState<GeofenceData | null>(null);

  const syncSelectedUserState = useCallback((list: UserItem[]) => {
    if (Global.TARGET_NUMBER) {
      const matched = list.find((user) => user.userNumber === Global.TARGET_NUMBER);
      if (matched) {
        Global.TARGET_RELATION = matched.relation || '';
        setSelectedUserNumber(matched.userNumber);
        return;
      }
      setSelectedUserNumber(null);
      Global.TARGET_RELATION = '';
      return;
    }

    Global.TARGET_RELATION = '';
    setSelectedUserNumber(null);
  }, []);

  const handleAddUser = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 코드 검증
      if (!newUserCode || newUserCode.length < 6) {
        setError('6자리 이상의 코드를 입력해주세요.');
        return;
      }
      if (!newUserRelationship.trim()) {
        setError('관계를 입력해주세요.');
        return;
      }

      // API 호출: POST /link/addUser
      await linkService.addUser({
        linkCode: newUserCode,
        relation: newUserRelationship,
      });

      // 목록 새로고침: GET /link/list
      const updatedUsers = await linkService.getList();
      setUsers(updatedUsers);
      syncSelectedUserState(updatedUsers);

      // 모달 닫기 및 초기화
      setIsAddUserDialogOpen(false);
      setNewUserCode('');
      setNewUserRelationship('');

      Alert.alert('성공', '이용자가 추가되었습니다.');
    } catch (err: any) {
      const message = err.response?.data?.message;
      setError(message || '이용자 추가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // API 호출: GET /link/list
        const data = await linkService.getList();
        setUsers(data);
        syncSelectedUserState(data);
      } catch (err) {
        console.error('이용자 목록 불러오기 실패:', err);
        Alert.alert('오류', '이용자 목록을 불러오는 데 실패했습니다.');
      }
    };
    fetchUsers();
  }, [syncSelectedUserState]);
  useFocusEffect(
    useCallback(() => {
      syncSelectedUserState(users);
    }, [syncSelectedUserState, users])
  );

  const handleUserClick = (userNumber: string) => {
    const selectedUser = users.find((user) => user.userNumber === userNumber);
    Global.TARGET_RELATION = selectedUser?.relation || '';
    Global.TARGET_NUMBER = userNumber;
    setSelectedUserNumber(userNumber);
    setSupporterTarget(userNumber);
    navigation.navigate('MapPage');
  };

  const handleRemoveUser = (userNumber: string) => {
    Alert.alert('이용자 삭제', '정말로 이 이용자를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            // API 호출: DELETE /link/deleteUser
            await linkService.deleteUser({ number: userNumber });

            // 선택된 유저 목록에서도 제거
            if (selectedUsers.includes(userNumber)) {
              setSelectedUsers(prev => prev.filter(id => id !== userNumber));
            }

            // 목록 새로고침: GET /link/list
            const updatedUsers = await linkService.getList();
            setUsers(updatedUsers);
            syncSelectedUserState(updatedUsers);

            Alert.alert('성공', '이용자가 삭제되었습니다.');
          } catch (error: any) {
            Alert.alert('오류', error.response?.data?.message || '이용자 삭제 중 문제가 발생했습니다.');
          } finally {
            setShowDropdown(null);
          }
        },
      },
    ]);
  };

  const getTabUsers = () => {
    if (!searchQuery) return users;
    return users.filter(user =>
      user.relation?.includes(searchQuery) ||
      user.userNumber?.includes(searchQuery)
    );
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedUsers([]);
  };

  const handleSelectUser = (userNumber: string) => {
    if (selectedUsers.includes(userNumber)) {
      setSelectedUsers(prev => prev.filter(id => id !== userNumber));
    } else {
      setSelectedUsers(prev => [...prev, userNumber]);
    }
  };

  const handleBatchSubmit = async () => {
    // Validation
    if (activeBatchTab === 'schedule') {
      if (!batchEventTitle || !batchEventDate || !batchEventTime) {
        Alert.alert('알림', '모든 필드를 입력해주세요.');
        return;
      }
    } else if (activeBatchTab === 'medicine') {
      if (!batchMedicineName) {
        Alert.alert('알림', '약 이름을 입력해주세요.');
        return;
      }
    } else if (activeBatchTab === 'location') {
      if (!batchGeofenceData) {
        Alert.alert('알림', '위치 정보를 설정해주세요.');
        return;
      }
    }

    setIsBatchLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const userNumber of selectedUsers) {
        try {
          if (activeBatchTab === 'schedule') {
            await calendarService.addEvent({
              event: batchEventTitle,
              eventDate: batchEventDate,
              startTime: batchEventTime
            }, userNumber);
          } else if (activeBatchTab === 'medicine') {
            await medicationService.create({
              name: batchMedicineName,
              dosage: batchMedicineDosage || '정보 없음',
              purpose: batchMedicinePurpose || '정보 없음',
              frequency: batchMedicineFrequency || '정보 없음',
            }, userNumber);
          } else if (activeBatchTab === 'location' && batchGeofenceData) {
            const formatTime = (date?: Date) => {
              if (!date) return null;
              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            };

            await geofenceService.create({
              name: batchGeofenceData.name,
              address: batchGeofenceData.address,
              type: batchGeofenceData.type === 'permanent' ? 0 : 1, // 0: 영구, 1: 일시
              startTime: formatTime(batchGeofenceData.startTime),
              endTime: formatTime(batchGeofenceData.endTime),
              latitude: batchGeofenceData.latitude,
              longitude: batchGeofenceData.longitude,
            }, userNumber);
          }
          successCount++;
        } catch (e) {
          console.error(`이용자(${userNumber}) 등록 실패:`, e);
          failCount++;
        }
      }

      Alert.alert(
        '완료',
        `총 ${selectedUsers.length}명 중\n성공: ${successCount}명\n실패: ${failCount}명`,
        [{
          text: '확인', onPress: () => {
            setIsBatchModalOpen(false);
            // Reset Fields
            setBatchEventTitle('');
            setBatchEventDate('');
            setBatchEventTime('');
            setBatchMedicineName('');
            setBatchMedicineDosage('');
            setBatchMedicinePurpose('');
            setBatchMedicineFrequency('');
            setBatchGeofenceData(null);

            setIsSelectionMode(false);
            setSelectedUsers([]);
            setShowBatchDatePicker(false);
            setShowBatchTimePicker(false);
          }
        }]
      );

    } catch (error) {
      console.error('일괄 등록 중 오류:', error);
      Alert.alert('오류', '일괄 등록 중 문제가 발생했습니다.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchDateChange = (event: any, selectedDate?: Date) => {
    setShowBatchDatePicker(false);
    if (selectedDate) {
      const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
      setBatchEventDate(dateStr);
    }
  };

  const handleBatchTimeChange = (event: any, selectedTime?: Date) => {
    setShowBatchTimePicker(false);
    if (selectedTime) {
      const timeStr = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      setBatchEventTime(timeStr);
    }
  };

  const renderUserCard = (user: UserItem) => {
    const isSelected = selectedUserNumber === user.userNumber;
    const isChecked = selectedUsers.includes(user.userNumber);

    return (
      <TouchableOpacity
        key={user.userNumber}
        className={`rounded-2xl mb-4 shadow-sm border px-5 py-5 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'
          }`}
        onPress={() => {
          if (isSelectionMode) {
            handleSelectUser(user.userNumber);
          } else {
            handleUserClick(user.userNumber);
          }
        }}
        activeOpacity={0.9}
      >
        <View className="flex-row items-center justify-between mb-2">
          {/* 체크박스 (선택 모드일 때만 표시) */}
          {isSelectionMode && (
            <View className="mr-3">
              {isChecked ? (
                <CheckSquare size={24} color="#16a34a" />
              ) : (
                <Square size={24} color="#d1d5db" />
              )}
            </View>
          )}

          <View className="flex-row items-center flex-1">
            <View className={`h-14 w-14 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-green-200' : 'bg-green-100'}`}>
              <UserIcon size={26} color="#22c55e" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="font-bold text-gray-900 text-lg mr-2">{user.relation}</Text>
                {/* 배터리 표시 (Low Battery Warning) */}
                <View className="flex-row items-center bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                  <Ionicons name="battery-dead" size={14} color="#dc2626" />
                  <Text className="text-xs font-bold text-red-700 ml-1">12%</Text>
                </View>
              </View>
              <Text className="text-sm text-gray-500 font-medium">{user.userNumber}</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            {isSelected && !isSelectionMode && (
              <View className="bg-green-100 px-3 py-1 rounded-full mr-2">
                <Text className="text-xs font-semibold text-green-700">현재 선택됨</Text>
              </View>
            )}
            {!isSelectionMode && (
              <TouchableOpacity className="p-2" onPress={() => setShowDropdown(showDropdown === user.userNumber ? null : user.userNumber)}>
                <MoreVertical size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 드롭다운 메뉴 (선택 모드가 아닐 때만) */}
        {!isSelectionMode && showDropdown === user.userNumber && (
          <View className="absolute right-4 top-20 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <TouchableOpacity className="px-4 py-3" onPress={() => handleRemoveUser(user.userNumber)}>
              <Text className="text-red-600">삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="items-center py-12">
      <View className="h-16 w-16 bg-gray-100 rounded-full items-center justify-center mb-4">
        <UserIcon size={32} color="#9ca3af" />
      </View>
      <Text className="text-lg font-medium text-gray-900">이용자가 없습니다</Text>
      <Text className="text-gray-500 mt-1 text-center">이용자 코드를 입력하여 이용자를 추가하세요</Text>
      <TouchableOpacity className="bg-green-500 rounded-lg px-4 py-2 flex-row items-center mt-4" onPress={() => setIsAddUserDialogOpen(true)}>
        <Plus size={16} color="white" />
        <Text className="text-white font-medium ml-2">이용자 추가</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 pt-safe">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowDropdown(null)}>
        <ScrollView className="flex-1 px-4">
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-2xl font-bold text-gray-900">이용자 관리</Text>

            <View className="flex-row space-x-2">
              {/* 선택 모드 토글 버튼 */}
              <TouchableOpacity
                onPress={toggleSelectionMode}
                className={`px-3 py-2 rounded-lg border flex-row items-center mr-2 ${isSelectionMode ? 'bg-gray-800 border-gray-800' : 'bg-white border-gray-300'}`}
              >
                <CheckSquare size={16} color={isSelectionMode ? 'white' : '#4b5563'} />
                <Text className={`text-sm font-bold ml-1.5 ${isSelectionMode ? 'text-white' : 'text-gray-600'}`}>
                  {isSelectionMode ? '취소' : '선택'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-500 rounded-lg px-3 py-2 flex-row items-center shadow-sm"
                onPress={() => setIsAddUserDialogOpen(true)}
              >
                <Plus size={16} color="white" />
                <Text className="text-white font-bold ml-1">추가</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="relative mb-6">
            <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
              <Search size={16} color="#9ca3af" />
            </View>
            <TextInput className="bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-3" placeholder="이용자 검색..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          {getTabUsers().length > 0 ? (
            <View>{getTabUsers().map(renderUserCard)}</View>
          ) : (
            renderEmptyState()
          )}
          <View className="h-20" />
        </ScrollView>
      </TouchableOpacity>

      {/* 일괄 등록 플로팅 액션 바 */}
      {isSelectionMode && selectedUsers.length > 0 && (
        <View className="absolute bottom-24 left-4 right-4 bg-gray-900 rounded-2xl p-4 shadow-xl flex-row justify-between items-center z-50">
          <Text className="text-white font-bold text-lg ml-2">
            {selectedUsers.length}명 선택됨
          </Text>
          <TouchableOpacity
            onPress={() => {
              // 오늘 날짜 기본값 설정
              const today = new Date();
              const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
              setBatchEventDate(dateStr);
              setBatchEventTime('09:00');
              setIsBatchModalOpen(true);
            }}
            className="bg-green-500 px-5 py-2.5 rounded-xl flex-row items-center"
          >
            <CalendarIcon size={20} color="white" />
            <Text className="text-white font-bold ml-2">동시 추가</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomNavigation currentScreen="LinkPage" />

      {/* 일괄 등록 모달 */}
      <Modal visible={isBatchModalOpen} transparent animationType="fade" onRequestClose={() => setIsBatchModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/60 justify-center px-5">
            <View className="bg-white rounded-3xl p-6 shadow-2xl" style={{ maxHeight: '80%' }}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  동시 추가
                </Text>
                <Text className="text-sm text-green-600 font-bold mt-1">
                  선택된 {selectedUsers.length}명의 이용자에게 등록합니다
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBatchModalOpen(false)} className="bg-gray-100 p-2 rounded-full">
                <Text className="text-gray-500 font-bold">X</Text>
              </TouchableOpacity>
            </View>

            {/* 탭 선택 */}
            <View className="flex-row bg-gray-100 p-1 rounded-xl mb-6">
              {['schedule', 'medicine', 'location'].map((tab) => {
                const isActive = activeBatchTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveBatchTab(tab as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 8,
                      backgroundColor: isActive ? 'white' : 'transparent',
                      shadowColor: isActive ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isActive ? 0.05 : 0,
                      shadowRadius: 1,
                      elevation: isActive ? 1 : 0,
                    }}
                  >
                    <Text style={{
                      fontWeight: 'bold',
                      color: isActive ? '#111827' : '#9ca3af'
                    }}>
                      {tab === 'schedule' ? '일정' : tab === 'medicine' ? '약' : '위치'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="space-y-5">
              {/* 일정 입력 폼 */}
              {activeBatchTab === 'schedule' && (
                <>
                  <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">일정 내용</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <CalendarIcon size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="예: 정기 검진, 병원 방문"
                        placeholderTextColor="#9ca3af"
                        value={batchEventTitle}
                        onChangeText={setBatchEventTitle}
                      />
                    </View>
                  </View>

                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">날짜</Text>
                      <TouchableOpacity
                        className="items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl h-14"
                        onPress={() => setShowBatchDatePicker(true)}
                      >
                        <Text className={`text-base font-bold ${batchEventDate ? 'text-gray-900' : 'text-gray-400'}`}>
                          {batchEventDate || "YYYY-MM-DD"}
                        </Text>
                      </TouchableOpacity>
                      {showBatchDatePicker && (
                        <CustomDatePicker
                          visible={true}
                          value={batchEventDate ? new Date(batchEventDate) : new Date()}
                          mode="date"
                          onChange={handleBatchDateChange}
                          onClose={() => setShowBatchDatePicker(false)}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">시간</Text>
                      <TouchableOpacity
                        className="items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl h-14"
                        onPress={() => setShowBatchTimePicker(true)}
                      >
                        <Text className={`text-base font-bold ${batchEventTime ? 'text-gray-900' : 'text-gray-400'}`}>
                          {batchEventTime || "HH:mm"}
                        </Text>
                      </TouchableOpacity>
                      {showBatchTimePicker && (
                        <CustomDatePicker
                          visible={true}
                          value={(() => {
                            if (batchEventTime) {
                              const [h, m] = batchEventTime.split(':').map(Number);
                              const d = new Date();
                              d.setHours(h);
                              d.setMinutes(m);
                              return d;
                            }
                            const d = new Date();
                            d.setHours(9, 0, 0, 0);
                            return d;
                          })()}
                          mode="time"
                          onChange={handleBatchTimeChange}
                          onClose={() => setShowBatchTimePicker(false)}
                        />
                      )}
                    </View>
                  </View>
                </>
              )}

              {/* 약 입력 폼 */}
              {activeBatchTab === 'medicine' && (
                <>
                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">약 이름 *</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <CalendarIcon size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="예: 혈압약, 당뇨약"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicineName}
                        onChangeText={setBatchMedicineName}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">용량 (선택)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <TextInput
                        className="flex-1 text-base text-gray-900 font-medium"
                        placeholder="예: 100mg, 1정"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicineDosage}
                        onChangeText={setBatchMedicineDosage}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">복용 목적 (선택)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <TextInput
                        className="flex-1 text-base text-gray-900 font-medium"
                        placeholder="예: 혈압 조절, 혈당 관리"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicinePurpose}
                        onChangeText={setBatchMedicinePurpose}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">복용 빈도 (선택)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <TextInput
                        className="flex-1 text-base text-gray-900 font-medium"
                        placeholder="예: 하루 2회, 아침 저녁 식후"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicineFrequency}
                        onChangeText={setBatchMedicineFrequency}
                      />
                    </View>
                  </View>
                </>
              )}

            </View>


            {/* 위치(지오펜스) 입력 폼 */}
            {activeBatchTab === 'location' && (
              <View>
                <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4">
                  {batchGeofenceData ? (
                    <View>
                      <Text className="font-bold text-lg text-gray-900 mb-1">{batchGeofenceData.name}</Text>
                      <Text className="text-gray-600 mb-2">{batchGeofenceData.address}</Text>
                      <View className="flex-row items-center">
                        <View className={`px-2 py-1 rounded mr-2 ${batchGeofenceData.type === 'permanent' ? 'bg-green-100' : 'bg-orange-100'}`}>
                          <Text className={`text-xs font-bold ${batchGeofenceData.type === 'permanent' ? 'text-green-700' : 'text-orange-700'}`}>
                            {batchGeofenceData.type === 'permanent' ? '영구' : '일시적'}
                          </Text>
                        </View>
                        {batchGeofenceData.type === 'temporary' && batchGeofenceData.startTime && batchGeofenceData.endTime && (
                          <Text className="text-xs text-gray-500">
                            {batchGeofenceData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ~ {batchGeofenceData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View className="items-center py-4">
                      <Text className="text-gray-400 font-medium">설정된 위치 정보가 없습니다.</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsBatchModalOpen(false);
                    setTimeout(() => setIsGeofenceModalOpen(true), 300);
                  }}
                  className="w-full py-4 bg-gray-100 rounded-2xl items-center border border-gray-200 border-dashed"
                >
                  <Text className="font-bold text-gray-600">
                    {batchGeofenceData ? '위치 정보 수정하기' : '위치 정보 설정하기'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}


            <View className="flex-row mt-8 gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                onPress={() => setIsBatchModalOpen(false)}
              >
                <Text className="font-bold text-gray-600 text-lg">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center shadow-md ${isBatchLoading ? 'bg-green-400' : 'bg-green-600'}`}
                onPress={handleBatchSubmit}
                disabled={isBatchLoading}
              >
                <Text className="font-bold text-white text-lg">{isBatchLoading ? '등록 중...' : '등록하기'}</Text>
              </TouchableOpacity>
            </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      <GeofenceModal
        visible={isGeofenceModalOpen}
        onClose={() => {
          setIsGeofenceModalOpen(false);
          setTimeout(() => setIsBatchModalOpen(true), 300);
        }}
        onSave={(data) => {
          setBatchGeofenceData(data);
          // GeofenceModal internal handleSave calls onClose, so the reopening logic in onClose will handle restoring the BatchModal.
          // We just need to update the data here.
        }}
      />

      <Modal visible={isAddUserDialogOpen} transparent animationType="slide" onRequestClose={() => setIsAddUserDialogOpen(false)}>
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-lg p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">새 이용자 추가</Text>
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">이용자 코드 *</Text>
                <TextInput className="border border-gray-300 rounded-lg px-4 py-3 text-center text-xl font-mono tracking-widest" placeholder="6자리 코드 입력" value={newUserCode} onChangeText={(text) => {
                  const value = text.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
                  setNewUserCode(value);
                  setError('');
                }} keyboardType="default" maxLength={6} />
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">관계 (선택)</Text>
                <TextInput className="border border-gray-300 rounded-lg px-4 py-3" placeholder="예: 어머니, 아버지, 할머니" value={newUserRelationship} onChangeText={setNewUserRelationship} />
              </View>
              {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
              <View className="flex-row justify-center mt-6">
                <TouchableOpacity className="bg-gray-200 rounded-lg py-3 w-28" onPress={() => setIsAddUserDialogOpen(false)}>
                  <Text className="text-center font-medium text-gray-700">취소</Text>
                </TouchableOpacity>
                <View className="w-3" />
                <TouchableOpacity className={`rounded-lg py-3 w-28 ${newUserCode.length === 6 && !isLoading ? 'bg-blue-600' : 'bg-gray-300'}`} onPress={handleAddUser} disabled={newUserCode.length !== 6 || isLoading}>
                  <Text className="text-center font-medium text-white">{isLoading ? '연결 중...' : '사용자 추가'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

export default UsersScreen;
