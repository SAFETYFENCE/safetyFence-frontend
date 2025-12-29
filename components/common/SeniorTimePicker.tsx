import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import CustomDatePicker from './CustomDatePicker';

interface SeniorTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  title?: string; // 커스텀 제목
}

const SeniorTimePicker: React.FC<SeniorTimePickerProps> = ({ value, onChange, title }) => {
  const [showNativePicker, setShowNativePicker] = useState(false);

  // 자주 쓰는 시간대 버튼 데이터
  const quickTimes = [
    { label: '오전 9시', hours: 9, minutes: 0 },
    { label: '오전 10시', hours: 10, minutes: 0 },
    { label: '오전 11시', hours: 11, minutes: 0 },
    { label: '정오', hours: 12, minutes: 0 },
    { label: '오후 2시', hours: 14, minutes: 0 },
    { label: '오후 3시', hours: 15, minutes: 0 },
    { label: '오후 4시', hours: 16, minutes: 0 },
    { label: '오후 5시', hours: 17, minutes: 0 },
    { label: '오후 6시', hours: 18, minutes: 0 },
    { label: '오후 7시', hours: 19, minutes: 0 },
  ];

  const handleQuickTimeSelect = (h: number, m: number) => {
    const newDate = new Date(value);
    newDate.setHours(h);
    newDate.setMinutes(m);
    onChange(newDate);
  };

  const handleNativeTimeChange = (event: any, date?: Date) => {
    setShowNativePicker(false);
    if (date) {
      onChange(date);
    }
  };

  const formatTimeKorean = () => {
    const h = value.getHours();
    const m = value.getMinutes();
    const period = h < 12 ? '오전' : '오후';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const minuteText = m > 0 ? ` ${m}분` : '';
    return `${period} ${displayHour}시${minuteText}`;
  };

  return (
    <>
    <View className="border border-green-300 rounded-xl p-4 bg-green-50/50">
      <Text className="text-base font-semibold text-gray-900 mb-3 text-center">
        {title || '몇 시에 가시나요?'}
      </Text>

      {/* 시간대 버튼 그리드 */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        {quickTimes.map((time, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleQuickTimeSelect(time.hours, time.minutes)}
            className="bg-white border border-green-500 rounded-lg flex-1"
            style={{ minWidth: '45%', height: 48 }}
          >
            <View className="flex-1 justify-center items-center">
              <Text className="text-green-700 font-semibold text-base">
                {time.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 구분선 */}
      <View className="border-t border-green-200 my-3" />

      {/* 다른 시간 선택 버튼 */}
      <TouchableOpacity
        onPress={() => setShowNativePicker(true)}
        className="bg-green-100 border border-green-400 rounded-lg py-3"
      >
        <Text className="text-green-700 text-center font-semibold text-base">
          다른 시간 선택하기 ▼
        </Text>
      </TouchableOpacity>

      {/* 현재 선택된 시간 표시 */}
      {value && (
        <View className="mt-3 bg-white rounded-lg p-2.5 border border-green-200">
          <Text className="text-center text-gray-600 text-xs mb-0.5">현재 선택</Text>
          <Text className="text-center font-semibold text-green-700 text-base">
            {formatTimeKorean()}
          </Text>
        </View>
      )}
    </View>

    {/* 네이티브 시간 선택기 */}
    <CustomDatePicker
      visible={showNativePicker}
      value={value}
      mode="time"
      onChange={handleNativeTimeChange}
      onClose={() => setShowNativePicker(false)}
    />
    </>
  );
};

export default SeniorTimePicker;
