
import Global from '@/constants/Global';
import { geofenceService } from '@/services/geofenceService';
import { userService } from '@/services/userService';
import { MyPageData } from '@/types/api';
import { storage } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useMyPageLogic = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<MyPageData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

    const fetchUserData = async () => {
        setLoading(true);
        setError(null);

        try {
            const isSupporter = Global.USER_ROLE === 'supporter';
            const targetNumber = isSupporter && Global.TARGET_NUMBER ? Global.TARGET_NUMBER : undefined;

            const data = await userService.getMyPageData();

            if (targetNumber) {
                const targetGeofences = await geofenceService.getList(targetNumber);
                data.geofences = targetGeofences.map(g => ({
                    id: g.id,
                    name: g.name,
                    address: g.address,
                    type: g.type,
                    startTime: g.startTime,
                    endTime: g.endTime,
                }));
                console.log('마이페이지 데이터 로드 성공 (이용자:', targetNumber, ')');
            } else {
                console.log('마이페이지 데이터 로드 성공 (본인)');
            }

            setUserData(data);
        } catch (err: any) {
            console.error('사용자 정보 불러오기 실패:', err);
            const msg = err?.message || '사용자 정보 로드 실패';
            setError(msg);
            Alert.alert('오류', '사용자 정보를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            '로그아웃',
            '로그아웃 하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '로그아웃',
                    onPress: async () => {
                        try {
                            await storage.clearAll();
                            Global.NUMBER = "";
                            Global.TARGET_NUMBER = "";
                            Global.USER_ROLE = "";
                            router.replace('/');  // push → replace로 변경하여 스택 정리
                        } catch (error) {
                            console.error('로그아웃 실패:', error);
                            Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const handleGeofenceDelete = (geofenceId: number, geofenceName: string) => {
        Alert.alert(
            '영역 삭제',
            `'${geofenceName}' 영역을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const targetNumber = Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                                ? Global.TARGET_NUMBER
                                : undefined;

                            await geofenceService.delete({ id: geofenceId }, targetNumber);
                            Alert.alert('성공', '선택한 영역이 삭제되었습니다.');
                            fetchUserData();
                        } catch (error) {
                            console.error('영역 삭제 실패:', error);
                            Alert.alert('오류', '영역 삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const handlePasswordChange = async (passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
        try {
            // 유효성 검사
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
                return;
            }

            if (passwordData.newPassword.length < 4) {
                Alert.alert('알림', '비밀번호는 최소 4자 이상이어야 합니다.');
                return;
            }

            // API 호출
            await userService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });

            Alert.alert('성공', '비밀번호가 변경되었습니다.');
            setIsPasswordModalOpen(false);
        } catch (error: any) {
            console.error('비밀번호 변경 실패:', error);
            const message = error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
            Alert.alert('오류', message);
        }
    };

    return {
        userData,
        loading,
        error,
        fetchUserData,
        handleLogout,
        handleGeofenceDelete,
        isPasswordModalOpen,
        setIsPasswordModalOpen,
        handlePasswordChange,
    };
};
