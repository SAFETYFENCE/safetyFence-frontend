import Global from '@/constants/Global';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Trash2,
  User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { geofenceService } from '../services/geofenceService';
import { userService } from '../services/userService';
import type { MyPageData } from '../types/api';
import { storage } from '../utils/storage';

// 타입 정의
interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const MyPage: React.FC = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<MyPageData | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isGeofenceListExpanded, setIsGeofenceListExpanded] = useState<boolean>(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 보호자 모드: 선택된 이용자의 데이터 조회
      const isSupporter = Global.USER_ROLE === 'supporter';
      const targetNumber = isSupporter && Global.TARGET_NUMBER
        ? Global.TARGET_NUMBER
        : undefined;

      // API 호출: GET /get/myPageData (본인 기본 정보)
      const data = await userService.getMyPageData();

      // 지오펜스만 선택된 이용자 것으로 교체
      if (targetNumber) {
        const targetGeofences = await geofenceService.getList(targetNumber);
        data.geofences = targetGeofences.map(g => ({
          id: g.id,
          name: g.name,
          address: g.address,
          type: g.type,
          startTime: g.startTime,
          endTime: g.endTime,
        }));
        console.log('마이페이지 데이터 로드 성공 (이용자:', targetNumber, ')');
      } else {
        console.log('마이페이지 데이터 로드 성공 (본인)');
      }

      setUserData(data);
    } catch (err: any) {
      console.error('사용자 정보 불러오기 실패:', err);
      const msg = err?.message || '사용자 정보 로드 실패';
      setError(msg);
      Alert.alert('오류', '사용자 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handlePasswordChange = async () => {
    Alert.alert('알림', '추후 추가될 예정입니다.');
    setIsPasswordModalOpen(false);
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return '';
    const normalized = value.replace(' ', 'T');
    const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
    if (isNaN(date.getTime())) {
      return value;
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          onPress: async () => {
            try {
              // AsyncStorage 클리어
              await storage.clearAll();

              // Global 상태 초기화
              Global.NUMBER = "";
              Global.TARGET_NUMBER = "";
              Global.USER_ROLE = "";

              navigation.navigate('index' as never);
              console.log('로그아웃 성공');
            } catch (error) {
              console.error('로그아웃 실패:', error);
              Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleGeofenceDelete = (geofenceId: number, geofenceName: string) => {
    Alert.alert(
      '영역 삭제',
      `'${geofenceName}' 영역을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // 보호자인 경우 TARGET_NUMBER 전달
              const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                ? Global.TARGET_NUMBER
                : undefined;

              await geofenceService.delete({ id: geofenceId }, targetNumber);
              Alert.alert('성공', '선택한 영역이 삭제되었습니다.');
              fetchUserData(); // 데이터 새로고침
            } catch (error) {
              console.error('영역 삭제 실패:', error);
              Alert.alert('오류', '영역 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View className="rounded-full px-2 py-1 bg-blue-50">
      <Text className="text-xs text-blue-600 font-medium">{children}</Text>
    </View>
  );

  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ""
  }) => (
    <View className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {children}
    </View>
  );

  const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View className="p-3 border-b border-gray-100">{children}</View>
  );

  const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View className="p-4">{children}</View>
  );

  const Button: React.FC<{
    onPress: () => void;
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
    disabled?: boolean;
  }> = ({ onPress, children, variant = 'default', className = "", disabled = false }) => {
    const baseClass = "rounded-md px-4 py-2 flex-row items-center justify-center";
    const variantClass = {
      default: "bg-blue-600",
      outline: "border border-gray-300 bg-white",
      ghost: "bg-transparent",
    }[variant];

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        className={`${baseClass} ${variantClass} ${className} ${disabled ? 'opacity-50' : ''}`}
      >
        {children}
      </TouchableOpacity>
    );
  };

  const ProfileItem: React.FC<{ label: string; value: string | React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <View className="flex-row items-center py-2">
      <View className="w-8 items-center justify-center">
        {icon}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs font-medium text-gray-500 mb-0.5">{label}</Text>
        {typeof value === 'string' ? (
          <Text className="text-base font-semibold text-gray-800">{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="mt-3 text-gray-500">사용자 정보를 불러오는 중입니다...</Text>
      </SafeAreaView>
    );
  }

  if (error && !userData) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-base text-red-600 mb-3">오류: {error}</Text>
        <TouchableOpacity
          onPress={fetchUserData}
          className="bg-green-600 px-6 py-3 rounded-2xl"
        >
          <Text className="text-white font-bold">다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-3 bg-gray-100 px-6 py-3 rounded-2xl"
        >
          <Text className="text-gray-600">이전 화면으로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-500">사용자 정보를 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white pt-safe">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 헤더 */}
        <View className="bg-green-500 px-6 pt-8 pb-10 rounded-b-[40px] shadow-sm mb-6">
          <View className="flex-row items-center justify-center mb-6">
            <Text className="text-2xl font-bold text-white">마이페이지</Text>
          </View>

          <View className="flex-row items-center bg-white/10 p-4 rounded-3xl backdrop-blur-sm">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center mr-4">
              <User size={32} color="#22c55e" />
            </View>
            <View>
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl font-bold text-white mr-2">{userData.name}</Text>
                <View className="bg-white/20 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-white font-medium">
                    {Global.USER_ROLE === 'supporter' ? '보호자' : '이용자'}
                  </Text>
                </View>
              </View>
              <Text className="text-green-100 text-sm">
                {Global.USER_ROLE === 'supporter' ? '이용자를 안전하게 보호하고 있습니다' : '안전한 하루 되세요!'}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          {/* 프로필 정보 카드 */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-5">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2">
                <User size={16} color="#16a34a" />
              </View>
              <Text className="text-lg font-bold text-gray-900">기본 정보</Text>
            </View>

            <View className="space-y-4">
              <ProfileItem label="생년월일" value={userData.birth} icon={<Text className="text-lg">🎂</Text>} />
              <ProfileItem label="우편번호" value={userData.homeAddress} icon={<MapPin size={18} color="#9ca3af" />} />
              {Global.USER_ROLE === 'user' && (
                <>
                  <ProfileItem label="센터 우편번호" value={userData.centerAddress} icon={<Text className="text-lg">🏥</Text>} />
                  <ProfileItem label="링크 코드" value={userData.linkCode} icon={<Text className="text-lg">🔗</Text>} />
                </>
              )}
            </View>
          </View>

          {/* 등록된 영역 리스트 */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2">
                  <MapPin size={16} color="#16a34a" />
                </View>
                <Text className="text-lg font-bold text-gray-900">
                  {Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                    ? `${Global.TARGET_RELATION || Global.TARGET_NUMBER}의 영역`
                    : '등록된 영역'}
                </Text>
              </View>
              <View className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-bold text-green-700">{userData.geofences?.length || 0}개</Text>
              </View>
            </View>

            {userData.geofences && userData.geofences.length > 0 ? (
              <>
                <View>
                  {(isGeofenceListExpanded
                    ? userData.geofences
                    : userData.geofences.slice(0, 2)
                  ).map((geofence) => (
                    <View
                      key={geofence.id}
                      className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2"
                    >
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-2">
                          <Text className="font-bold text-gray-900 text-base mb-1">{geofence.name}</Text>
                          <Text className="text-xs text-gray-500">{geofence.address}</Text>
                        </View>
                        <View
                          className={`px-2 py-1 rounded-full ${geofence.type === 0 ? "bg-green-100" : "bg-orange-100"}`}
                        >
                          <Text className={`text-[10px] font-bold ${geofence.type === 0 ? "text-green-700" : "text-orange-700"}`}>
                            {geofence.type === 0 ? "영구" : "일시"}
                          </Text>
                        </View>
                      </View>

                      {geofence.type === 1 && geofence.startTime && geofence.endTime && (
                        <View className="bg-white p-2 rounded-lg mt-2">
                          <Text className="text-xs text-gray-500">
                            🕒 {formatDateTime(geofence.startTime)} ~ {formatDateTime(geofence.endTime)}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => handleGeofenceDelete(geofence.id, geofence.name)}
                        className="absolute bottom-4 right-4 bg-white p-1.5 rounded-full shadow-sm border border-gray-100"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {userData.geofences.length > 2 && (
                  <TouchableOpacity
                    onPress={() => setIsGeofenceListExpanded(!isGeofenceListExpanded)}
                    className="flex-row items-center justify-center py-3 mt-2"
                  >
                    <Text className="text-sm font-medium text-green-600 mr-1">
                      {isGeofenceListExpanded ? "접기" : "더보기"}
                    </Text>
                    {isGeofenceListExpanded ? (
                      <ChevronUp size={16} color="#16a34a" />
                    ) : (
                      <ChevronDown size={16} color="#16a34a" />
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View className="py-8 items-center justify-center bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200">
                <Text className="text-gray-400 text-sm">등록된 영역이 없습니다</Text>
              </View>
            )}
          </View>

          {/* 계정 설정 */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2">
                <Settings size={16} color="#16a34a" />
              </View>
              <Text className="text-lg font-bold text-gray-900">설정</Text>
            </View>

            <View className="space-y-1">
              <TouchableOpacity
                onPress={() => Alert.alert('알림', '추후 추가될 예정입니다.')}
                className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
              >
                <View className="flex-row items-center">
                  <View className="w-8 items-center"><Shield size={18} color="#4b5563" /></View>
                  <Text className="font-medium text-gray-700">비밀번호 변경</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('PrivacyPolicyPage' as never)}
                className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
              >
                <View className="flex-row items-center">
                  <View className="w-8 items-center"><User size={18} color="#4b5563" /></View>
                  <Text className="font-medium text-gray-700">개인정보 처리방침</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </TouchableOpacity>

              <View className="h-px bg-gray-100 my-2" />

              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center py-3 px-2 active:bg-red-50 rounded-xl"
              >
                <View className="w-8 items-center"><LogOut size={18} color="#ef4444" /></View>
                <Text className="font-medium text-red-500">로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="items-center pb-8">
            <Text className="text-xs text-gray-300">SafetyFence v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation currentScreen="MyPage" />

      {/* 비밀번호 변경 모달 */}
      <Modal
        visible={isPasswordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-white rounded-3xl p-6">
            <Text className="text-xl font-bold mb-6 text-center">비밀번호 변경</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">현재 비밀번호</Text>
                <TextInput
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  secureTextEntry
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5"
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </View>

              <View>
                <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">새 비밀번호</Text>
                <TextInput
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  secureTextEntry
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5"
                  placeholder="새 비밀번호를 입력하세요"
                />
              </View>

              <View>
                <Text className="text-sm font-bold text-gray-600 mb-2 ml-1">새 비밀번호 확인</Text>
                <TextInput
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  secureTextEntry
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5"
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </View>

              <View className="flex-row space-x-3 mt-4">
                <TouchableOpacity
                  onPress={() => setIsPasswordModalOpen(false)}
                  className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-gray-600 font-bold">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePasswordChange}
                  className="flex-1 bg-green-500 py-4 rounded-2xl items-center"
                >
                  <Text className="text-white font-bold">변경하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};
//
export default MyPage;
