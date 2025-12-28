
import { useMedicationManagement } from '@/hooks/useMedicationManagement';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MedicineManagerProps {
    visible: boolean;
    onClose: () => void;
}

export default function MedicineManager({ visible, onClose }: MedicineManagerProps) {
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [purpose, setPurpose] = useState('');
    const [frequency, setFrequency] = useState('');

    const { medications, loading, addMedication, deleteMedication } = useMedicationManagement();

    const handleAddMedicine = async () => {
        if (!name.trim()) {
            Alert.alert('알림', '약 이름을 입력해주세요.');
            return;
        }

        const success = await addMedication({
            name: name.trim(),
            dosage: dosage.trim() || '정보 없음',
            purpose: purpose.trim() || '정보 없음',
            frequency: frequency.trim() || '정보 없음',
        });

        if (success) {
            // 입력 필드 초기화
            setName('');
            setDosage('');
            setPurpose('');
            setFrequency('');
        }
    };

    const handleDeleteMedicine = async (medicationId: number, medicationName: string) => {
        Alert.alert('삭제 확인', `'${medicationName}'을(를) 정말 삭제하시겠습니까?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: () => deleteMedication(medicationId)
            }
        ]);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-white rounded-t-[32px] h-[85%] shadow-2xl overflow-hidden">
                    {/* Header */}
                    <View className="px-6 py-5 border-b border-gray-100 flex-row items-center justify-between bg-white z-10">
                        <View>
                            <Text className="text-2xl font-extrabold text-gray-900">약 목록 관리</Text>
                            <Text className="text-gray-500 text-sm mt-1">자주 드시는 약을 등록해두세요</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-gray-100 p-2.5 rounded-full hover:bg-gray-200 active:bg-gray-300"
                        >
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 bg-slate-50 px-6 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
                        {/* Input Area */}
                        <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
                            <Text className="text-sm font-bold text-gray-600 mb-3 ml-1">새로운 약 추가</Text>

                            {/* 약 이름 (필수) */}
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1">약 이름 (필수)</Text>
                                <TextInput
                                    className="bg-gray-50 px-5 py-4 rounded-xl text-lg border border-gray-200 text-gray-900"
                                    placeholder="예: 혈압약, 당뇨약"
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* 용량 (선택) */}
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1">용량 (선택)</Text>
                                <TextInput
                                    className="bg-gray-50 px-5 py-4 rounded-xl text-base border border-gray-200 text-gray-900"
                                    placeholder="예: 1정, 10mg"
                                    value={dosage}
                                    onChangeText={setDosage}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* 목적 (선택) */}
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1">복용 목적 (선택)</Text>
                                <TextInput
                                    className="bg-gray-50 px-5 py-4 rounded-xl text-base border border-gray-200 text-gray-900"
                                    placeholder="예: 혈압 조절, 당뇨 관리"
                                    value={purpose}
                                    onChangeText={setPurpose}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* 복용 빈도 (선택) */}
                            <View className="mb-4">
                                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1">복용 빈도 (선택)</Text>
                                <TextInput
                                    className="bg-gray-50 px-5 py-4 rounded-xl text-base border border-gray-200 text-gray-900"
                                    placeholder="예: 하루 1회, 아침/저녁 식후"
                                    value={frequency}
                                    onChangeText={setFrequency}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* 추가 버튼 */}
                            <TouchableOpacity
                                onPress={handleAddMedicine}
                                disabled={loading}
                                className={`bg-teal-600 py-4 rounded-xl items-center justify-center shadow-md ${loading ? 'opacity-50' : 'active:bg-teal-700'}`}
                            >
                                <Text className="text-white text-lg font-bold">
                                    {loading ? '추가 중...' : '약 추가하기'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Medicine List */}
                        <Text className="text-lg font-bold text-gray-900 mb-4 ml-1">
                            등록된 약 <Text className="text-teal-600">({medications.length})</Text>
                        </Text>

                        {medications.length === 0 ? (
                            <View className="items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-4">
                                    <Plus size={32} color="#d1d5db" />
                                </View>
                                <Text className="text-gray-400 text-lg font-medium">등록된 약이 없습니다.</Text>
                                <Text className="text-gray-400 text-sm mt-2">위 입력창에서 약을 추가해보세요.</Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {medications.map((medication) => (
                                    <View
                                        key={medication.id}
                                        className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm"
                                    >
                                        <View className="flex-row items-start justify-between mb-2">
                                            <View className="flex-1">
                                                <Text className="text-xl font-bold text-gray-900 mb-1">{medication.name}</Text>
                                                {medication.dosage && medication.dosage !== '정보 없음' && (
                                                    <Text className="text-sm text-gray-600">용량: {medication.dosage}</Text>
                                                )}
                                                {medication.purpose && medication.purpose !== '정보 없음' && (
                                                    <Text className="text-sm text-gray-600">목적: {medication.purpose}</Text>
                                                )}
                                                {medication.frequency && medication.frequency !== '정보 없음' && (
                                                    <Text className="text-sm text-gray-600">빈도: {medication.frequency}</Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteMedicine(medication.id, medication.name)}
                                                className="p-2 bg-red-50 rounded-full active:bg-red-100 ml-2"
                                            >
                                                <X size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

