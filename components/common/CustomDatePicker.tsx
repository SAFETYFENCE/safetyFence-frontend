
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';

interface CustomDatePickerProps {
    visible: boolean;
    mode: 'date' | 'time';
    value: Date;
    onClose: () => void;
    onChange: (event: any, date?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    visible,
    mode,
    value,
    onClose,
    onChange,
    maximumDate,
    minimumDate,
}) => {
    const [tempDate, setTempDate] = useState(value);

    // 안드로이드: 기존 네이티브 동작 (즉시 호출)
    if (Platform.OS === 'android') {
        if (!visible) return null;
        return (
            <DateTimePicker
                value={value}
                mode={mode}
                display="default"
                onChange={onChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
            />
        );
    }

    // iOS: 모달 + 스피너 + 완료 버튼
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-2xl pb-safe">
                    {/* 헤더 (취소 / 완료) */}
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Text className="text-gray-500 font-medium">취소</Text>
                        </TouchableOpacity>
                        <Text className="text-gray-900 font-bold text-lg">
                            {mode === 'date' ? '날짜 선택' : '시간 선택'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                onChange({ type: 'set' }, tempDate);
                                onClose();
                            }}
                            className="p-2"
                        >
                            <Text className="text-blue-600 font-bold">완료</Text>
                        </TouchableOpacity>
                    </View>

                    {/* iOS 스피너 */}
                    <View className="items-center py-4 bg-white">
                        <DateTimePicker
                            value={tempDate}
                            mode={mode}
                            display="spinner"
                            onChange={(_, date) => {
                                if (date) setTempDate(date);
                            }}
                            maximumDate={maximumDate}
                            minimumDate={minimumDate}
                            locale="ko-KR"
                            textColor="black"
                            themeVariant="light"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default CustomDatePicker;
