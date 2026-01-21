import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import companyDriverService, { CompanyDriver, CompanyInfo } from '../../services/companyDriverService';
import CustomAlert from '../../components/common/CustomAlert';

const CompanyDriverProfileScreen = () => {
  const navigation = useNavigation();
  const [driver, setDriver] = useState<CompanyDriver | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [driverData, companyData] = await Promise.all([
        companyDriverService.getCurrentDriver(),
        companyDriverService.getCompanyInfo(),
      ]);
      
      setDriver(driverData);
      setCompanyInfo(companyData);
    } catch (error) {
      console.error('Error loading data:', error);
      setAlertMessage('Failed to load profile data');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!driver) return;

    try {
      const updatedDriver = await companyDriverService.updateProfile(driver);
      setDriver(updatedDriver);
      setEditing(false);
      setAlertMessage('Profile updated successfully');
      setShowAlert(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlertMessage('Failed to update profile');
      setShowAlert(true);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setAlertMessage('New passwords do not match');
      setShowAlert(true);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setAlertMessage('Password must be at least 6 characters');
      setShowAlert(true);
      return;
    }

    try {
      await companyDriverService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setAlertMessage('Password changed successfully');
      setShowAlert(true);
    } catch (error) {
      console.error('Error changing password:', error);
      setAlertMessage('Failed to change password');
      setShowAlert(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load driver profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {driver.profileImage ? (
            <Image source={{ uri: driver.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.defaultProfileImage}>
              <MaterialCommunityIcons name="account" size={40} color={colors.white} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.driverName}>
            {driver.firstName} {driver.lastName}
          </Text>
          <Text style={styles.companyName}>{companyInfo?.companyName}</Text>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons
              name={getStatusIcon(driver.status)}
              size={16}
              color={getStatusColor(driver.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(driver.status) }]}>
              {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, editing ? styles.saveButton : styles.editButton]}
          onPress={editing ? handleUpdateProfile : () => setEditing(true)}
        >
          <MaterialCommunityIcons
            name={editing ? 'check' : 'pencil'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>
            {editing ? 'Save Changes' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPasswordModal(true)}
        >
          <MaterialCommunityIcons name="key" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
            value={driver.firstName}
            onChangeText={(text) => setDriver({ ...driver, firstName: text })}
            editable={editing}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
            value={driver.lastName}
            onChangeText={(text) => setDriver({ ...driver, lastName: text })}
            editable={editing}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputDisabled]}
            value={driver.email}
            editable={false}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
            value={driver.phone}
            onChangeText={(text) => setDriver({ ...driver, phone: text })}
            editable={editing}
          />
        </View>
      </View>

      {/* Company Information */}
      {companyInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Company Name</Text>
            <Text style={styles.fieldValue}>{companyInfo.companyName}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Registration</Text>
            <Text style={styles.fieldValue}>{companyInfo.companyRegistration}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact</Text>
            <Text style={styles.fieldValue}>{companyInfo.companyContact}</Text>
          </View>
        </View>
      )}

      {/* Driver License Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver License</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>License Number</Text>
          <TextInput
            style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
            value={driver.driverLicense || ''}
            onChangeText={(text) => setDriver({ ...driver, driverLicense: text })}
            editable={editing}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Expiry Date</Text>
          <TextInput
            style={[styles.fieldInput, !editing && styles.fieldInputDisabled]}
            value={driver.driverLicenseExpiryDate || ''}
            onChangeText={(text) => setDriver({ ...driver, driverLicenseExpiryDate: text })}
            editable={editing}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
              secureTextEntry
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangePassword}
              >
                <Text style={styles.confirmButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title="Notification"
        message={alertMessage}
        buttons={[{ text: 'OK', onPress: () => setShowAlert(false) }]}
        onClose={() => setShowAlert(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileImageContainer: {
    marginRight: spacing.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  companyName: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: fonts.size.sm,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  fieldInputDisabled: {
    backgroundColor: colors.background,
    color: colors.text.secondary,
  },
  fieldValue: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
  },
});

export default CompanyDriverProfileScreen;
