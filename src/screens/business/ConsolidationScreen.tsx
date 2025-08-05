import React, { useState } from 'react';
import { useConsolidations } from '../../context/ConsolidationContext';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Card from '../../components/common/Card';
import Spacer from '../../components/common/Spacer';
import Button from '../../components/common/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { mockConsolidations } from '../../mocks/consolidations';
import FindTransporters from '../../components/FindTransporters';

// Remove mock data, use context instead

const ConsolidationScreen = ({ navigation }: any) => {
  const { consolidations, removeConsolidation, clearConsolidations } = useConsolidations();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Use the currently displayed list (context or mock)
  const displayList = consolidations.length > 0 ? consolidations : mockConsolidations;

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
    if (selectedIds.length === 0) {
      alert('Select at least one request to proceed.');
      return;
    }
    const selectedRequests = displayList.filter(c => selectedIds.includes(c.id));
    const type = selectedRequests[0].requestType;
    if (type === 'instant') {
      setSelectedInstantRequests(selectedRequests);
      setShowTransporters(true);
    } else {
      navigation.navigate('BookingConfirmation', { requests: selectedRequests });
    }
    setSelectedIds([]);
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
            <Text style={styles.itemId}>Request ID: {item.id}</Text>
            <Text style={styles.itemRoute}>{item.fromLocation} → {item.toLocation}</Text>
            <Text style={styles.itemMeta}>{item.productType} | {item.weight}kg | {item.requestType === 'instant' ? 'Instant' : 'Booking'}</Text>
          </View>
          <View style={styles.statusWrap}>
            {selected && (
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.secondary} style={{ marginBottom: 8 }} />
            )}
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
