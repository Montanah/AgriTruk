import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';
import colors from '../constants/colors';
import { auth, db } from '../firebaseConfig';

const mockSubscription = {
  plan: 'Monthly',
  status: 'Active',
  renewal: '2024-07-01',
};
const planOptions = [
  { key: 'basic', label: 'Basic', price: 'Free', features: ['Limited requests', 'No analytics'] },
  { key: 'pro', label: 'Pro', price: 'Ksh 2,000/mo', features: ['Unlimited requests', 'Analytics', 'Priority support'] },
  { key: 'enterprise', label: 'Enterprise', price: 'Contact Us', features: ['Custom features', 'Dedicated support'] },
];

export default function BrokerProfileScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('monthly');
  const [currentSub, setCurrentSub] = useState(mockSubscription);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.IMAGE, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setProfilePhoto(result.assets[0]);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || '');
            setEmail(data.email || user.email || '');
            setPhone(data.phone || '');
          } else {
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhone('');
          }
        }
      } catch (e) {
        setName(''); setEmail(''); setPhone('');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTimeout(() => {
        navigation.navigate('Welcome');
      }, 100);
    } catch (error) {
      Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    }
  };

  const handleSave = async () => {
    setEditing(false);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          name,
          email,
          phone,
        });
        Alert.alert('Profile Updated', 'Your profile details have been updated.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleChangePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Error', 'Please fill all password fields.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    setShowPwdModal(false);
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    Alert.alert('Password Changed', 'Your password has been updated (mocked).');
  };

  const handlePlanChange = (planKey: string) => {
    setCurrentPlan(planKey);
    setCurrentSub({
      plan: planOptions.find(p => p.key === planKey)?.label || 'Pro',
      status: 'Active',
      renewal: '2024-07-01',
    });
    setShowPlanModal(false);
    Alert.alert('Plan Updated', `Your plan has been changed to ${planOptions.find(p => p.key === planKey)?.label}`);
  };

  const insets = require('react-native-safe-area-context').useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.bg}>
      <ScrollView contentContainerStyle={{ paddingBottom: 68 + (insets?.bottom || 0) }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              <TouchableOpacity
                style={{ alignSelf: 'center', marginBottom: 16 }}
                onPress={editing ? pickProfilePhoto : undefined}
                activeOpacity={editing ? 0.7 : 1}
              >
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto.uri || profilePhoto }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
                ) : (
                  <MaterialCommunityIcons name="account-circle" size={80} color={colors.primary} />
                )}
                {editing && <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo</Text>}
              </TouchableOpacity>
              {editing ? (
                <>
                  <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
                  <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.profileName}>{name}</Text>
                  <Text style={styles.profileInfo}>{email}</Text>
                  <Text style={styles.profileInfo}>{phone}</Text>
                  <Text style={styles.profileRole}><Text style={{ color: colors.secondary, fontWeight: 'bold' }}>Broker</Text></Text>
                  <Text style={styles.profileInfo}>Last Login: 2024-06-12 09:30</Text>
                  <View style={styles.profileActionsRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                      <MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} />
                      <Text style={styles.editText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editBtn} onPress={() => setShowPwdModal(true)}>
                      <Ionicons name="key-outline" size={20} color={colors.primaryDark} />
                      <Text style={styles.editText}>Change Password</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </View>
        {/* Subscription Card */}
        <View style={styles.subscriptionCard}>
          <MaterialCommunityIcons name="star-circle" size={32} color={colors.secondary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.subPlan}>{currentSub.plan} Plan</Text>
            <Text style={styles.subStatus}>{currentSub.status} • Renews {currentSub.renewal}</Text>
          </View>
          <TouchableOpacity style={styles.subManageBtn} onPress={() => setShowPlanModal(true)}>
            <Text style={styles.subManageText}>Manage</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Change Password Modal */}
      <Modal visible={showPwdModal} animationType="slide" transparent onRequestClose={() => setShowPwdModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.input} value={currentPwd} onChangeText={setCurrentPwd} placeholder="Current Password" secureTextEntry />
            <TextInput style={styles.input} value={newPwd} onChangeText={setNewPwd} placeholder="New Password" secureTextEntry />
            <TextInput style={styles.input} value={confirmPwd} onChangeText={setConfirmPwd} placeholder="Confirm New Password" secureTextEntry />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPwdModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}>
                <Text style={styles.saveText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Manage Plan Modal */}
      {showPlanModal && (
        <SubscriptionModal
          selectedPlan={currentPlan}
          setSelectedPlan={setCurrentPlan}
          onClose={() => setShowPlanModal(false)}
          onSubscribe={() => {
            let planLabel = 'Monthly';
            if (currentPlan === 'quarterly') planLabel = 'Quarterly';
            if (currentPlan === 'annual') planLabel = 'Annual';
            setCurrentSub({
              plan: planLabel,
              status: 'Active',
              renewal: '2024-07-01',
            });
            setShowPlanModal(false);
            Alert.alert('Plan Updated', `Your plan has been changed to ${planLabel}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background, padding: 18 },
  profileCard: { backgroundColor: colors.white, borderRadius: 18, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: colors.black, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginBottom: 24 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  profileInfo: { fontSize: 16, color: colors.text.secondary, marginBottom: 2 },
  profileRole: { fontSize: 15, color: colors.primaryDark, marginBottom: 2, fontWeight: 'bold' },
  loadingText: { fontSize: 16, color: colors.text.secondary, marginBottom: 8 },
  profileActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: colors.secondary, marginHorizontal: 4 },
  editText: { color: colors.secondary, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light, width: '100%' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 80 },
  saveText: { color: colors.white, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.text.light, minWidth: 80 },
  cancelText: { color: colors.error, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.text.light, marginTop: 12, alignSelf: 'center' },
  logoutText: { color: colors.error, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  subscriptionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 400, alignSelf: 'center', elevation: 1, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 6 },
  subPlan: { fontWeight: 'bold', color: colors.secondary, fontSize: 16 },
  subStatus: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  subManageBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginLeft: 10 },
  subManageText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  planOption: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.text.light },
  planOptionActive: { borderColor: colors.secondary, backgroundColor: colors.background },
  planLabel: { fontWeight: 'bold', fontSize: 16, marginRight: 10 },
  planPrice: { color: colors.text.secondary, fontWeight: 'bold', marginLeft: 'auto', fontSize: 15 },
  planFeature: { color: colors.text.secondary, fontSize: 13, marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, borderRadius: 18, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
});
