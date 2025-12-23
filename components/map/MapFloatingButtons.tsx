
import { MapPin, Plus } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
    onAddGeofence: () => void;
    onMoveToMyLocation: () => void;
}

const MapFloatingButtons: React.FC<Props> = ({ onAddGeofence, onMoveToMyLocation }) => {
    return (
        <View style={styles.fabContainer} pointerEvents="box-none">
            <TouchableOpacity
                style={[styles.fab, styles.fabSecondary]}
                onPress={onAddGeofence}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.fab, styles.fabPrimary]}
                onPress={onMoveToMyLocation}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MapPin size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: Platform.OS === 'ios' ? 110 : 130,
        alignItems: 'center',
        zIndex: 50,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    fabPrimary: {
        backgroundColor: '#27f572ff',
    },
    fabSecondary: {
        backgroundColor: '#04faacff',
    },
});

export default MapFloatingButtons;
