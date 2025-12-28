import { CheckSquare, Clock, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Todo } from '../../types/calendar';

interface Props {
    todo: Todo;
    onDelete: (id: number) => void;
}

const TodoCard: React.FC<Props> = React.memo(({ todo, onDelete }) => (
    <View className="bg-white rounded-xl shadow p-4 mb-3 border-l-4 border-green-500">
        <View className="flex-row items-start">
            <View className="h-11 w-11 bg-green-50 rounded-lg items-center justify-center mr-3">
                <CheckSquare size={20} color="#16a34a" />
            </View>
            <View className="flex-1">
                <Text className="text-base font-bold text-gray-900 mb-1">{todo.title}</Text>
                <View className="flex-row items-center mb-2">
                    <Clock size={13} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-1.5">
                        {todo.time.getHours().toString().padStart(2, '0')}:{todo.time.getMinutes().toString().padStart(2, '0')}
                    </Text>
                </View>
                {todo.description && (
                    <Text className="text-sm text-gray-500 mb-3">{todo.description}</Text>
                )}
                {todo.image && (
                    <Image source={{ uri: todo.image }} className="w-full h-40 rounded-lg my-2" />
                )}
                <View className="self-start px-2.5 py-1 rounded-full bg-green-100">
                    <Text className="text-xs font-semibold text-green-700">
                        할 일
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                className="p-2"
                onPress={() => onDelete(todo.id)}
            >
                <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
        </View>
    </View>
));

export default TodoCard;
