
import Global from '@/constants/Global';
import { MyPageGeofence } from '@/types/api';
import { ChevronDown, ChevronUp, MapPin, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface Props {
    geofences: MyPageGeofence[];
    onDelete: (id: number, name: string) => void;
}

const formatDateTime = (value: string | null) => {
    if (!value) return '';
    const normalized = value.replace(' ', 'T');
    const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
    if (isNaN(date.getTime())) {
        return value;
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
};

const GeofenceList: React.FC<Props> = ({ geofences, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-5">
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center mr-2">
                        <MapPin size={16} color="#16a34a" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900">
                        {Global.USER_ROLE === 'supporter' && Global.TARGET_NUMBER
                            ? `${Global.TARGET_RELATION || Global.TARGET_NUMBER}님의 영역`
                            : '등록된 영역'}
                    </Text>
                </View>
                <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-xs font-bold text-green-700">{geofences.length}개</Text>
                </View>
            </View>

            {geofences.length > 0 ? (
                <>
                    <View>
                        {(isExpanded ? geofences : geofences.slice(0, 2)).map((geofence) => (
                            <View
                                key={geofence.id}
                                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2"
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1 mr-2">
                                        <Text className="font-bold text-gray-900 text-base mb-1">{geofence.name}</Text>
                                        <Text className="text-xs text-gray-500">{geofence.address}</Text>
                                    </View>
                                    <View
                                        className={`px-2 py-1 rounded-full ${geofence.type === 0 ? "bg-green-100" : "bg-orange-100"}`}
                                    >
                                        <Text className={`text-[10px] font-bold ${geofence.type === 0 ? "text-green-700" : "text-orange-700"}`}>
                                            {geofence.type === 0 ? "영구" : "일시"}
                                        </Text>
                                    </View>
                                </View>

                                {geofence.type === 1 && geofence.startTime && geofence.endTime && (
                                    <View className="bg-white p-2 rounded-lg mt-2">
                                        <Text className="text-xs text-gray-500">
                                            🕒 {formatDateTime(geofence.startTime)} ~ {formatDateTime(geofence.endTime)}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={() => onDelete(geofence.id, geofence.name)}
                                    className="absolute bottom-4 right-4 bg-white p-1.5 rounded-full shadow-sm border border-gray-100"
                                >
                                    <Trash2 size={14} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {geofences.length > 2 && (
                        <TouchableOpacity
                            onPress={() => setIsExpanded(!isExpanded)}
                            className="flex-row items-center justify-center py-3 mt-2"
                        >
                            <Text className="text-sm font-medium text-green-600 mr-1">
                                {isExpanded ? "접기" : "더보기"}
                            </Text>
                            {isExpanded ? (
                                <ChevronUp size={16} color="#16a34a" />
                            ) : (
                                <ChevronDown size={16} color="#16a34a" />
                            )}
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <View className="py-8 items-center justify-center bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200">
                    <Text className="text-gray-400 text-sm">등록된 영역이 없습니다</Text>
                </View>
            )}
        </View>
    );
};

export default GeofenceList;
