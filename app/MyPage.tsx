
import Global from '@/constants/Global';
import { userService } from '@/services/userService';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import AddressChangeModal from '../components/mypage/AddressChangeModal';
import GeofenceList from '../components/mypage/GeofenceList';
import MyPageHeader from '../components/mypage/MyPageHeader';
import PasswordChangeModal from '../components/mypage/PasswordChangeModal';
import PrimarySupporterCard from '../components/mypage/PrimarySupporterCard';
import ProfileCard from '../components/mypage/ProfileCard';
import SettingsCard from '../components/mypage/SettingsCard';
import SupporterListModal from '../components/mypage/SupporterListModal';
import { useMyPageLogic } from '../hooks/useMyPageLogic';

const MyPage: React.FC = () => {
  const navigation = useNavigation();
  const [isSupporterModalOpen, setIsSupporterModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressType, setAddressType] = useState<'home' | 'center'>('home');

  const {
    userData,
    loading,
    error,
    fetchUserData,
    handleLogout,
    handleGeofenceDelete,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    handlePasswordChange,
  } = useMyPageLogic();

  const handleHomeAddressChange = async (data: { zipCode: string; streetAddress: string; detailAddress?: string }) => {
    try {
      await userService.changeHomeAddress({
        homeAddress: data.zipCode,
        homeStreetAddress: data.streetAddress,
        homeStreetAddressDetail: data.detailAddress || '',
      });
      Alert.alert('성공', '집 주소가 변경되었습니다.');
      setAddressModalVisible(false);
      fetchUserData();
    } catch (error: any) {
      console.error('집 주소 변경 실패:', error);
      const message = error.response?.data?.message || '주소 변경에 실패했습니다.';
      Alert.alert('오류', message);
    }
  };

  const handleCenterAddressChange = async (data: { zipCode: string; streetAddress: string }) => {
    try {
      await userService.changeCenterAddress({
        centerAddress: data.zipCode,
        centerStreetAddress: data.streetAddress,
      });
      Alert.alert('성공', '센터 주소가 변경되었습니다.');
      setAddressModalVisible(false);
      fetchUserData();
    } catch (error: any) {
      console.error('센터 주소 변경 실패:', error);
      const message = error.response?.data?.message || '주소 변경에 실패했습니다.';
      Alert.alert('오류', message);
    }
  };

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

        <MyPageHeader
          name={userData.name}
          onBack={Global.USER_ROLE === 'user' ? () => navigation.goBack() : undefined}
        />

        <View className="px-5">
          <ProfileCard data={userData} />

          {/* 대표 보호자 (이용자만) */}
          {Global.USER_ROLE === 'user' && (
            <TouchableOpacity onPress={() => setIsSupporterModalOpen(true)}>
              <PrimarySupporterCard key={refreshKey} />
            </TouchableOpacity>
          )}

          <GeofenceList
            geofences={userData.geofences || []}
            onDelete={handleGeofenceDelete}
          />

          <SettingsCard
            onPasswordChange={() => setIsPasswordModalOpen(true)}
            onHomeAddressChange={() => {
              setAddressType('home');
              setAddressModalVisible(true);
            }}
            onCenterAddressChange={() => {
              setAddressType('center');
              setAddressModalVisible(true);
            }}
            onPrivacyPolicy={() => navigation.navigate('PrivacyPolicyPage' as never)}
            onLogout={handleLogout}
          />

          <View className="items-center pb-8">
            <Text className="text-xs text-gray-300">SafetyFence v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation currentScreen="MyPage" />

      <PasswordChangeModal
        visible={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordChange}
      />

      <SupporterListModal
        visible={isSupporterModalOpen}
        onClose={() => setIsSupporterModalOpen(false)}
        onPrimarySet={() => setRefreshKey(prev => prev + 1)}
      />

      <AddressChangeModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSubmit={addressType === 'home' ? handleHomeAddressChange : handleCenterAddressChange}
        type={addressType}
      />
    </SafeAreaView >
  );
};

export default MyPage;
