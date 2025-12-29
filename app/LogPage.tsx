import { Bell, Clock, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  Text,
  View
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { logService } from '../services/logService';
import type { LogItem } from '../types/api';

const NotificationsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        // API 호출: GET /logs
        const data = await logService.getLogs();
        setLogs(data);
        console.log('로그 데이터 로드 성공:', data.length);
      } catch (error) {
        console.error('로그 불러오기 실패:', error);
        Alert.alert('오류', '로그 데이터를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const LogCard: React.FC<{ item: LogItem }> = ({ item }) => (
    <View className="bg-white rounded-lg shadow-sm mb-4 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="h-12 w-12 bg-blue-100 rounded-full items-center justify-center mr-3">
              <MapPin size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">{item.location}</Text>
              <View className="flex-row items-center mt-1">
                <Clock size={12} color="#6b7280" />
                <Text className="text-sm text-gray-500 ml-1">
                  도착: {item.arriveTime}
                </Text>
              </View>
            </View>
          </View>
          <Text className="text-sm text-gray-600 mt-2">
            {item.locationAddress}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <View className="flex-1 p-4 pb-20">
        <View className="max-w-2xl mx-auto w-full">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-900">이동 기록</Text>
          </View>

          <FlatList
            data={logs}
            renderItem={({ item }) => <LogCard item={item} />}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Bell size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-lg mt-4">기록이 없습니다</Text>
              </View>
            }
          />
        </View>
      </View>

      <BottomNavigation currentScreen="LogPage" />
    </SafeAreaView>
  );
};
//
export default NotificationsPage;
