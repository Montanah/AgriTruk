import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { auth } from '../firebaseConfig';
import { signOut, updatePassword } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

// db is imported from config

const AccountScreen = () => {
  const user = auth.currentUser;
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [changePwd, setChangePwd] = useState(false);
  // const [newPwd, setNewPwd] = useState(''); // removed duplicate
  const [complaint, setComplaint] = useState('');
  const [complaintSent, setComplaintSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Password change fields
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    let didCancel = false;
    let timeout: any;
    if (user?.uid) {
      // Fetch user profile
      timeout = setTimeout(() => {
        if (!didCancel) setProfile('timeout');
      }, 8000);
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        if (didCancel) return;
        clearTimeout(timeout);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
          setPhotoURL(data.profilePhotoUrl || '');
          setRole(data.role || '');
          setEmail(data.email || user.email || '');
        } else {
          setProfile('notfound');
        }
      }).catch((e) => {
        if (!didCancel) setProfile('error');
      });
    }
    return () => { didCancel = true; clearTimeout(timeout); };
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          name,
          phone,
          profilePhotoUrl: photoURL,
        });
        setEditing(false);
        setProfile({ ...profile, name, phone, profilePhotoUrl: photoURL });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update profile.');
    }
    setLoading(false);
  };

  const handlePhotoPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access media library is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      const newUri = result.assets[0].uri;
      setPhotoURL(newUri);
      setLoading(true);
      setError('');
      try {
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            profilePhotoUrl: newUri,
          });
          setProfile((prev: any) => ({ ...prev, profilePhotoUrl: newUri }));
        }
      } catch (e: any) {
        setError(e.message || 'Failed to update profile photo.');
      }
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      setError(e.message || 'Logout failed.');
    }
  };

  const handleComplaint = () => {
    setComplaintSent(true);
    setComplaint('');
  };

  const handleChangePassword = async () => {
    setError('');
    setLoading(true);
    try {
      if (user && newPwd) {
        await updatePassword(user, newPwd);
        setChangePwd(false);
        setNewPwd('');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to change password.');
    }
    setLoading(false);
  };

  if (!profile || profile === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 24, color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
          {user?.uid ? 'Loading your profile...' : 'No user found. Please log in.'}
        </Text>
      </View>
    );
  }
  if (profile === 'notfound') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: colors.error, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Profile Not Found</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
          No user profile exists for your account. Please contact support or try signing up again.
        </Text>
      </View>
    );
  }
  if (profile === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: colors.error, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Error Loading Profile</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
          There was a problem loading your profile. Please check your connection or try again later.
        </Text>
      </View>
    );
  }
  if (profile === 'timeout') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: colors.error, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Profile Load Timeout</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 16, textAlign: 'center' }}>
          Loading your profile took too long. Please check your connection or try again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 0 }}>
      {/* Profile Card */}
      <View style={styles.profileCardWrap}>
        <View style={styles.profileCardShadow} />
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePhotoPick} style={styles.profilePhotoWrap}>
            <Image
              source={photoURL ? { uri: photoURL } : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
              style={styles.profilePhoto}
            />
            {editing && <Text style={styles.editPhoto}>Edit Photo</Text>}
          </TouchableOpacity>
          <View style={styles.profileInfoWrap}>
            {/* Modal for editing profile */}
            <Modal
              visible={editing}
              animationType="slide"
              transparent
              onRequestClose={() => setEditing(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.editModalCard}>
                  <Text style={styles.editTitle}>Edit Profile</Text>
                  <View style={styles.editPhotoWrap}>
                    <TouchableOpacity onPress={handlePhotoPick} style={styles.editPhotoBtn}>
                      <Image
                        source={photoURL ? { uri: photoURL } : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }}
                        style={styles.editPhotoImg}
                      />
                      <View style={styles.editPhotoOverlay}>
                        <Ionicons name="camera" size={22} color={colors.white} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editFieldWrap}>
                    <Text style={styles.editLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Full Name"
                    />
                  </View>
                  <View style={styles.editDivider} />
                  <View style={styles.editFieldWrap}>
                    <Text style={styles.editLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text.light }]}
                      value={email}
                      editable={false}
                      placeholder="Email"
                    />
                  </View>
                  <View style={styles.editDivider} />
                  <View style={styles.editFieldWrap}>
                    <Text style={styles.editLabel}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Phone"
                    />
                  </View>
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                      <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
            {/* End Modal */}
            {!editing && (
              <>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.role}>{role && `${role.charAt(0).toUpperCase() + role.slice(1)}`}</Text>
                <Text style={styles.info}>{email}</Text>
                <Text style={styles.info}>{phone}</Text>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.editText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.actionBtnText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setChangePwd((v) => !v)}>
          <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
          <Text style={styles.actionBtnText}>Change Password</Text>
        </TouchableOpacity>
      </View>
      {/* Password Change Modal */}
      <Modal
        visible={changePwd}
        animationType="slide"
        transparent
        onRequestClose={() => setChangePwd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pwdModal}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>Current Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={oldPwd}
                  onChangeText={setOldPwd}
                  placeholder="Current Password"
                  secureTextEntry={!showOldPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.pwdEyeIconCenter} onPress={() => setShowOldPwd((v) => !v)}>
                <Ionicons name={showOldPwd ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.editDivider} />
            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>New Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  placeholder="New Password"
                  secureTextEntry={!showNewPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.pwdEyeIconCenter} onPress={() => setShowNewPwd((v) => !v)}>
                <Ionicons name={showNewPwd ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.editDivider} />
            <View style={styles.editFieldWrapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.editLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.inputPwd}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Confirm New Password"
                  secureTextEntry={!showConfirmPwd}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.pwdEyeIconCenter} onPress={() => setShowConfirmPwd((v) => !v)}>
                <Ionicons name={showConfirmPwd ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setChangePwd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
                <Text style={styles.saveText}>{loading ? 'Saving...' : 'Change Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* End Password Change Modal */}
      {error ? <Text style={{ color: colors.error, marginTop: 10, textAlign: 'center', fontWeight: '600' }}>{error}</Text> : null}
      {/* Conflict Resolution Card */}
      <View style={styles.conflictCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.secondary} />
          <Text style={styles.sectionTitle}>  Conflict Resolution</Text>
        </View>
        <Text style={styles.sectionDesc}>Submit a complaint for admin mediation. You will be contacted via email and in-app. (History coming soon)</Text>
        <TextInput
          style={styles.input}
          value={complaint}
          onChangeText={setComplaint}
          placeholder="Describe your issue..."
          multiline
        />
        <TouchableOpacity style={styles.complainBtn} onPress={handleComplaint} disabled={!complaint}>
          <Text style={styles.complainText}>Send Complaint</Text>
        </TouchableOpacity>
        {complaintSent && <Text style={styles.complaintSent}>Complaint sent! Admin will contact you soon.</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileCardWrap: { alignItems: 'center', marginBottom: 24, marginTop: 24, position: 'relative' },
  profileCardShadow: { position: 'absolute', top: 18, left: 0, right: 0, height: 180, backgroundColor: colors.primaryDark, borderRadius: 24, opacity: 0.12, zIndex: 0 },
  profileCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, width: '95%', maxWidth: 420, alignItems: 'center', shadowColor: colors.black, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, zIndex: 1, flexDirection: 'row' },
  profilePhotoWrap: { marginRight: 18, alignItems: 'center' },
  profilePhoto: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.background, marginBottom: 8, borderWidth: 2, borderColor: colors.primary },
  editPhoto: { color: colors.primary, fontSize: 13, marginBottom: 8 },
  profileInfoWrap: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  editModalCard: { backgroundColor: colors.white, borderRadius: 22, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  editTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  editPhotoWrap: { alignItems: 'center', marginBottom: 18 },
  editPhotoBtn: { position: 'relative' },
  editPhotoImg: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.background },
  editPhotoOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 16, padding: 6, borderWidth: 2, borderColor: colors.white },
  editFieldWrap: { marginBottom: 10, width: '100%' },
  editLabel: { color: colors.text.secondary, fontWeight: '600', marginBottom: 4, fontSize: 14 },
  editDivider: { height: 1, backgroundColor: colors.background, marginVertical: 6, width: '100%' },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  profilePhoto: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.background, marginBottom: 8 },
  editPhoto: { color: colors.primary, fontSize: 13, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 2, color: colors.primaryDark },
  role: { fontSize: 15, color: colors.secondary, fontWeight: 'bold', marginBottom: 6, textTransform: 'capitalize' },
  info: { fontSize: 15, color: colors.text.light, marginBottom: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  editText: { color: colors.primary, marginLeft: 4, fontWeight: '600' },
  input: { backgroundColor: colors.white, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 16, borderWidth: 1, borderColor: colors.background },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 6, shadowColor: colors.black, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  actionBtnText: { color: colors.primaryDark, marginLeft: 8, fontWeight: 'bold', fontSize: 15 },
  pwdModal: { width: '95%', backgroundColor: colors.surface, borderRadius: 18, padding: 22, alignItems: 'center', alignSelf: 'center', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  inputPwd: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 16, borderWidth: 1, borderColor: colors.text.light, width: '100%', color: colors.text.primary, paddingRight: 40 },
  pwdEyeIcon: { position: 'absolute', right: 12, top: 18, zIndex: 10 },
  pwdEyeIconCenter: { justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 8 },
  editFieldWrapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '100%' },
  conflictCard: { backgroundColor: colors.white, borderRadius: 18, padding: 18, margin: 18, marginBottom: 32, shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: colors.primaryDark },
  sectionDesc: { fontSize: 14, color: colors.text.light, marginBottom: 10 },
  complainBtn: { backgroundColor: colors.secondary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  complainText: { color: colors.white, fontWeight: 'bold' },
  complaintSent: { color: colors.success, marginTop: 8, fontWeight: '600' },
});

export default AccountScreen;
