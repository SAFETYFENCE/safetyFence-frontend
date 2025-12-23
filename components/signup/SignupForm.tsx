
import { SignupFormData } from '@/hooks/useSignupLogic';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Check, Search } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    formData: SignupFormData;
    showDatePicker: boolean;
    onInputChange: <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => void;
    onDateChange: (event: any, selectedDate?: Date) => void;
    onShowDatePicker: (show: boolean) => void;
    onOpenPostcode: (isCenter: boolean) => void;
    onSubmit: () => void;
}

const formatDate = (date: Date | null): string => {
    if (!date) return "생년월일을 선택하세요";
    return `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일`;
};

const SignupForm: React.FC<Props> = ({
    formData,
    showDatePicker,
    onInputChange,
    onDateChange,
    onShowDatePicker,
    onOpenPostcode,
    onSubmit
}) => {
    return (
        <View className="px-6">
            {/* 이름 */}
            <View className="mb-5">
                <Text className="text-gray-600 font-semibold mb-2 ml-1">이름</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                    placeholder="이름을 입력하세요"
                    value={formData.name}
                    onChangeText={(text) => onInputChange("name", text)}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* 생년월일 */}
            <View className="mb-5">
                <Text className="text-gray-600 font-semibold mb-2 ml-1">생년월일</Text>
                <TouchableOpacity
                    className={`flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 ${formData.birth ? 'border-green-500 bg-green-50/30' : ''}`}
                    onPress={() => onShowDatePicker(true)}
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
                        onInputChange("number", numericText);
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
                    onChangeText={(text) => onInputChange("password", text)}
                    secureTextEntry
                    placeholderTextColor="#9CA3AF"
                />
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-base"
                    placeholder="비밀번호 확인"
                    value={formData.confirmPassword}
                    onChangeText={(text) => onInputChange("confirmPassword", text)}
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
                        onPress={() => onOpenPostcode(false)}
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
                    onChangeText={(text) => onInputChange("homeStreetAddressDetail", text)}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* 이용자 구분 */}
            <View className="mb-8">
                <TouchableOpacity
                    className={`flex-row items-center p-4 rounded-2xl border ${formData.isElderly ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}
                    onPress={() => {
                        const newValue = !formData.isElderly;
                        onInputChange("isElderly", newValue);
                        if (!newValue) {
                            onInputChange("centerAddress", '');
                            onInputChange("centerStreetAddress", '');
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
                                onPress={() => onOpenPostcode(true)}
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
                onPress={onSubmit}
                activeOpacity={0.8}
            >
                <Text className="text-white text-center font-bold text-lg">
                    회원가입 완료
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default SignupForm;
