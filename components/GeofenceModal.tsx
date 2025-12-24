import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Calendar, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react-native';
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

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [detailAddress, setDetailAddress] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const [startHours, setStartHours] = useState('09');
  const [startMinutes, setStartMinutes] = useState('00');
  const [endHours, setEndHours] = useState('18');
  const [endMinutes, setEndMinutes] = useState('00');

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

    if (formData.type === 'temporary' && (!formData.startTime || !formData.endTime)) {
      Alert.alert('입력 오류', '일시적 영역의 경우 시작 시간과 종료 시간을 모두 설정해주세요.');
      return;
    }

    const fullAddress = detailAddress
      ? `${formData.address} ${detailAddress}`
      : formData.address;

    const startTime = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      parseInt(startHours),
      parseInt(startMinutes)
    );

    const endTime = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      parseInt(endHours),
      parseInt(endMinutes)
    );

    onSave({
      ...formData,
      address: fullAddress,
      startTime: formData.type === 'temporary' ? startTime : undefined,
      endTime: formData.type === 'temporary' ? endTime : undefined,
    });
    onClose();
  };

  const adjustTime = (
    type: 'start' | 'end',
    unit: 'hours' | 'minutes',
    increment: number
  ) => {
    if (type === 'start') {
      if (unit === 'hours') {
        const current = parseInt(startHours);
        let newValue = current + increment;
        if (newValue < 0) newValue = 23;
        if (newValue > 23) newValue = 0;
        setStartHours(newValue.toString().padStart(2, '0'));
      } else {
        const current = parseInt(startMinutes);
        let newValue = current + increment;
        if (newValue < 0) newValue = 55;
        if (newValue > 59) newValue = 0;
        setStartMinutes(newValue.toString().padStart(2, '0'));
      }
    } else {
      if (unit === 'hours') {
        const current = parseInt(endHours);
        let newValue = current + increment;
        if (newValue < 0) newValue = 23;
        if (newValue > 23) newValue = 0;
        setEndHours(newValue.toString().padStart(2, '0'));
      } else {
        const current = parseInt(endMinutes);
        let newValue = current + increment;
        if (newValue < 0) newValue = 55;
        if (newValue > 59) newValue = 0;
        setEndMinutes(newValue.toString().padStart(2, '0'));
      }
    }
  };

  const handleTimeInput = (
    type: 'start' | 'end',
    unit: 'hours' | 'minutes',
    text: string
  ) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '') {
      if (type === 'start') {
        unit === 'hours' ? setStartHours('00') : setStartMinutes('00');
      } else {
        unit === 'hours' ? setEndHours('00') : setEndMinutes('00');
      }
    } else {
      const value = parseInt(num);
      const maxValue = unit === 'hours' ? 23 : 59;
      if (value >= 0 && value <= maxValue) {
        const formatted = value.toString().padStart(2, '0');
        if (type === 'start') {
          unit === 'hours' ? setStartHours(formatted) : setStartMinutes(formatted);
        } else {
          unit === 'hours' ? setEndHours(formatted) : setEndMinutes(formatted);
        }
      }
    }
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

  const openTimePicker = (type: 'start' | 'end') => {
    if (type === 'start') {
      if (!formData.startTime) {
        const newTime = new Date();
        newTime.setHours(parseInt(startHours));
        newTime.setMinutes(parseInt(startMinutes));
        setFormData(prev => ({ ...prev, startTime: newTime }));
      }
      setShowStartTimePicker(true);
    } else {
      if (!formData.endTime) {
        const newTime = new Date();
        newTime.setHours(parseInt(endHours));
        newTime.setMinutes(parseInt(endMinutes));
        setFormData(prev => ({ ...prev, endTime: newTime }));
      }
      setShowEndTimePicker(true);
    }
  };

  const TimePickerUI = ({
    type,
    hours,
    minutes,
    onClose
  }: {
    type: 'start' | 'end';
    hours: string;
    minutes: string;
    onClose: () => void;
  }) => (
    <View className="border border-gray-300 rounded-lg p-4">
      <View className="flex-row justify-center items-center">
        {/* 시간 선택 */}
        <View className="items-center">
          <TouchableOpacity onPress={() => adjustTime(type, 'hours', 1)} className="p-2">
            <ChevronUp size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            className="border border-gray-300 rounded-lg w-16 h-12 text-center text-xl font-medium text-gray-900"
            value={hours}
            onChangeText={(text) => handleTimeInput(type, 'hours', text)}
            keyboardType="number-pad"
            maxLength={2}
          />
          <TouchableOpacity onPress={() => adjustTime(type, 'hours', -1)} className="p-2">
            <ChevronDown size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-medium text-gray-900 mx-3">:</Text>

        {/* 분 선택 */}
        <View className="items-center">
          <TouchableOpacity onPress={() => adjustTime(type, 'minutes', 5)} className="p-2">
            <ChevronUp size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            className="border border-gray-300 rounded-lg w-16 h-12 text-center text-xl font-medium text-gray-900"
            value={minutes}
            onChangeText={(text) => handleTimeInput(type, 'minutes', text)}
            keyboardType="number-pad"
            maxLength={2}
          />
          <TouchableOpacity onPress={() => adjustTime(type, 'minutes', -5)} className="p-2">
            <ChevronDown size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        className="bg-gray-100 py-2 rounded-lg mt-3"
        onPress={onClose}
      >
        <Text className="text-gray-700 text-center font-medium">확인</Text>
      </TouchableOpacity>
    </View>
  );

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

                  {showDatePicker && (
                    <DateTimePicker
                      value={showDatePicker === 'start' ? startDate : endDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}

                  {/* 시작 시간 */}
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-2">시작 시간</Text>
                    {!showStartTimePicker ? (
                      <TouchableOpacity
                        className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                        onPress={() => openTimePicker('start')}
                      >
                        <Clock size={20} color="#6b7280" />
                        <Text className="ml-3 text-gray-900">{startHours}:{startMinutes}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TimePickerUI
                        type="start"
                        hours={startHours}
                        minutes={startMinutes}
                        onClose={() => setShowStartTimePicker(false)}
                      />
                    )}
                  </View>

                  {/* 종료 시간 */}
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-2">끝나는 시간</Text>
                    {!showEndTimePicker ? (
                      <TouchableOpacity
                        className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                        onPress={() => openTimePicker('end')}
                      >
                        <Clock size={20} color="#6b7280" />
                        <Text className="ml-3 text-gray-900">{endHours}:{endMinutes}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TimePickerUI
                        type="end"
                        hours={endHours}
                        minutes={endMinutes}
                        onClose={() => setShowEndTimePicker(false)}
                      />
                    )}
                  </View>
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