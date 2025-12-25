
import { storage } from '@/utils/storage';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MedicineManagerProps {
    visible: boolean;
    onClose: () => void;
    medicineList: string[];
    onUpdateList: (newList: string[]) => void;
}

export default function MedicineManager({ visible, onClose, medicineList, onUpdateList }: MedicineManagerProps) {
    const [newMedicineName, setNewMedicineName] = useState('');

    const handleAddMedicine = async () => {
        if (!newMedicineName.trim()) {
            Alert.alert('알림', '약 이름을 입력해주세요.');
            return;
        }

        if (medicineList.includes(newMedicineName.trim())) {
            Alert.alert('알림', '이미 등록된 약입니다.');
            return;
        }

        const newList = [...medicineList, newMedicineName.trim()];
        await storage.setMedicineList(newList);
        onUpdateList(newList);
        setNewMedicineName('');
    };

    const handleDeleteMedicine = async (nameToDelete: string) => {
        Alert.alert('삭제 확인', `'${nameToDelete}'을(를) 정말 삭제하시겠습니까?`, [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    const newList = medicineList.filter(name => name !== nameToDelete);
                    await storage.setMedicineList(newList);
                    onUpdateList(newList);
                }
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
                            <View className="flex-row items-center">
                                <TextInput
                                    className="flex-1 bg-gray-50 px-5 py-4 rounded-xl text-lg border border-gray-200 text-gray-900"
                                    placeholder="예: 혈압약, 당뇨약"
                                    value={newMedicineName}
                                    onChangeText={setNewMedicineName}
                                    returnKeyType="done"
                                    onSubmitEditing={handleAddMedicine}
                                    placeholderTextColor="#9ca3af"
                                />
                                <TouchableOpacity
                                    onPress={handleAddMedicine}
                                    className="bg-teal-600 w-14 h-[60px] ml-3 items-center justify-center rounded-xl shadow-md active:bg-teal-700"
                                >
                                    <Plus size={28} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Medicine List */}
                        <Text className="text-lg font-bold text-gray-900 mb-4 ml-1">
                            등록된 약 <Text className="text-teal-600">({medicineList.length})</Text>
                        </Text>

                        {medicineList.length === 0 ? (
                            <View className="items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-4">
                                    <Plus size={32} color="#d1d5db" />
                                </View>
                                <Text className="text-gray-400 text-lg font-medium">등록된 약이 없습니다.</Text>
                                <Text className="text-gray-400 text-sm mt-2">위 입력창에서 약을 추가해보세요.</Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap gap-3">
                                {medicineList.map((medicine, index) => (
                                    <View
                                        key={index}
                                        className="bg-white border border-gray-200 pr-3 pl-4 py-3 rounded-full shadow-sm flex-row items-center"
                                    >
                                        <View className="w-2 h-2 rounded-full bg-teal-500 mr-3" />
                                        <Text className="text-lg font-bold text-gray-800 mr-2">{medicine}</Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteMedicine(medicine)}
                                            className="p-1.5 bg-red-50 rounded-full ml-1 active:bg-red-100"
                                        >
                                            <X size={14} color="#ef4444" />
                                        </TouchableOpacity>
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

