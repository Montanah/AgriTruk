import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';

interface Report {
  id: string;
  title: string;
  type: 'fleet' | 'financial' | 'performance' | 'maintenance';
  dateRange: string;
  generatedAt: string;
  status: 'generating' | 'ready' | 'failed';
  downloadUrl?: string;
}

const FleetReportsScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('30');

  const reportTypes = [
    {
      id: 'fleet',
      title: 'Fleet Overview',
      description: 'Vehicle and driver statistics, utilization rates',
      icon: 'truck',
      color: colors.primary,
    },
    {
      id: 'financial',
      title: 'Financial Report',
      description: 'Revenue, costs, and profitability analysis',
      icon: 'currency-usd',
      color: colors.success,
    },
    {
      id: 'performance',
      title: 'Performance Report',
      description: 'Job completion rates, efficiency metrics',
      icon: 'chart-line',
      color: colors.info,
    },
    {
      id: 'maintenance',
      title: 'Maintenance Report',
      description: 'Vehicle maintenance schedules and alerts',
      icon: 'wrench',
      color: colors.warning,
    },
  ];

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.REPORTS}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        // Mock data for now
        setReports([
          {
            id: '1',
            title: 'Fleet Overview Report',
            type: 'fleet',
            dateRange: 'Last 30 days',
            generatedAt: '2024-01-15T10:30:00Z',
            status: 'ready',
            downloadUrl: 'https://example.com/report1.pdf',
          },
          {
            id: '2',
            title: 'Financial Report',
            type: 'financial',
            dateRange: 'Last 30 days',
            generatedAt: '2024-01-14T14:20:00Z',
            status: 'ready',
            downloadUrl: 'https://example.com/report2.pdf',
          },
          {
            id: '3',
            title: 'Performance Report',
            type: 'performance',
            dateRange: 'Last 7 days',
            generatedAt: '2024-01-16T09:15:00Z',
            status: 'generating',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const generateReport = async () => {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.REPORTS}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedReportType,
          dateRange: parseInt(dateRange),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Report generation started. You will be notified when ready.');
        setGenerateModalVisible(false);
        fetchReports();
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    }
  };

  const downloadReport = (report: Report) => {
    if (report.status === 'ready' && report.downloadUrl) {
      Alert.alert('Download', `Downloading ${report.title}...`);
      // Implement actual download logic here
    } else if (report.status === 'generating') {
      Alert.alert('Generating', 'Report is still being generated. Please wait.');
    } else {
      Alert.alert('Error', 'Report is not available for download.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return colors.success;
      case 'generating': return colors.warning;
      case 'failed': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return 'check-circle';
      case 'generating': return 'clock';
      case 'failed': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const renderReport = ({ item }: { item: Report }) => {
    const reportType = reportTypes.find(type => type.id === item.type);
    
    return (
      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => downloadReport(item)}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportIcon}>
            <MaterialCommunityIcons
              name={reportType?.icon || 'file-document'}
              size={24}
              color={reportType?.color || colors.primary}
            />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{item.title}</Text>
            <Text style={styles.reportDateRange}>{item.dateRange}</Text>
            <Text style={styles.reportGeneratedAt}>
              Generated: {new Date(item.generatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.reportStatus}>
            <MaterialCommunityIcons
              name={getStatusIcon(item.status)}
              size={20}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Reports</Text>
        <TouchableOpacity onPress={() => setGenerateModalVisible(true)}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
            <Text style={styles.emptyStateText}>
              Generate your first fleet report to track performance and insights.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => setGenerateModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            {reports.map((report) => (
              <View key={report.id}>
                {renderReport({ item: report })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={generateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGenerateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Report</Text>
              <TouchableOpacity onPress={() => setGenerateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select Report Type</Text>
            {reportTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.reportTypeCard,
                  selectedReportType === type.id && styles.selectedReportTypeCard
                ]}
                onPress={() => setSelectedReportType(type.id)}
              >
                <MaterialCommunityIcons name={type.icon} size={24} color={type.color} />
                <View style={styles.reportTypeInfo}>
                  <Text style={styles.reportTypeTitle}>{type.title}</Text>
                  <Text style={styles.reportTypeDescription}>{type.description}</Text>
                </View>
                {selectedReportType === type.id && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.modalSubtitle}>Date Range (Days)</Text>
            <TextInput
              style={styles.dateRangeInput}
              value={dateRange}
              onChangeText={setDateRange}
              placeholder="30"
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setGenerateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  !selectedReportType && styles.disabledButton
                ]}
                onPress={generateReport}
                disabled={!selectedReportType}
              >
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  reportDateRange: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  reportGeneratedAt: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  reportStatus: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.white,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  reportTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedReportTypeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  reportTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportTypeTitle: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  reportTypeDescription: {
    fontSize: 12,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  dateRangeInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  disabledButton: {
    backgroundColor: colors.text.secondary,
  },
});

export default FleetReportsScreen;
