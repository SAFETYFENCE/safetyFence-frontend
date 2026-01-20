
import Global from '@/constants/Global';
import { Battery, ChevronRight, Home, LogOut, MapPin, Settings, Shield, Trash2, User } from 'lucide-react-native';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { openBatteryOptimizationSettings } from '@/utils/batteryOptimization';

interface Props {
    onPasswordChange: () => void;
    onHomeAddressChange?: () => void;
    onCenterAddressChange?: () => void;
    onPrivacyPolicy: () => void;
    onAccountDeletion: () => void;
    onLogout: () => void;
}

const SettingsCard: React.FC<Props> = ({ onPasswordChange, onHomeAddressChange, onCenterAddressChange, onPrivacyPolicy, onAccountDeletion, onLogout }) => {
    return (
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2">
                    <Settings size={16} color="#16a34a" />
                </View>
                <Text className="text-lg font-bold text-gray-900">설정</Text>
            </View>

            <View className="space-y-1">
                <TouchableOpacity
                    onPress={onPasswordChange}
                    className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                >
                    <View className="flex-row items-center">
                        <View className="w-8 items-center"><Shield size={18} color="#4b5563" /></View>
                        <Text className="font-medium text-gray-700">비밀번호 변경</Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>

                {onHomeAddressChange && (
                    <TouchableOpacity
                        onPress={onHomeAddressChange}
                        className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                    >
                        <View className="flex-row items-center">
                            <View className="w-8 items-center"><Home size={18} color="#4b5563" /></View>
                            <Text className="font-medium text-gray-700">집 주소 변경</Text>
                        </View>
                        <ChevronRight size={16} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {onCenterAddressChange && (
                    <TouchableOpacity
                        onPress={onCenterAddressChange}
                        className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                    >
                        <View className="flex-row items-center">
                            <View className="w-8 items-center"><MapPin size={18} color="#4b5563" /></View>
                            <Text className="font-medium text-gray-700">센터 주소 변경</Text>
                        </View>
                        <ChevronRight size={16} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* 백그라운드 실행 설정 (Android 이용자만) */}
                {Platform.OS === 'android' && Global.USER_ROLE === 'user' && (
                    <TouchableOpacity
                        onPress={openBatteryOptimizationSettings}
                        className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                    >
                        <View className="flex-row items-center">
                            <View className="w-8 items-center"><Battery size={18} color="#4b5563" /></View>
                            <Text className="font-medium text-gray-700">백그라운드 실행 설정</Text>
                        </View>
                        <ChevronRight size={16} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={onPrivacyPolicy}
                    className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                >
                    <View className="flex-row items-center">
                        <View className="w-8 items-center"><User size={18} color="#4b5563" /></View>
                        <Text className="font-medium text-gray-700">개인정보 처리방침</Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onAccountDeletion}
                    className="flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-xl"
                >
                    <View className="flex-row items-center">
                        <View className="w-8 items-center"><Trash2 size={18} color="#4b5563" /></View>
                        <Text className="font-medium text-gray-700">계정 삭제</Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                </TouchableOpacity>

                <View className="h-px bg-gray-100 my-2" />

                <TouchableOpacity
                    onPress={onLogout}
                    className="flex-row items-center py-3 px-2 active:bg-red-50 rounded-xl"
                >
                    <View className="w-8 items-center"><LogOut size={18} color="#ef4444" /></View>
                    <Text className="font-medium text-red-500">로그아웃</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SettingsCard;
