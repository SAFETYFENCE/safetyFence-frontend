import { Clock, MapPin } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Schedule } from '../../types/calendar';

interface Props {
    schedule: Schedule;
}

const ScheduleCard: React.FC<Props> = React.memo(({ schedule }) => (
    <View className="bg-white rounded-xl shadow p-4 mb-3 border-l-4 border-green-500">
        <View className="flex-row items-start">
            <View className="h-11 w-11 bg-green-50 rounded-lg items-center justify-center mr-3">
                <MapPin size={20} color="#25eb5aff" />
            </View>
            <View className="flex-1">
                <Text className="text-base font-bold text-gray-900 mb-1">{schedule.name}</Text>
                <View className="flex-row items-center mb-2">
                    <Clock size={13} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-1.5">
                        {schedule.startTime} - {schedule.endTime}
                    </Text>
                </View>
                <Text className="text-sm text-gray-500 mb-3">{schedule.address}</Text>
                <View className={`self-start px-2.5 py-1 rounded-full 
          ${schedule.type === 'permanent' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <Text className={`text-xs font-semibold 
            ${schedule.type === 'permanent' ? 'text-green-700' : 'text-yellow-700'}`}>
                        {schedule.type === 'permanent' ? '영구 영역' : '일시적 일정'}
                    </Text>
                </View>
            </View>
        </View>
    </View>
));

export default ScheduleCard;
