import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Activity,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pill,
  Plus,
  ScrollText,
  Search,
  User as UserIcon
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
import BatchSuccessModal from '../components/link/BatchSuccessModal';
import { calendarService } from '../services/calendarService';
import { geofenceService } from '../services/geofenceService';
import { linkService } from '../services/linkService';
import { medicationService } from '../services/medicationService';
import { notifyMedicationAdded, notifyEventAdded } from '../services/notificationService';

interface UserItem {
  id: number;
  userNumber: string;
  relation: string;
  batteryLevel: number | null;
  batteryLastUpdate: number | null;
}

const UsersScreen: React.FC = () => {
  const router = useRouter();
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

  // Medicine Batch State (Preserved from original logic)
  const [batchMedicineName, setBatchMedicineName] = useState('');
  const [batchMedicineDosage, setBatchMedicineDosage] = useState('');
  const [batchMedicinePurpose, setBatchMedicinePurpose] = useState('');
  const [batchMedicineFrequency, setBatchMedicineFrequency] = useState('');

  // Batch Input Tab State
  const [activeBatchTab, setActiveBatchTab] = useState<'schedule' | 'medicine' | 'location'>('schedule');

  // Location Batch State
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [batchGeofenceData, setBatchGeofenceData] = useState<GeofenceData | null>(null);

  // Success Modal State
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    type: 'schedule' | 'medicine' | 'location';
    itemName: string;
    totalCount: number;
    successCount: number;
    failCount: number;
  }>({
    type: 'schedule',
    itemName: '',
    totalCount: 0,
    successCount: 0,
    failCount: 0,
  });

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
    router.push('/MapPage');
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

  // Logic Preserved from Original LinkPage.tsx
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

            // 알림 전송
            await notifyEventAdded(userNumber, batchEventTitle, batchEventDate, batchEventTime);
          } else if (activeBatchTab === 'medicine') {
            // Use medicationService as per original logic
            await medicationService.create({
              name: batchMedicineName,
              dosage: batchMedicineDosage || '정보 없음',
              purpose: batchMedicinePurpose || '정보 없음',
              frequency: batchMedicineFrequency || '정보 없음',
            }, userNumber);

            // 알림 전송
            await notifyMedicationAdded(userNumber, batchMedicineName);
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

      // 아이템 이름 추출
      let itemName = '';
      if (activeBatchTab === 'schedule') {
        itemName = batchEventTitle;
      } else if (activeBatchTab === 'medicine') {
        itemName = batchMedicineName;
      } else if (activeBatchTab === 'location' && batchGeofenceData) {
        itemName = batchGeofenceData.name;
      }

      // 성공 모달 데이터 설정
      setSuccessModalData({
        type: activeBatchTab,
        itemName,
        totalCount: selectedUsers.length,
        successCount,
        failCount,
      });

      // 모달 표시
      setIsSuccessModalVisible(true);

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
        className={`rounded-[24px] mb-5 shadow-sm p-5 border ${isSelected
          ? 'bg-green-50 border-green-400'
          : 'bg-white border-gray-100' // Increased visual separation
          }`}
        style={{
          elevation: isSelected ? 4 : 2, // Slightly more elevation for consistency
          shadowColor: isSelected ? '#16a34a' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.15 : 0.05,
          shadowRadius: 8
        }}
        onPress={() => {
          if (isSelectionMode) {
            handleSelectUser(user.userNumber);
          } else {
            handleUserClick(user.userNumber);
          }
        }}
        activeOpacity={0.9}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {/* Avatar Area */}
            <View className={`h-16 w-16 rounded-3xl items-center justify-center mr-4 shadow-sm ${isSelected ? 'bg-green-500' : 'bg-gray-50'
              }`}>
              {isSelected ? (
                <UserIcon size={30} color="white" strokeWidth={2.5} />
              ) : (
                <UserIcon size={28} color="#9ca3af" />
              )}
            </View>

            <View className="flex-1">
              <View className="flex-row items-center mb-1.5 gap-2">
                <Text className={`text-xl font-extrabold ${isSelected ? 'text-green-800' : 'text-gray-900'}`}>
                  {user.relation}
                </Text>
                {/* Selection Checkbox (Visual Only in Card, actual logic handled by touchable) */}
                {isSelectionMode && (
                  <View>
                    {isChecked ? (
                      <CheckCircle2 size={20} color="#16a34a" fill="#dcfce7" />
                    ) : (
                      <Circle size={20} color="#d1d5db" />
                    )}
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-2">
                {/* Battery Badge */}
                <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-gray-100'
                  }`}>
                  <Ionicons
                    name={
                      user.batteryLevel === null ? "battery-dead" :
                      user.batteryLevel >= 80 ? "battery-full" :
                      user.batteryLevel >= 50 ? "battery-half" :
                      user.batteryLevel >= 20 ? "battery-half" :
                      "battery-dead"
                    }
                    size={12}
                    color={
                      user.batteryLevel === null ? "#9ca3af" :
                      user.batteryLevel >= 20 ? (isSelected ? "#15803d" : "#6b7280") : "#ef4444"
                    }
                  />
                  <Text className={`text-xs font-bold ml-1 ${
                    user.batteryLevel === null ? 'text-gray-400' :
                    user.batteryLevel >= 20 ? (isSelected ? 'text-green-700' : 'text-gray-600') : 'text-red-600'
                  }`}>
                    {user.batteryLevel !== null ? `${user.batteryLevel}%` : 'N/A'}
                  </Text>
                </View>
                <Text className="text-xs text-gray-400 font-medium tracking-wide">
                  {user.userNumber}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button (Menu) */}
          {!isSelectionMode && (
            <TouchableOpacity
              className="p-2 -mr-2 bg-gray-50 rounded-full"
              onPress={() => setShowDropdown(showDropdown === user.userNumber ? null : user.userNumber)}
            >
              <MoreHorizontal size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Status Indicator (Bottom Bar) */}
        {isSelected && !isSelectionMode && (
          <View className="mt-4 pt-3 border-t border-green-200 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-green-700 ">
              실시간 위치 확인 중(연결중)
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#15803d" />
          </View>
        )}

        {/* Dropdown Menu */}
        {!isSelectionMode && showDropdown === user.userNumber && (
          <View className="absolute right-4 top-14 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden w-28">
            <TouchableOpacity
              className="px-4 py-3 bg-red-50 active:bg-red-100"
              onPress={() => handleRemoveUser(user.userNumber)}
            >
              <Text className="text-red-600 font-bold text-center">삭제하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="items-center justify-center py-20 px-8">
      <View className="h-24 w-24 bg-green-50 rounded-full items-center justify-center mb-6 shadow-sm">
        <UserIcon size={40} color="#22c55e" strokeWidth={1.5} />
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-2">등록된 이용자가 없어요</Text>
      <Text className="text-gray-500 text-center leading-6 mb-8">
        가족이나 지인을 등록하고{'\n'}실시간 위치와 일정을 관리해보세요.
      </Text>
      <TouchableOpacity
        className="bg-gray-900 w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-95 transition-transform"
        onPress={() => setIsAddUserDialogOpen(true)}
      >
        <Plus size={20} color="white" />
        <Text className="text-white font-bold text-lg ml-2">첫 이용자 추가하기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA] pt-safe">
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header Area */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-end justify-between mb-6">
          <View>
            <Text className="text-gray-500 font-bold text-base mb-0.5">SafetyFence</Text>
            <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">이용자 관리</Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={toggleSelectionMode}
              className={`w-10 h-10 rounded-full items-center justify-center border ${isSelectionMode ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'
                }`}
            >
              <CheckCircle2 size={20} color={isSelectionMode ? 'white' : '#4b5563'} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center bg-green-500 shadow-md shadow-green-200"
              onPress={() => setIsAddUserDialogOpen(true)}
            >
              <Plus size={24} color="white" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm mb-4">
          <Search size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-900 font-medium h-full"
            placeholder="이름 또는 번호 검색"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {getTabUsers().length > 0 ? (
          <View>
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-gray-500 font-bold">등록된 이용자 ({getTabUsers().length})</Text>
              {isSelectionMode && (
                <Text className="text-green-600 font-bold text-sm">
                  {selectedUsers.length}명 선택됨
                </Text>
              )}
            </View>
            {getTabUsers().map(renderUserCard)}
          </View>
        ) : (
          !isLoading && renderEmptyState()
        )}
      </ScrollView>

      {/* 일괄 등록 Floating Action Bar */}
      {isSelectionMode && selectedUsers.length > 0 && (
        <View className="absolute bottom-24 left-5 right-5 z-50">
          <View className="bg-gray-900 rounded-[24px] p-5 shadow-2xl shadow-gray-400 flex-row justify-between items-center">
            <View>
              <Text className="text-white font-bold text-lg">
                {selectedUsers.length}명에게
              </Text>
              <Text className="text-gray-400 text-sm font-medium">일괄 작업 수행</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                setBatchEventDate(dateStr);
                setBatchEventTime('09:00');
                setIsBatchModalOpen(true);
              }}
              className="bg-white px-6 py-3 rounded-xl flex-row items-center active:scale-95"
            >
              <Text className="text-gray-900 font-extrabold text-base">작업 시작</Text>
              <Ionicons name="arrow-forward" size={18} color="#111827" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <BottomNavigation currentScreen="LinkPage" />

      {/* 일괄 등록 모달 */}
      <Modal visible={isBatchModalOpen} transparent animationType="fade" onRequestClose={() => setIsBatchModalOpen(false)}>
        <View className="flex-1 bg-black/60 justify-center px-4">
          <View className="bg-white rounded-[32px] p-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-extrabold text-gray-900">
                  일괄 등록
                </Text>
                <Text className="text-green-600 font-bold mt-1">
                  선택된 {selectedUsers.length}명의 이용자에게 적용됩니다
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBatchModalOpen(false)} className="bg-gray-100 p-2.5 rounded-full">
                <Ionicons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* 탭 선택 */}
            <View className="flex-row bg-gray-100 p-1.5 rounded-2xl mb-8">
              {['schedule', 'medicine', 'location'].map((tab) => {
                const isActive = activeBatchTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveBatchTab(tab as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: 14,
                      backgroundColor: isActive ? 'white' : 'transparent',
                      shadowColor: isActive ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.05 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 1 : 0,
                    }}
                  >
                    <Text style={{
                      fontWeight: isActive ? '800' : '600',
                      fontSize: 15,
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
              {(activeBatchTab === 'schedule') && (
                <>
                  <View className="mb-6">
                    <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">
                      일정 내용
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <CalendarIcon size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-bold"
                        placeholder="예: 정기 검진, 병원 방문"
                        placeholderTextColor="#9ca3af"
                        value={batchEventTitle}
                        onChangeText={setBatchEventTitle}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">날짜</Text>
                      <TouchableOpacity
                        className="items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl h-14"
                        onPress={() => setShowBatchDatePicker(true)}
                      >
                        <Text className={`text-base font-bold ${batchEventDate ? 'text-gray-900' : 'text-gray-400'}`}>
                          {batchEventDate || "날짜 선택"}
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
                      <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">시간</Text>
                      <TouchableOpacity
                        className="items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl h-14"
                        onPress={() => setShowBatchTimePicker(true)}
                      >
                        <Text className={`text-base font-bold ${batchEventTime ? 'text-gray-900' : 'text-gray-400'}`}>
                          {batchEventTime || "시간 선택"}
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

              {/* 약 입력 폼 (Styled with new Design) */}
              {activeBatchTab === 'medicine' && (
                <>
                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">약 이름 *</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <Pill size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-bold"
                        placeholder="예: 혈압약, 당뇨약"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicineName}
                        onChangeText={setBatchMedicineName}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">용량 (선택)</Text>
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
                    <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">복용 목적 (선택)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <Activity size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="예: 혈압 조절"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicinePurpose}
                        onChangeText={setBatchMedicinePurpose}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">복용 빈도 (선택)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                      <ScrollText size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="예: 하루 2회"
                        placeholderTextColor="#9ca3af"
                        value={batchMedicineFrequency}
                        onChangeText={setBatchMedicineFrequency}
                      />
                    </View>
                  </View>
                </>
              )}


              {/* 위치(지오펜스) 입력 폼 */}
              {activeBatchTab === 'location' && (
                <View>
                  <View className={`border border-gray-200 rounded-2xl p-5 mb-4 ${batchGeofenceData ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                    {batchGeofenceData ? (
                      <View>
                        <View className="flex-row items-center mb-2">
                          <View className={`px-2.5 py-1 rounded-lg mr-2 ${batchGeofenceData.type === 'permanent' ? 'bg-green-200' : 'bg-orange-200'}`}>
                            <Text className={`text-xs font-bold ${batchGeofenceData.type === 'permanent' ? 'text-green-800' : 'text-orange-800'}`}>
                              {batchGeofenceData.type === 'permanent' ? '영구' : '일시적'}
                            </Text>
                          </View>
                          <Text className="font-bold text-lg text-gray-900">{batchGeofenceData.name}</Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="location" size={14} color="#4b5563" />
                          <Text className="text-gray-600 ml-1 font-medium">{batchGeofenceData.address}</Text>
                        </View>

                        {batchGeofenceData.type === 'temporary' && batchGeofenceData.startTime && batchGeofenceData.endTime && (
                          <View className="mt-3 pt-3 border-t border-green-200 flex-row items-center">
                            <Ionicons name="time" size={14} color="#15803d" />
                            <Text className="text-xs text-green-700 font-bold ml-1">
                              {batchGeofenceData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ~ {batchGeofenceData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="items-center py-6">
                        <Text className="text-gray-400 font-bold text-base">설정된 위치 정보가 없습니다</Text>
                        <Text className="text-gray-300 text-xs mt-1">아래 버튼을 눌러 위치를 설정해주세요</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setIsBatchModalOpen(false);
                      setTimeout(() => setIsGeofenceModalOpen(true), 300);
                    }}
                    className="w-full py-4 bg-white rounded-2xl items-center border-2 border-dashed border-gray-300 active:bg-gray-50"
                  >
                    <Text className="font-bold text-gray-500">
                      {batchGeofenceData ? '위치 정보 수정하기' : '+ 위치 정보 설정하기'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="flex-row mt-10 gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                onPress={() => setIsBatchModalOpen(false)}
              >
                <Text className="font-bold text-gray-500 text-lg">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center shadow-lg shadow-green-200 ${isBatchLoading ? 'bg-green-400' : 'bg-green-600'}`}
                onPress={handleBatchSubmit}
                disabled={isBatchLoading}
              >
                <Text className="font-bold text-white text-lg">{isBatchLoading ? '등록 중...' : '등록 완료'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal >

      <GeofenceModal
        visible={isGeofenceModalOpen}
        onClose={() => {
          setIsGeofenceModalOpen(false);
          setTimeout(() => setIsBatchModalOpen(true), 300);
        }}
        onSave={(data) => {
          setBatchGeofenceData(data);
        }}
      />

      <Modal visible={isAddUserDialogOpen} transparent animationType="slide" onRequestClose={() => setIsAddUserDialogOpen(false)}>
        <View className="flex-1 bg-black/60 justify-center px-4">
          <View className="bg-white rounded-[32px] p-8">
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-green-50 rounded-full items-center justify-center mb-4">
                <UserIcon size={32} color="#22c55e" strokeWidth={2} />
              </View>
              <Text className="text-2xl font-extrabold text-gray-900">새 이용자 추가</Text>
              <Text className="text-gray-500 font-medium mt-1">이용자 앱에서 확인된 코드를 입력하세요</Text>
            </View>

            <View>
              <View className="mb-5">
                <Text className="text-base font-bold text-gray-600 mb-1.5 ml-1">이용자 코드</Text>
                <TextInput
                  className="border border-gray-200 bg-gray-50 rounded-2xl px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.2em] text-gray-900 focus:border-green-500 focus:bg-white"
                  placeholder="000000"
                  placeholderTextColor="#d1d5db"
                  value={newUserCode}
                  onChangeText={(text) => {
                    const value = text.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
                    setNewUserCode(value);
                    setError('');
                  }}
                  keyboardType="default"
                  maxLength={6}
                />
              </View>

              <View className="mb-5">
                <Text className="text-base font-bold text-gray-600 mb-1.5 ml-1">이름</Text>
                <TextInput
                  className="border border-gray-200 bg-gray-50 rounded-2xl px-4 py-4 text-lg font-medium text-gray-900 focus:border-green-500 focus:bg-white"
                  placeholder="예: 홍길동, 어머니"
                  placeholderTextColor="#9ca3af"
                  value={newUserRelationship}
                  onChangeText={setNewUserRelationship}
                />
              </View>

              {error ? <Text className="text-sm text-red-500 font-medium text-center mb-4">{error}</Text> : null}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-100 rounded-2xl py-4 items-center"
                  onPress={() => setIsAddUserDialogOpen(false)}
                >
                  <Text className="font-bold text-gray-500 text-lg">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-2xl py-4 items-center shadow-lg ${newUserCode.length === 6 && !isLoading ? 'bg-green-600 shadow-green-200' : 'bg-gray-300 shadow-none'}`}
                  onPress={handleAddUser}
                  disabled={newUserCode.length !== 6 || isLoading}
                >
                  <Text className="font-bold text-white text-lg">{isLoading ? '연결 중...' : '연결하기'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Batch Success Modal */}
      <BatchSuccessModal
        visible={isSuccessModalVisible}
        type={successModalData.type}
        itemName={successModalData.itemName}
        totalCount={successModalData.totalCount}
        successCount={successModalData.successCount}
        failCount={successModalData.failCount}
        onConfirm={() => {
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
          setIsSuccessModalVisible(false);
        }}
      />
    </SafeAreaView >
  );
};

export default UsersScreen;
