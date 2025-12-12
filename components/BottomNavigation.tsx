import Global from '@/constants/Global';
import { emergencyService } from '@/services/emergencyService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Calendar, Image as ImageIcon, MapPin, Siren, User, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavigationProps {
  currentScreen?: string;
}

type BottomTabScreenName = 'MapPage' | 'CalendarPage' | 'MyPage' | 'LinkPage' | 'GalleryPage';

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentScreen }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isSendingEmergency, setIsSendingEmergency] = useState(false);

  const activeColor = '#20e066ff'; // 활성 (녹색)
  const inactiveColor = '#9ba5baff'; // 비활성 (회색)

  useEffect(() => {
    const loadUserRole = async () => {
      if (!Global.USER_ROLE) {
        const storedRole = await AsyncStorage.getItem('userRole');
        if (storedRole === 'user' || storedRole === 'supporter') {
          Global.USER_ROLE = storedRole;
        }
      }
    };
    loadUserRole();
  }, []); // Run once on mount

  const navigateToScreen = (screenName: BottomTabScreenName): void => {
    navigation.navigate(screenName as never); // Use navigation.navigate to preserve screen state
  };

  const getIconColor = (screenName: string) => {
    return currentScreen === screenName ? activeColor : inactiveColor;
  };

  const getTextColor = (screenName: string) => {
    // NativeWind 클래스 반환
    return currentScreen === screenName ? 'text-green-600' : 'text-gray-500';
  };

  const getTextWeight = (screenName: string) => {
    // NativeWind 클래스 반환
    return currentScreen === screenName ? 'font-bold' : 'font-normal';
  };

  const sendEmergencyAlert = useCallback(async () => {
    if (isSendingEmergency) return;

    try {
      setIsSendingEmergency(true);

      if (!Global.NUMBER) {
        Alert.alert('로그인 필요', '로그인 후 긴급 알림을 사용할 수 있습니다.');
        return;
      }

      await emergencyService.sendAlert();

      Alert.alert('전송 완료', '긴급 알림을 전송했습니다.');
    } catch (error) {
      console.error('❌ 긴급 알림 전송 실패:', error);
      Alert.alert('전송 실패', '네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    } finally {
      setIsSendingEmergency(false);
    }
  }, [isSendingEmergency]);

  const handleEmergency = () => {
    if (isSendingEmergency) return;

    Alert.alert(
      '긴급 알림',
      '긴급 알림을 전송하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '전송', style: 'destructive', onPress: () => sendEmergencyAlert() }
      ]
    );
  };

  if (Global.USER_ROLE === 'user') {
    return (
      <View className="absolute left-4 right-4 bg-white/95 border border-green-500/80 p-1 pb-3 rounded-2xl shadow-lg" style={{ bottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row justify-evenly w-full">
          {/* --- 지도 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('MapPage')}
            className="items-center py-2 px-4"
          >
            <MapPin size={26} color={getIconColor('MapPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('MapPage')} ${getTextWeight('MapPage')}`}>
              지도
            </Text>
          </TouchableOpacity>

          {/* --- 캘린더 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('CalendarPage')}
            className="items-center py-2 px-4"
          >
            <Calendar size={26} color={getIconColor('CalendarPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('CalendarPage')} ${getTextWeight('CalendarPage')}`}>
              캘린더
            </Text>
          </TouchableOpacity>

          {/* --- 긴급 알림 (중앙) --- */}
          <View className="items-center -mt-5">
            <TouchableOpacity
              onPress={handleEmergency}
              className="items-center justify-center bg-red-500 w-16 h-16 rounded-full shadow-lg border-4 border-white"
            >
              <Siren size={32} color="white" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'System' }} className="text-sm mt-1 text-red-500 font-bold">
              긴급
            </Text>
          </View>

          {/* --- 갤러리 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('GalleryPage')}
            className="items-center py-2 px-4"
          >
            <ImageIcon size={26} color={getIconColor('GalleryPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('GalleryPage')} ${getTextWeight('GalleryPage')}`}>
              갤러리
            </Text>
          </TouchableOpacity>

          {/* --- 설정 (마이페이지) --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('MyPage')} // 이동할 스크린 이름은 'MyPage' 유지
            className="items-center py-2 px-4"
          >
            <User size={26} color={getIconColor('MyPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('MyPage')} ${getTextWeight('MyPage')}`}>
              설정 {/* <-- "마이페이지"에서 "설정"으로 변경 */}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (Global.USER_ROLE === 'supporter') {
    // 보호자용 네비게이션 (4개 메뉴)
    return (
      <View className="absolute left-4 right-4 bg-white/95 border border-green-500/80 p-1 pb-3 rounded-2xl shadow-lg" style={{ bottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row justify-evenly w-full">
          {/* --- 지도 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('MapPage')}
            className="items-center py-2 px-4"
          >
            <MapPin size={26} color={getIconColor('MapPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('MapPage')} ${getTextWeight('MapPage')}`}>
              지도
            </Text>
          </TouchableOpacity>

          {/* --- 캘린더 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('CalendarPage')}
            className="items-center py-2 px-4"
          >
            <Calendar size={26} color={getIconColor('CalendarPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('CalendarPage')} ${getTextWeight('CalendarPage')}`}>
              캘린더
            </Text>
          </TouchableOpacity>

          {/* --- 이용자 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('LinkPage')}
            className="items-center py-2 px-4"
          >
            <Users size={26} color={getIconColor('LinkPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('LinkPage')} ${getTextWeight('LinkPage')}`}>
              이용자
            </Text>
          </TouchableOpacity>

          {/* --- 갤러리 --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('GalleryPage')}
            className="items-center py-2 px-4"
          >
            <ImageIcon size={26} color={getIconColor('GalleryPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('GalleryPage')} ${getTextWeight('GalleryPage')}`}>
              갤러리
            </Text>
          </TouchableOpacity>

          {/* --- 설정 (마이페이지) --- */}
          <TouchableOpacity
            onPress={() => navigateToScreen('MyPage')} // 이동할 스크린 이름은 'MyPage' 유지
            className="items-center py-2 px-4"
          >
            <User size={26} color={getIconColor('MyPage')} />
            <Text style={{ fontFamily: 'System' }} className={`text-sm mt-1 ${getTextColor('MyPage')} ${getTextWeight('MyPage')}`}>
              설정 {/* <-- "마이페이지"에서 "설정"으로 변경 */}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 역할이 없으면 네비게이션 숨김
  return null;
};

export default BottomNavigation;
