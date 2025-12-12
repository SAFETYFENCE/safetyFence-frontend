import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, ChevronUp, Clock, Paperclip, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { galleryService } from '../services/galleryService';

interface TodoData {
  title: string;
  time: Date;
  description?: string;
  image?: string;
}

interface TodoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: TodoData) => void;
  selectedDate: string;
}

const TodoModal: React.FC<TodoModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedDate,
}) => {
  const [formData, setFormData] = useState<Omit<TodoData, 'time'>>({
    title: '',
    description: '',
    image: undefined,
  });
  const [time, setTime] = useState({ hours: '09', minutes: '00' });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleClose = () => {
    setFormData({ title: '', description: '', image: undefined });
    setTime({ hours: '09', minutes: '00' });
    setShowTimePicker(false);
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, image: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('입력 오류', '할 일 제목을 입력해주세요.');
      return;
    }

    const dateToSave = new Date();
    dateToSave.setHours(parseInt(time.hours, 10));
    dateToSave.setMinutes(parseInt(time.minutes, 10));

    // 사진이 있으면 갤러리 서비스에 저장
    if (formData.image) {
      try {
        await galleryService.addPhoto({
          uri: formData.image,
          date: selectedDate,
          title: formData.title,
          description: formData.description,
        });
        console.log('사진 갤러리에 저장 완료');
      } catch (error) {
        console.error('사진 저장 실패:', error);
      }
    }

    onSave({
      ...formData,
      time: dateToSave,
    });
    handleClose();
  };

  const adjustTime = (unit: 'hours' | 'minutes', increment: number) => {
    setTime(prev => {
      let currentValue = parseInt(prev[unit], 10);
      let newValue: number;
      const max = unit === 'hours' ? 23 : 59;
      const step = unit === 'minutes' ? 5 : 1;

      newValue = currentValue + (increment * step);

      if (newValue < 0) newValue = max - (unit === 'minutes' ? step - 1 : 0);
      if (newValue > max) newValue = 0;

      return { ...prev, [unit]: newValue.toString().padStart(2, '0') };
    });
  };

  const handleTimeChange = (unit: 'hours' | 'minutes', text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '') {
      setTime(prev => ({ ...prev, [unit]: '00' }));
    } else {
      const value = parseInt(num, 10);
      const max = unit === 'hours' ? 23 : 59;
      if (value >= 0 && value <= max) {
        setTime(prev => ({ ...prev, [unit]: value.toString().padStart(2, '0') }));
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-black/50 justify-center items-center">
        <View className="bg-white rounded-2xl w-11/12 max-w-md max-h-[90vh]">
          {/* 헤더 */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">할 일 추가</Text>
            <TouchableOpacity onPress={handleClose} className="p-2">
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6">
            {/* 선택된 날짜 표시 */}
            <View className="mb-4 p-3 bg-green-50 rounded-lg">
              <Text className="text-sm text-green-600 font-medium">
                {formatDate(selectedDate)}에 할 일 추가
              </Text>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">할 일 제목</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="예) 혈압약 복용, 운동하기"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">시간</Text>
              {!showTimePicker ? (
                <TouchableOpacity
                  className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={20} color="#6b7280" />
                  <Text className="ml-3 text-base text-gray-900">{time.hours}:{time.minutes}</Text>
                </TouchableOpacity>
              ) : (
                <View className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                  <View className="flex-row justify-center items-center">
                    <View className="items-center">
                      <TouchableOpacity onPress={() => adjustTime('hours', 1)} className="p-2"><ChevronUp size={24} color="#6b7280" /></TouchableOpacity>
                      <TextInput
                        className="border border-gray-300 bg-white rounded-lg w-20 h-14 text-center text-2xl font-bold text-gray-900"
                        value={time.hours}
                        onChangeText={(text) => handleTimeChange('hours', text)}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <TouchableOpacity onPress={() => adjustTime('hours', -1)} className="p-2"><ChevronDown size={24} color="#6b7280" /></TouchableOpacity>
                    </View>
                    <Text className="text-3xl font-bold text-gray-900 mx-2">:</Text>
                    <View className="items-center">
                      <TouchableOpacity onPress={() => adjustTime('minutes', 1)} className="p-2"><ChevronUp size={24} color="#6b7280" /></TouchableOpacity>
                      <TextInput
                        className="border border-gray-300 bg-white rounded-lg w-20 h-14 text-center text-2xl font-bold text-gray-900"
                        value={time.minutes}
                        onChangeText={(text) => handleTimeChange('minutes', text)}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <TouchableOpacity onPress={() => adjustTime('minutes', -1)} className="p-2"><ChevronDown size={24} color="#6b7280" /></TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity className="bg-gray-200 py-2.5 rounded-lg mt-3" onPress={() => setShowTimePicker(false)}>
                    <Text className="text-gray-800 text-center font-semibold">확인</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">설명 (선택사항)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 h-24"
                placeholder="추가 설명을 입력하세요"
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 사진 첨부 (선택사항) */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">사진 첨부 (선택사항)</Text>
              {formData.image ? (
                <View className="relative">
                  <Image source={{ uri: formData.image }} className="w-full h-48 rounded-lg" />
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, image: undefined }))}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
                  >
                    <X size={18} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-10"
                  onPress={pickImage}
                >
                  <Paperclip size={20} color="#6b7280" />
                  <Text className="ml-2 text-base text-gray-600">사진 추가하기</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* 추가하기 버튼 */}
          <View className="px-6 pb-6 border-t border-gray-200 pt-4">
            <TouchableOpacity
              className="bg-green-500 py-4 rounded-xl"
              onPress={handleSave}
            >
              <Text className="text-white text-center font-semibold text-lg">추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TodoModal;
