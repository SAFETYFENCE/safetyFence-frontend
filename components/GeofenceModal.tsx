import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Calendar, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DaumPostcode, { DaumPostcodeData } from '../utils/DaumPostcode';
import SeniorTimePicker from './common/SeniorTimePicker';

export interface GeofenceData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'permanent' | 'temporary';
  startTime?: Date;
  endTime?: Date;
}

interface GeofenceModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: GeofenceData) => void;
  initialLocation?: { latitude: number; longitude: number };
}

const GeofenceModal: React.FC<GeofenceModalProps> = ({
  visible,
  onClose,
  onSave,
  initialLocation,
}) => {
  const [formData, setFormData] = useState<GeofenceData>({
    name: '',
    address: '',
    latitude: initialLocation?.latitude || 37.5665,
    longitude: initialLocation?.longitude || 126.9780,
    type: 'permanent',
  });

  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [detailAddress, setDetailAddress] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  // 시간 설정 (기본값: 오전 9시, 오후 6시)
  const [startTime, setStartTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [endTime, setEndTime] = useState(() => {
    const date = new Date();
    date.setHours(18, 0, 0, 0);
    return date;
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (showDatePicker === 'start' ? startDate : endDate);
    setShowDatePicker(null);
    if (showDatePicker === 'start') {
      setStartDate(currentDate);
    } else if (showDatePicker === 'end') {
      setEndDate(currentDate);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert('입력 오류', '위치 이름을 입력해주세요.');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert('입력 오류', '주소를 입력해주세요.');
      return;
    }

    // 일시적 영역의 경우 시간 검증 (startTime, endTime은 기본값이 있어 항상 설정됨)
    if (formData.type === 'temporary' && (!startTime || !endTime)) {
      Alert.alert('입력 오류', '일시적 영역의 경우 시작 시간과 종료 시간을 모두 설정해주세요.');
      return;
    }

    const fullAddress = detailAddress
      ? `${formData.address} ${detailAddress}`
      : formData.address;

    // 날짜 + 시간 결합
    const finalStartTime = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    );

    const finalEndTime = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      endTime.getHours(),
      endTime.getMinutes()
    );

    onSave({
      ...formData,
      address: fullAddress,
      startTime: formData.type === 'temporary' ? finalStartTime : undefined,
      endTime: formData.type === 'temporary' ? finalEndTime : undefined,
    });
    onClose();
  };


  const handleAddressSelect = async (data: DaumPostcodeData) => {
    try {
      setFormData(prev => ({
        ...prev,
        address: data.address,
      }));
      setDetailAddress('');
      setIsAddressModalVisible(false);

      // 주소 -> 좌표 변환
      const geocoded = await Location.geocodeAsync(data.address);
      if (geocoded.length > 0) {
        setFormData(prev => ({
          ...prev,
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
        }));
      } else {
        Alert.alert('알림', '해당 주소의 좌표를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('오류', '주소를 좌표로 변환하는 데 실패했습니다.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black/50 justify-center items-center">
        <View className="bg-white rounded-2xl w-11/12 max-w-md" style={{ maxHeight: '85%' }}>
          {/* 헤더 */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <Text className="text-xl font-bold text-green-900">안전구역 추가</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Text className="text-2xl text-gray-400">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View className="p-6">
              {/* 위치 이름 */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">위치 이름</Text>
                <TextInput
                  className="border border-green-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="예) 병원, 경로당"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* 주소 영역 */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">주소</Text>
                <TouchableOpacity
                  className="flex-row items-center border border-green-300 rounded-lg px-4 py-3 mb-2"
                  onPress={() => setIsAddressModalVisible(true)}
                >
                  <MapPin size={20} color="#6b7280" />
                  <Text className="ml-3 text-gray-900">
                    {formData.address || "주소 검색하기"}
                  </Text>
                </TouchableOpacity>

                {formData.address && (
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    placeholder="상세 주소를 입력하세요"
                    value={detailAddress}
                    onChangeText={setDetailAddress}
                    placeholderTextColor="#9ca3af"
                  />
                )}
              </View>

              {/* 영역 특성 */}
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-3">특성</Text>
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-lg ${formData.type === 'permanent'
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                      }`}
                    onPress={() => setFormData(prev => ({ ...prev, type: 'permanent' }))}
                  >
                    <Text className={`text-center font-medium ${formData.type === 'permanent' ? 'text-white' : 'text-gray-600'
                      }`}>
                      영구
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-lg ${formData.type === 'temporary'
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                      }`}
                    onPress={() => setFormData(prev => ({ ...prev, type: 'temporary' }))}
                  >
                    <Text className={`text-center font-medium ${formData.type === 'temporary' ? 'text-white' : 'text-gray-600'
                      }`}>
                      일시적
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 시간 설정 (일시적 영역일 때만) */}
              {formData.type === 'temporary' && (
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-3">시간 및 날짜 추가 (필수)</Text>

                  {/* 시작 날짜 */}
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-2">시작 날짜</Text>
                    <TouchableOpacity
                      className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                      onPress={() => setShowDatePicker('start')}
                    >
                      <Calendar size={20} color="#6b7280" />
                      <Text className="ml-3 text-gray-900">{startDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 시작 시간 */}
                  <View className="mb-4">
                    <SeniorTimePicker
                      value={startTime}
                      onChange={setStartTime}
                      title="시작 시간을 선택해주세요"
                    />
                  </View>

                  {/* 종료 날짜 */}
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-2">종료 날짜</Text>
                    <TouchableOpacity
                      className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                      onPress={() => setShowDatePicker('end')}
                    >
                      <Calendar size={20} color="#6b7280" />
                      <Text className="ml-3 text-gray-900">{endDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 종료 시간 */}
                  <View className="mb-4">
                    <SeniorTimePicker
                      value={endTime}
                      onChange={setEndTime}
                      title="종료 시간을 선택해주세요"
                    />
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={showDatePicker === 'start' ? startDate : endDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
              )}

              {/* 추가하기 버튼 */}
              <TouchableOpacity
                className="bg-green-500 py-4 rounded-lg"
                onPress={handleSave}
              >
                <Text className="text-white text-center font-medium text-lg">추가하기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* 주소 검색 모달 */}
      <Modal
        visible={isAddressModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAddressModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-bold">주소 검색</Text>
            <TouchableOpacity
              onPress={() => setIsAddressModalVisible(false)}
              className="p-2"
            >
              <Text className="text-xl text-gray-500">✕</Text>
            </TouchableOpacity>
          </View>

          <DaumPostcode
            onSubmit={handleAddressSelect}
            onClose={() => setIsAddressModalVisible(false)}
          />
        </SafeAreaView>
      </Modal>
    </Modal>
  );
};

export default GeofenceModal;