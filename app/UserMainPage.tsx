import { useLocation } from '@/contexts/LocationContext';
import { useMedicationManagement } from '@/hooks/useMedicationManagement';
import { useBattery } from '@/hooks/useBattery';
import { emergencyService } from '@/services/emergencyService';
import { storage } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, ScrollView, StatusBar, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicineManager from '../components/senior/MedicineManager';
import TopHeader from '../components/senior/TopHeader';

export default function UserMainPage() {
    const router = useRouter();
    const { isWebSocketConnected, isTracking, startTracking } = useLocation();
    const [userName, setUserName] = useState('');
    const [isMedicineManagerVisible, setIsMedicineManagerVisible] = useState(false);

    // API 기반 약 관리
    const {
        medications,
        loading: medicationsLoading,
        checkMedication,
        uncheckMedication,
        fetchMedications,
    } = useMedicationManagement();

    // 배터리 모니터링 (5분마다 서버에 자동 업데이트)
    const { batteryLevel, isCharging } = useBattery({
        updateInterval: 5 * 60 * 1000, // 5분
        autoUpdate: true,
    });

    useEffect(() => {
        loadUserData();

        // 자동 로그인 후 위치 추적이 시작되지 않았으면 시작
        if (!isTracking) {
            console.log('📍 UserMainPage: 위치 추적 시작');
            startTracking().catch((error) => {
                console.error('📍 UserMainPage: 위치 추적 시작 실패:', error);
            });
        }
    }, []);

    // Android 뒤로가기 버튼 처리 (UserMainPage 포커스 시에만)
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                // 백그라운드 위치 추적 앱이므로 뒤로가기로 앱 종료 방지
                // 홈 버튼으로 백그라운드 전환하도록 유도
                return true;
            });

            return () => backHandler.remove();
        }, [])
    );

    const loadUserData = async () => {
        const name = await storage.getUserName();
        if (name) setUserName(name);
    };

    const handleAddMedicationRecord = async (medicationId: number) => {
        try {
            const success = await checkMedication(medicationId);
            if (success) {
                ToastAndroid.show('복용 기록이 추가되었습니다.', ToastAndroid.SHORT);
            }
        } catch (error) {
            console.error('복용 기록 추가 실패:', error);
            Alert.alert('오류', '복용 기록 추가에 실패했습니다.');
        }
    };

    const handleRemoveMedicationRecord = async (medicationId: number) => {
        try {
            const success = await uncheckMedication(medicationId);
            if (success) {
                ToastAndroid.show('최근 복용 기록이 삭제되었습니다.', ToastAndroid.SHORT);
            }
        } catch (error) {
            console.error('복용 기록 삭제 실패:', error);
            Alert.alert('오류', '복용 기록 삭제에 실패했습니다.');
        }
    };

    const handleEmergency = () => {
        Alert.alert(
            '긴급 호출',
            '보호자에게 긴급 알림을 보내시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '호출하기',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // 1. 긴급 알림 전송
                            await emergencyService.sendAlert();
                            Alert.alert('알림', '보호자에게 긴급 알림을 보냈습니다.');

                            // 2. 대표 보호자 정보 조회 및 전화 걸기 (주석처리)
                            // try {
                            //     const primarySupporter = await linkService.getPrimarySupporter();
                            //     console.log('🔍 대표 보호자 정보:', primarySupporter);
                            //     console.log('📞 원본 전화번호:', primarySupporter.supporterNumber);

                            //     // 전화번호에서 숫자만 추출 (하이픈 등 제거)
                            //     const phoneNumber = primarySupporter.supporterNumber.replace(/[^0-9]/g, '');
                            //     console.log('📞 정제된 전화번호:', phoneNumber);

                            //     // react-native-phone-call 라이브러리 사용
                            //     const args = {
                            //         number: phoneNumber,
                            //         prompt: true  // 다이얼러를 열고 사용자가 직접 통화 버튼 누르도록
                            //     };

                            //     console.log('📱 전화 걸기 시작:', args);
                            //     RNImmediatePhoneCall(args).then(() => {
                            //         console.log('✅ 전화 앱 열기 성공');
                            //         Alert.alert('알림', '보호자에게 긴급 알림을 보내고 전화를 연결했습니다.');
                            //     }).catch((error) => {
                            //         console.error('❌ 전화 앱 열기 실패:', error);
                            //         Alert.alert('알림', '긴급 알림을 보냈습니다.\n(전화 연결 실패)');
                            //     });
                            // } catch (error: any) {
                            //     if (error.response?.status === 404) {
                            //         Alert.alert(
                            //             '알림',
                            //             '긴급 알림을 보냈습니다.\n\n대표 보호자가 설정되지 않아 자동 전화 연결이 불가능합니다.\n마이페이지에서 대표 보호자를 설정해주세요.'
                            //         );
                            //     } else {
                            //         Alert.alert('알림', '긴급 알림을 보냈습니다.\n(전화 연결 실패)');
                            //     }
                            // }
                        } catch (error) {
                            console.error('긴급 호출 실패:', error);
                            Alert.alert('오류', '긴급 호출에 실패했습니다. 다시 시도해주세요.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 50 }}>

                {/* 1. 상단 헤더 */}
                <View className="mb-1">
                    <TopHeader
                        userName={userName}
                        onMapPress={() => router.push('/MapPage')}
                        onMyPagePress={() => router.push('/MyPage')}
                    />
                </View>

                {/* 2. 안심 연결 위젯 (중앙 정렬) */}
                <View
                    className="mb-6 flex-row items-center px-12"
                >
                    <View className={`w-14 h-14 rounded-full items-center justify-center mr-3 ${isWebSocketConnected ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                        <Ionicons
                            name={isWebSocketConnected ? "shield-checkmark" : "shield-outline"}
                            size={28}
                            color={isWebSocketConnected ? "#16a34a" : "#9ca3af"}
                        />
                    </View>
                    <View>
                        <Text className={`text-lg font-bold ${isWebSocketConnected ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                            {isWebSocketConnected ? '보호자와 연결되어 있습니다' : '연결 확인이 필요합니다'}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-0.5 font-medium">
                            {isWebSocketConnected ? '오늘도 건강하고 행복한 하루 되세요' : '인터넷 연결을 확인해주세요'}
                        </Text>
                    </View>
                </View>

                {/* 3. 메인 메뉴 그리드 */}
                <View className="flex-row justify-between mb-6">
                    {/* 긴급 호출 */}
                    <TouchableOpacity
                        onPress={handleEmergency}
                        activeOpacity={0.8}
                        className="w-[48%] aspect-[0.8] bg-white rounded-2xl justify-center items-center border-2 border-red-50 shadow-sm"
                        style={{ elevation: 2 }}
                    >
                        <View className="bg-red-50 w-20 h-20 rounded-full items-center justify-center mb-3">
                            <Ionicons name="alert" size={42} color="#ef4444" />
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-extrabold text-gray-900 mb-1">긴급 호출</Text>
                            <Text className="text-base text-red-500 font-bold">위급시 누르세요</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 일정 */}
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/CalendarPage', params: { initialTab: 'schedule' } })}
                        activeOpacity={0.8}
                        className="w-[48%] aspect-[0.8] bg-white rounded-2xl justify-center items-center border-2 border-green-50 shadow-sm"
                        style={{ elevation: 2 }}
                    >
                        <View className="bg-green-50 w-20 h-20 rounded-full items-center justify-center mb-3">
                            <Ionicons name="calendar" size={42} color="#16a34a" />
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-extrabold text-gray-900 mb-1">일정</Text>
                            <Text className="text-base text-green-600 font-bold">병원/약속 확인</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 4. 약 복용 섹션 */}
                <View className="bg-blue-50 rounded-2xl p-6 mb-6 border border-blue-100 shadow-sm">
                    <View className="flex-row items-center justify-between mb-5">
                        <View className="flex-row items-center">
                            <View className="bg-blue-100 p-2.5 rounded-2xl mr-3">
                                <Ionicons name="medkit" size={26} color="#2563eb" />
                            </View>
                            <Text className="text-xl font-extrabold text-gray-800">약 드셨나요?</Text>
                        </View>

                        <View className="flex-row space-x-2">
                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/CalendarPage', params: { initialTab: 'medicine' } })}
                                className="bg-white px-4 py-2 rounded-full border border-blue-200 shadow-sm"
                            >
                                <Text className="text-blue-600 text-sm font-bold">기록장</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setIsMedicineManagerVisible(true)}
                                className="bg-blue-600 px-4 py-2 rounded-full shadow-sm"
                            >
                                <Text className="text-white text-sm font-bold">+ 관리</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {medications.length === 0 ? (
                        <TouchableOpacity
                            onPress={() => setIsMedicineManagerVisible(true)}
                            className="bg-white/80 rounded-2xl p-6 items-center justify-center border-2 border-dashed border-blue-200"
                        >
                            <Ionicons name="add-circle" size={40} color="#93c5fd" />
                            <Text className="text-gray-500 font-bold text-lg mt-2">이곳을 눌러 약을 등록하세요</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row flex-wrap gap-3">
                            {medications.map((medication) => {
                                const checkCount = medication.checkCount || 0;
                                return (
                                    <View
                                        key={medication.id}
                                        className="w-full bg-white border border-blue-100 rounded-3xl px-6 py-5 shadow-sm"
                                    >
                                        <View className="flex-row justify-between items-start">
                                            <View className="flex-1">
                                                <Text className="text-2xl font-bold mb-1 text-gray-900">
                                                    {medication.name}
                                                </Text>
                                                <View className="flex-row items-center gap-2 flex-wrap mb-2">
                                                    {medication.dosage && medication.dosage !== '정보 없음' && (
                                                        <Text className="text-sm text-gray-500 font-medium">용량: {medication.dosage}</Text>
                                                    )}
                                                    {medication.frequency && medication.frequency !== '정보 없음' && (
                                                        <Text className="text-sm text-gray-500 font-medium">• {medication.frequency}</Text>
                                                    )}
                                                </View>
                                                {checkCount > 0 && (
                                                    <Text className="text-base font-bold text-blue-600">
                                                        ✓ 오늘 {checkCount}회 복용
                                                    </Text>
                                                )}
                                            </View>

                                            <View className="flex-row gap-2 ml-3">
                                                <TouchableOpacity
                                                    onPress={() => handleAddMedicationRecord(medication.id)}
                                                    activeOpacity={0.7}
                                                    className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center"
                                                >
                                                    <Ionicons name="add" size={24} color="#ffffff" />
                                                </TouchableOpacity>
                                                {checkCount > 0 && (
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveMedicationRecord(medication.id)}
                                                        activeOpacity={0.7}
                                                        className="bg-red-100 w-12 h-12 rounded-full items-center justify-center"
                                                    >
                                                        <Ionicons name="remove" size={24} color="#ef4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>



            </ScrollView>

            <MedicineManager
                visible={isMedicineManagerVisible}
                onClose={() => {
                    setIsMedicineManagerVisible(false);
                    fetchMedications(); // 모달 닫을 때 약 목록 새로고침
                }}
            />
        </SafeAreaView>
    );
}
