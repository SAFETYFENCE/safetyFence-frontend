import Global from '@/constants/Global';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Calendar, Check, ChevronLeft, Search, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { authService } from '../services/authService';
import DaumPostcode, { DaumPostcodeData } from '../utils/DaumPostcode';
import { storage } from '../utils/storage';

// 인터페이스 정의
interface FormData {
  name: string;
  password: string;
  confirmPassword: string;
  birth: Date | null;
  number: string;
  homeAddress: string;
  homeStreetAddress: string;
  homeStreetAddressDetail: string;
  centerAddress: string;
  centerStreetAddress: string;
  isElderly: boolean;
}

const SignupPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    password: '',
    confirmPassword: '',
    birth: null,
    number: '',
    homeAddress: '',
    homeStreetAddress: '',
    homeStreetAddressDetail: '',
    centerAddress: '',
    centerStreetAddress: '',
    isElderly: false
  });

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false); // 생년월일 검색 관련
  const [isPostcodeMode, setIsPostcodeMode] = useState<boolean>(false); // 집 주소 검색 모달 상태
  const [isCenterPostcodeMode, setIsCenterPostcodeMode] = useState<boolean>(false); // 센터 주소 검색 모달 상태

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 다음 우편번호 검색 시작
  const searchZipCode = (): void => {
    setIsPostcodeMode(true);
  };

  // 다음 우편번호 API에서 주소 선택 처리
  const handleDaumPostcode = (data: DaumPostcodeData): void => {
    // 주소 조합 로직
    let fullAddress = data.address;
    let extraAddress = '';

    // 도로명 주소인 경우 추가 정보 처리
    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress +=
          extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    // 폼 데이터 업데이트
    setFormData(prev => ({
      ...prev,
      homeStreetAddress: fullAddress,
      homeAddress: String(data.zonecode),
    }));

    // 모달 닫기
    setIsPostcodeMode(false);
  };

  // 다음 우편번호 검색 모달 닫기
  const closeDaumPostcode = (): void => {
    setIsPostcodeMode(false);
  };

  // 센터 주소 검색 시작
  const searchCenterZipCode = (): void => {
    setIsCenterPostcodeMode(true);
  };

  // 센터 주소 선택 처리
  const handleCenterDaumPostcode = (data: DaumPostcodeData): void => {
    // 주소 조합 로직
    let fullAddress = data.address;
    let extraAddress = '';

    // 도로명 주소인 경우 추가 정보 처리
    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress +=
          extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    // 센터 주소 업데이터
    setFormData(prev => ({
      ...prev,
      centerStreetAddress: fullAddress,
      centerAddress: String(data.zonecode),
    }));

    // 모달 닫기
    setIsCenterPostcodeMode(false);
  };

  // 센터 주소 검색 모달 닫기
  const closeCenterDaumPostcode = (): void => {
    setIsCenterPostcodeMode(false);
  };

  const onDateChange = (event: any, selectedDate?: Date): void => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange("birth", selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "생년월일을 선택하세요";
    return `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일`;
  };

  const prepareSignupData = () => {
    const signupData = {
      name: formData.name,
      password: formData.password,
      birth: formData.birth ? formData.birth.toISOString().slice(0, 10) : null,
      number: formData.number,
      homeAddress: formData.homeAddress,
      centerAddress: formData.centerAddress,
      homeStreetAddress: formData.homeStreetAddress,
      homeStreetAddressDetail: formData.homeStreetAddressDetail,
      centerStreetAddress: formData.centerStreetAddress
    };
    return signupData;
  };

  const handleSubmit = async (): Promise<void> => {
    const signupData = prepareSignupData();

    // 유효성 검증
    if (!signupData.name || !signupData.password || !signupData.number || !signupData.birth) {
      Alert.alert('입력 오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    console.log('회원가입 전송 데이터:', signupData);

    try {
      // API 호출: POST /user/signup
      const response = await authService.signup({
        number: signupData.number,
        name: signupData.name,
        password: signupData.password,
        birth: signupData.birth,
        homeAddress: signupData.homeAddress,
        centerAddress: signupData.centerAddress,
        homeStreetAddress: signupData.homeStreetAddress,
        homeStreetAddressDetail: signupData.homeStreetAddressDetail,
        centerStreetAddress: signupData.centerStreetAddress,
      });

      console.log('회원가입 성공:', response);

      // Global 상태 업데이트
      Global.NUMBER = response.number;
      await storage.setUserNumber(response.number);
      await storage.setUserName(response.name);

      // 성공 알림 및 로그인 페이지로 이동
      Alert.alert(
        "🎉 회원가입 완료",
        `${response.name}님, 회원가입이 성공적으로 완료되었습니다!\n로그인 페이지로 이동하여 로그인해주세요.`,
        [
          {
            text: "확인",
            onPress: () => {
              console.log('로그인 페이지로 이동');
              try {
                router.replace('/');
              } catch (navError) {
                console.error('네비게이션 오류:', navError);
                router.push('/');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || "회원가입에 실패했습니다. 다시 시도해주세요.";
      Alert.alert("회원가입 실패", message);
      console.error('회원가입 실패:', error);
    }
  };

  // 🔧 다음 우편번호 검색 모드인 경우
  if (isPostcodeMode) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
          <Text className="text-lg font-bold text-gray-900">주소 검색</Text>
          <TouchableOpacity onPress={closeDaumPostcode} className="p-2">
            <X size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <DaumPostcode
          onSubmit={handleDaumPostcode}
          onClose={closeDaumPostcode}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View className="bg-green-500 px-6 pt-6 pb-10 rounded-b-[30px] shadow-sm mb-6">
            <View className="flex-row items-center justify-center relative mb-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute left-0 w-10 h-10 items-center justify-center rounded-full bg-white/20"
                activeOpacity={0.7}
              >
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-white">회원가입</Text>
            </View>
            <Text className="text-green-100 text-base text-center">
              서비스 이용을 위해 정보를 입력해주세요
            </Text>
          </View>

          <View className="px-6">
            {/* 이름 */}
            <View className="mb-5">
              <Text className="text-gray-600 font-semibold mb-2 ml-1">이름</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChangeText={(text) => handleInputChange("name", text)}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 생년월일 */}
            <View className="mb-5">
              <Text className="text-gray-600 font-semibold mb-2 ml-1">생년월일</Text>
              <TouchableOpacity
                className={`flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 ${formData.birth ? 'border-green-500 bg-green-50/30' : ''}`}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={20} color={formData.birth ? "#22c55e" : "#9CA3AF"} />
                <Text className={`ml-3 text-base ${formData.birth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {formatDate(formData.birth)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.birth || new Date()}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
            </View>

            {/* 전화번호 */}
            <View className="mb-5">
              <Text className="text-gray-600 font-semibold mb-2 ml-1">전화번호</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="숫자만 입력해주세요"
                value={formData.number}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '');
                  handleInputChange("number", numericText);
                }}
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
                maxLength={11}
              />
            </View>

            {/* 비밀번호 */}
            <View className="mb-5">
              <Text className="text-gray-600 font-semibold mb-2 ml-1">비밀번호</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base mb-3"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChangeText={(text) => handleInputChange("password", text)}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange("confirmPassword", text)}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
              {formData.password && formData.confirmPassword && (
                <Text className={`text-xs mt-2 ml-1 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {formData.password === formData.confirmPassword ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                </Text>
              )}
            </View>

            {/* 주소 */}
            <View className="mb-6">
              <Text className="text-gray-600 font-semibold mb-2 ml-1">주소</Text>

              <View className="flex-row mb-3">
                <TextInput
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-500 text-base mr-2"
                  placeholder="우편번호"
                  value={formData.homeAddress}
                  editable={false}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  className="bg-green-500 px-5 rounded-2xl justify-center items-center shadow-sm"
                  onPress={searchZipCode}
                  activeOpacity={0.8}
                >
                  <Search size={20} color="white" />
                </TouchableOpacity>
              </View>

              <TextInput
                className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-500 text-base mb-3"
                placeholder="기본주소"
                value={formData.homeStreetAddress}
                editable={false}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                placeholder="상세주소를 입력하세요"
                value={formData.homeStreetAddressDetail}
                onChangeText={(text) => handleInputChange("homeStreetAddressDetail", text)}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 이용자 구분 */}
            <View className="mb-8">
              <TouchableOpacity
                className={`flex-row items-center p-4 rounded-2xl border ${formData.isElderly ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}
                onPress={() => {
                  const newValue = !formData.isElderly;
                  handleInputChange("isElderly", newValue);
                  if (!newValue) {
                    setFormData(prev => ({
                      ...prev,
                      centerAddress: '',
                      centerStreetAddress: ''
                    }));
                  }
                }}
                activeOpacity={0.9}
              >
                <View className={`w-6 h-6 rounded-full border items-center justify-center mr-3 ${formData.isElderly ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                  {formData.isElderly && <Check size={14} color="white" />}
                </View>
                <Text className={`text-base font-medium ${formData.isElderly ? 'text-green-800' : 'text-gray-600'}`}>
                  노인 이용자입니다
                </Text>
              </TouchableOpacity>

              {/* 센터 주소 */}
              {formData.isElderly && (
                <View className="mt-4 pl-2 border-l-2 border-green-200 ml-4">
                  <Text className="text-gray-600 font-semibold mb-2 ml-1">센터 주소</Text>
                  <View className="flex-row mb-3">
                    <TextInput
                      className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-500 text-base mr-2"
                      placeholder="우편번호"
                      value={formData.centerAddress}
                      editable={false}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      className="bg-green-500 px-5 rounded-2xl justify-center items-center shadow-sm"
                      onPress={searchCenterZipCode}
                      activeOpacity={0.8}
                    >
                      <Search size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-500 text-base"
                    placeholder="센터 주소"
                    value={formData.centerStreetAddress}
                    editable={false}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>

            {/* 회원가입 버튼 */}
            <TouchableOpacity
              className="bg-green-600 py-4 rounded-2xl shadow-lg shadow-green-200 mb-8 active:bg-green-700"
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-bold text-lg">
                회원가입 완료
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 센터 주소 검색 모달 */}
        {isCenterPostcodeMode && (
          <Modal visible={true} animationType="slide">
            <SafeAreaView className="flex-1 bg-white">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-900">센터 주소 검색</Text>
                <TouchableOpacity onPress={closeCenterDaumPostcode} className="p-2">
                  <X size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <DaumPostcode
                onSubmit={handleCenterDaumPostcode}
                onClose={closeCenterDaumPostcode}
              />
            </SafeAreaView>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupPage;
