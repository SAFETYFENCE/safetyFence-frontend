import { medicationService } from '@/services/medicationService';
import type { CreateMedicationRequest, MedicationItem } from '@/types/api';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

/**
 * 약 관리 커스텀 훅
 * - 약 목록 조회, 추가, 삭제
 * - 복용 체크/해제
 * - 로딩 및 에러 상태 관리
 */

export const useMedicationManagement = () => {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkDate, setCheckDate] = useState<string>('');

  /**
   * 약 목록 조회
   */
  const fetchMedications = useCallback(async (date?: string) => {
    try {
      setLoading(true);
      const response = await medicationService.getList(date);
      setMedications(response.medications);
      setCheckDate(response.checkDate);
    } catch (error) {
      console.error('약 목록 조회 실패:', error);
      Alert.alert('오류', '약 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 새로고침
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedications();
    setRefreshing(false);
  }, [fetchMedications]);

  /**
   * 약 추가
   */
  const addMedication = useCallback(
    async (data: CreateMedicationRequest) => {
      try {
        setLoading(true);
        await medicationService.create(data);
        // 약 추가 후 전체 목록 다시 불러오기 (id 동기화 보장)
        await fetchMedications();
        Alert.alert('성공', '약이 등록되었습니다.');
        return true;
      } catch (error: any) {
        console.error('약 추가 실패:', error);
        const message = error.response?.data?.message || '약 등록에 실패했습니다.';
        Alert.alert('오류', message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchMedications]
  );

  /**
   * 약 삭제
   */
  const deleteMedication = useCallback(
    async (medicationId: number) => {
      try {
        await medicationService.delete(medicationId);
        setMedications((prev) => prev.filter((med) => med.id !== medicationId));
        Alert.alert('성공', '약이 삭제되었습니다.');
        return true;
      } catch (error: any) {
        console.error('약 삭제 실패:', error);
        const message = error.response?.data?.message || '약 삭제에 실패했습니다.';
        Alert.alert('오류', message);
        return false;
      }
    },
    []
  );

  /**
   * 복용 체크
   */
  const checkMedication = useCallback(
    async (medicationId: number) => {
      try {
        await medicationService.check(medicationId);
        // 전체 목록 다시 불러오기 (checkCount 업데이트)
        await fetchMedications();
        return true;
      } catch (error: any) {
        console.error('복용 체크 실패:', error);
        const message = error.response?.data?.message || '복용 체크에 실패했습니다.';
        Alert.alert('오류', message);
        return false;
      }
    },
    [fetchMedications]
  );

  /**
   * 복용 체크 해제
   */
  const uncheckMedication = useCallback(
    async (medicationId: number) => {
      try {
        await medicationService.uncheck(medicationId);
        // 전체 목록 다시 불러오기 (checkCount 업데이트)
        await fetchMedications();
        return true;
      } catch (error: any) {
        console.error('복용 체크 해제 실패:', error);
        const message = error.response?.data?.message || '체크 해제에 실패했습니다.';
        Alert.alert('오류', message);
        return false;
      }
    },
    [fetchMedications]
  );

  /**
   * 초기 로드
   */
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  return {
    medications,
    loading,
    refreshing,
    checkDate,
    fetchMedications,
    onRefresh,
    addMedication,
    deleteMedication,
    checkMedication,
    uncheckMedication,
  };
};
