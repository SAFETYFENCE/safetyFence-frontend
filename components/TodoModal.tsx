import { Clock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CustomDatePicker from './common/CustomDatePicker';

interface TodoData {
  title: string;
  time: Date;
  description?: string;
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
  });
  const [selectedTime, setSelectedTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleClose = () => {
    setFormData({ title: '', description: '' });
    setSelectedTime(new Date(new Date().setHours(9, 0, 0, 0)));
    setShowTimePicker(false);
    onClose();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('입력 오류', '할 일 제목을 입력해주세요.');
      return;
    }

    const dateToSave = new Date();
    dateToSave.setHours(selectedTime.getHours());
    dateToSave.setMinutes(selectedTime.getMinutes());

    onSave({
      ...formData,
      time: dateToSave,
    });
    handleClose();
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      setSelectedTime(date);
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
              <TouchableOpacity
                className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3"
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color="#6b7280" />
                <Text className="ml-3 text-base text-gray-900">
                  {selectedTime.getHours().toString().padStart(2, '0')}:{selectedTime.getMinutes().toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <CustomDatePicker
                  visible={true}
                  value={selectedTime}
                  mode="time"
                  onChange={handleTimeChange}
                  onClose={() => setShowTimePicker(false)}
                />
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
