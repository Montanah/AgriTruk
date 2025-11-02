import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Spacer from '../../components/common/Spacer';
import FindTransporters from '../../components/FindTransporters';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { useConsolidations } from '../../context/ConsolidationContext';
import { getDisplayBookingId } from '../../utils/unifiedIdSystem';

const ConsolidationScreen = ({ navigation }: any) => {
  const { consolidations, removeConsolidation, clearConsolidations } = useConsolidations();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Use only the context data
  const displayList = consolidations;

  // Only allow selection of same requestType
  const [showTransporters, setShowTransporters] = useState(false);
  const [selectedInstantRequests, setSelectedInstantRequests] = useState<any[]>([]);
  const handleSelect = (id: string) => {
    const selected = displayList.find(c => c.id === id);
    if (!selected) return;
    if (selectedIds.length === 0) {
      setSelectedIds([id]);
    } else {
      const firstType = displayList.find(c => c.id === selectedIds[0])?.requestType;
      if (selected.requestType !== firstType) {
        alert('Cannot mix instant and booking requests in one consolidation.');
        return;
      }
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleProceed = () => {
    try {
      if (selectedIds.length === 0) {
        alert('Select at least one request to proceed.');
        return;
      }
      
      if (!Array.isArray(displayList) || displayList.length === 0) {
        alert('No requests available to proceed.');
        return;
      }
      
      const selectedRequests = displayList.filter((c: any) => c && selectedIds.includes(c.id));
      
      if (selectedRequests.length === 0) {
        alert('Selected requests are no longer available.');
        return;
      }
      
      const type = selectedRequests[0]?.requestType;
      if (!type) {
        alert('Invalid request type. Please try again.');
        return;
      }
      
      if (type === 'instant') {
        setSelectedInstantRequests(selectedRequests);
        setShowTransporters(true);
      } else {
        if (navigation?.navigate) {
          navigation.navigate('BookingConfirmation', { 
            requests: selectedRequests, 
            mode: 'business' 
          });
        } else {
          alert('Navigation error. Please try again.');
        }
      }
      setSelectedIds([]);
    } catch (error) {
      console.error('Error in handleProceed:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const renderConsolidation = ({ item }: any) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.itemRow, selected && styles.selectedRow]}
        activeOpacity={0.85}
        onPress={() => handleSelect(item.id)}
      >
        <Card style={[styles.itemCard, selected && styles.selectedCard]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons
                name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={selected ? colors.secondary : colors.text.light}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.itemId}>Request ID: {getDisplayBookingId(item)}</Text>
            </View>
            <Text style={styles.itemRoute}>{item.fromLocation} → {item.toLocation}</Text>
            <Text style={styles.itemMeta}>{item.productType} | {item.weight}kg | {item.requestType === 'instant' ? 'Instant' : 'Booking'}</Text>
          </View>
          <View style={styles.statusWrap}>
            <TouchableOpacity onPress={() => removeConsolidation(item.id)}>
              <MaterialCommunityIcons name="delete" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Back Button and Quick Links */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, borderRadius: 16, backgroundColor: colors.surface, marginRight: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Consolidations</Text>
        {/* Spacer to push link right */}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => navigation.navigate('BusinessRequest')} style={{ padding: 8, borderRadius: 16, backgroundColor: colors.surface }}>
          <MaterialCommunityIcons name="plus-circle" size={22} color={colors.secondary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={displayList}
        renderItem={renderConsolidation}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Spacer size={12} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.selectionHint}>
            <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color={colors.secondary} />
            <Text style={styles.selectionHintText}>Tap items to select multiple shipments for consolidation</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 16 }}>No consolidated requests yet.</Text>
          </View>
        }
      />
      <Button
        title="Proceed with Selected"
        onPress={handleProceed}
        style={styles.newBtn}
      />
      {/* Show FindTransporters for consolidated instant requests */}
      {showTransporters && selectedInstantRequests.length > 0 && (
        <FindTransporters
          requests={selectedInstantRequests}
          distance={''}
          accent={colors.secondary}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 18,
    fontFamily: fonts.family.bold,
  },
  itemRow: {
    width: '100%',
  },
  selectedRow: {
    backgroundColor: colors.secondary + '18',
    borderRadius: 14,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  selectedCard: {
    backgroundColor: colors.secondary + '22',
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  selectionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectionHintText: {
    color: colors.text.secondary,
    fontSize: fonts.size.sm,
    flex: 1,
  },
  itemId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  itemRoute: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    fontWeight: '500',
  },
  statusWrap: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  status: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 2,
    textAlign: 'right',
  },
  statusPending: {
    backgroundColor: colors.secondary + '22',
    color: colors.secondary,
  },
  statusInTransit: {
    backgroundColor: colors.primary + '22',
    color: colors.primary,
  },
  itemDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  newBtn: {
    marginTop: 18,
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 16,
  },
});

export default ConsolidationScreen;
