import React, { useState } from 'react';
import { Modal, TextInput, Image } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function ManageTransporterScreen({ route }) {
  const transporterType = route?.params?.transporterType || 'company';
  const navigation = useNavigation();
  // Modal state and profile state for individual
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('John Doe');
  const [editPhone, setEditPhone] = useState('+254700111222');
  // Logout handler: navigate to TransporterCompletionScreen
  const handleLogout = () => {
    navigation.navigate('TransporterCompletionScreen');
  };
  const handleSave = () => {
    // TODO: Connect to real save logic
    setEditModal(false);
  };

  // Vehicle modal state and fields for company/broker
  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [refrigeration, setRefrigeration] = useState(false);
  const [humidityControl, setHumidityControl] = useState(false);
  const [specialCargo, setSpecialCargo] = useState(false);
  const [vehicleFeatures, setVehicleFeatures] = useState('');
  const [logbook, setLogbook] = useState(null);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [insurance, setInsurance] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Driver modal state and fields
  const [driverModal, setDriverModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPhoto, setDriverPhoto] = useState(null);
  const [driverLicense, setDriverLicense] = useState(null);
  const pickDriverPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.IMAGE, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setDriverPhoto(result.assets[0]);
  };
  const pickDriverLicense = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.ALL, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setDriverLicense(result.assets[0]);
  };
  const handleAddDriver = () => {
    // TODO: Save driver to backend
    setDriverModal(false);
    setDriverName(''); setDriverPhone(''); setDriverPhoto(null); setDriverLicense(null);
  };

  const pickLogbook = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.ALL, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setLogbook(result.assets[0]);
  };
  const pickVehiclePhotos = async () => {
    if (vehiclePhotos.length >= 5) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.IMAGE, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setVehiclePhotos([...vehiclePhotos, result.assets[0]]);
  };
  const pickInsurance = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.ALL, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setInsurance(result.assets[0]);
  };
  const removeVehiclePhoto = (idx) => {
    setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== idx));
  };
  const handleAddVehicle = () => {
    // TODO: Save vehicle to backend
    setVehicleModal(false);
    // Reset fields
    setVehicleType(''); setVehicleReg('');
    setRefrigeration(false); setHumidityControl(false); setSpecialCargo(false); setVehicleFeatures(''); setLogbook(null); setInsurance(null); setVehiclePhotos([]);
  };

  if (transporterType === 'company') {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={[styles.container, { paddingTop: 32 }]}>
        <Text style={styles.title}>Manage Vehicles, Drivers, Assignments</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicles</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setVehicleModal(true)}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Add Vehicle</Text>
          </TouchableOpacity>
          <Text style={styles.value}>- KDA 123A (Truck)</Text>
          <Text style={styles.value}>- KDB 456B (Van)</Text>
        </View>
        {/* Add Vehicle Modal */}
        <Modal
          visible={vehicleModal}
          animationType="slide"
          transparent
          onRequestClose={() => setVehicleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={{width: '100%'}} contentContainerStyle={{alignItems: 'center', justifyContent: 'center'}}>
              <View style={styles.vehicleModalCard}>
                <Text style={styles.editTitle}>Add Vehicle</Text>
                {/* Vehicle Type Dropdown */}
                <View style={styles.inputDropdownWrap}>
                  <Text style={styles.inputDropdownLabel}>Vehicle Type</Text>
                  <TouchableOpacity style={styles.inputDropdown} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
                    <Text style={{ color: vehicleType ? colors.text.primary : colors.text.light }}>
                      {vehicleType || 'Select vehicle type'}
                    </Text>
                    <Ionicons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                  {showTypeDropdown && (
                    <View style={styles.dropdownList}>
                      {['Truck', 'Van', 'Refrigerated Van', 'Flatbed', 'Tanker', 'Pickup', 'Trailer'].map(type => (
                        <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setVehicleType(type); setShowTypeDropdown(false); }}>
                          <Text style={{ color: colors.text.primary }}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <TextInput style={styles.input} placeholder="Registration Number" value={vehicleReg} onChangeText={setVehicleReg} />
                <View style={styles.featuresRow}>
                  <TouchableOpacity style={[styles.featureBtn, refrigeration && styles.featureBtnActive]} onPress={() => setRefrigeration(!refrigeration)}>
                    <MaterialCommunityIcons name="snowflake" size={18} color={refrigeration ? colors.white : colors.primary} />
                    <Text style={[styles.featureText, refrigeration && { color: colors.white }]}>Refrigeration</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.featureBtn, humidityControl && styles.featureBtnActive]} onPress={() => setHumidityControl(!humidityControl)}>
                    <MaterialCommunityIcons name="water-percent" size={18} color={humidityControl ? colors.white : colors.primary} />
                    <Text style={[styles.featureText, humidityControl && { color: colors.white }]}>Humidity Control</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.featureBtn, specialCargo && styles.featureBtnActive]} onPress={() => setSpecialCargo(!specialCargo)}>
                    <MaterialCommunityIcons name="cube-outline" size={18} color={specialCargo ? colors.white : colors.primary} />
                    <Text style={[styles.featureText, specialCargo && { color: colors.white }]}>Special Cargo</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.input} placeholder="Other Features (comma separated)" value={vehicleFeatures} onChangeText={setVehicleFeatures} />
                <View style={styles.section}>
                  <Text style={styles.editLabel}>Logbook (PDF or Image)</Text>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickLogbook}>
                    <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                    <Text style={styles.uploadBtnText}>{logbook ? 'Change File' : 'Upload File'}</Text>
                  </TouchableOpacity>
                  {logbook && <Text style={styles.fileName}>{logbook.fileName || logbook.uri?.split('/').pop()}</Text>}
                </View>
                <View style={styles.section}>
                  <Text style={styles.editLabel}>Insurance Document (PDF or Image)</Text>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickInsurance}>
                    <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
                    <Text style={styles.uploadBtnText}>{insurance ? 'Change File' : 'Upload File'}</Text>
                  </TouchableOpacity>
                  {insurance && <Text style={styles.fileName}>{insurance.fileName || insurance.uri?.split('/').pop()}</Text>}
                </View>
                <View style={styles.section}>
                  <Text style={styles.editLabel}>Vehicle Photos (3-5)</Text>
                  <View style={styles.photosRow}>
                    {vehiclePhotos.map((photo, idx) => (
                      <View key={idx} style={styles.photoWrap}>
                        <Image source={{ uri: photo.uri }} style={styles.photo} />
                        <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeVehiclePhoto(idx)}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {vehiclePhotos.length < 5 && (
                      <TouchableOpacity style={styles.addPhotoBtn} onPress={pickVehiclePhotos}>
                        <Ionicons name="add" size={28} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.photoHint}>Add at least 3 photos</Text>
                </View>
                <View style={styles.editActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setVehicleModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddVehicle}>
                    <Text style={styles.saveText}>Add Vehicle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
        <View style={styles.card}>
        <Text style={styles.sectionTitle}>Drivers</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setDriverModal(true)}>
        <Ionicons name="add-circle" size={20} color={colors.primary} />
        <Text style={styles.actionText}>Add Driver</Text>
        </TouchableOpacity>
        <Text style={styles.value}>- John Doe</Text>
        <Text style={styles.value}>- Jane Smith</Text>
        </View>
        {/* Add Driver Modal */}
        <Modal
        visible={driverModal}
        animationType="slide"
        transparent
        onRequestClose={() => setDriverModal(false)}
        >
        <View style={styles.modalOverlay}>
        <ScrollView style={{width: '100%'}} contentContainerStyle={{alignItems: 'center', justifyContent: 'center'}}>
        <View style={styles.vehicleModalCard}>
        <Text style={styles.editTitle}>Add Driver</Text>
        <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 16 }} onPress={pickDriverPhoto}>
        {driverPhoto ? (
        <Image source={{ uri: driverPhoto.uri }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background }} />
        ) : (
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="person-circle-outline" size={60} color={colors.text.light} />
        </View>
        )}
        <Text style={{ color: colors.primary, marginTop: 6, textAlign: 'center' }}>Upload Profile Photo</Text>
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="Driver Name" value={driverName} onChangeText={setDriverName} />
        <TextInput style={styles.input} placeholder="Phone Number" value={driverPhone} onChangeText={setDriverPhone} />
        <View style={styles.section}>
        <Text style={styles.editLabel}>License Document (PDF or Image)</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickDriverLicense}>
        <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
        <Text style={styles.uploadBtnText}>{driverLicense ? 'Change File' : 'Upload File'}</Text>
        </TouchableOpacity>
        {driverLicense && <Text style={styles.fileName}>{driverLicense.fileName || driverLicense.uri?.split('/').pop()}</Text>}
        </View>
        <View style={styles.editActionsRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setDriverModal(false)}>
        <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleAddDriver}>
        <Text style={styles.saveText}>Add Driver</Text>
        </TouchableOpacity>
        </View>
        </View>
        </ScrollView>
        </View>
        </Modal>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assignments</Text>
          <Text style={styles.value}>Depot X → Market Z: John Doe</Text>
          <Text style={styles.value}>Farm Y → Shop Q: Jane Smith</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Outsourcing</Text>
          <Text style={styles.value}>You can outsource jobs to other registered transporters.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Company Profile</Text>
          <TouchableOpacity style={styles.actionBtn}><MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} /><Text style={styles.actionText}>Edit Profile</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  } else {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Manage My Vehicle & Profile</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <TouchableOpacity style={styles.actionBtn}><Ionicons name="create-outline" size={20} color={colors.primary} /><Text style={styles.actionText}>Edit Vehicle</Text></TouchableOpacity>
          <Text style={styles.value}>KDA 123A (Truck)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setEditModal(true)}>
            <MaterialCommunityIcons name="account-edit" size={20} color={colors.secondary} />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <Text style={styles.value}>Name: John Doe</Text>
          <Text style={styles.value}>Phone: +254700111222</Text>
          <TouchableOpacity style={[styles.actionBtn, {marginTop: 10}]} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text style={[styles.actionText, {color: colors.error}]}>Logout</Text>
          </TouchableOpacity>
        </View>
        {/* Edit Profile Modal */}
        <Modal
          visible={editModal}
          animationType="slide"
          transparent
          onRequestClose={() => setEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalCard}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                />
              </View>
              <View style={styles.editDivider} />
              <View style={styles.editFieldWrap}>
                <Text style={styles.editLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                />
              </View>
              <View style={styles.editActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  container: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 18, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  value: { fontSize: 15, color: colors.text.primary, marginBottom: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  actionText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  editModalCard: { backgroundColor: colors.white, borderRadius: 22, padding: 22, width: '92%', shadowColor: colors.black, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  editTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 16, textAlign: 'center' },
  editFieldWrap: { marginBottom: 10, width: '100%' },
  editLabel: { color: colors.text.secondary, fontWeight: '600', marginBottom: 4, fontSize: 14 },
  editDivider: { height: 1, backgroundColor: colors.background, marginVertical: 6, width: '100%' },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.text.light, marginRight: 8 },
  cancelText: { color: colors.error, fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold' },
  vehicleModalCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    width: '96%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 60, // More space from top bar
    marginBottom: 40,
  },
  section: { backgroundColor: colors.background, borderRadius: 12, padding: 10, marginBottom: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 4 },
  uploadBtnText: { color: colors.primary, marginLeft: 8, fontWeight: 'bold' },
  fileName: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 2,
    gap: 8,
    justifyContent: 'flex-start',
  },
  featureBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  featureBtnActive: { backgroundColor: colors.primary },
  featureText: { color: colors.primary, marginLeft: 6, fontWeight: '600' },
  photosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  photoWrap: { position: 'relative', marginRight: 8 },
  photo: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#eee' },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.background, borderRadius: 10 },
  addPhotoBtn: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  photoHint: { color: colors.text.light, fontSize: 13, marginTop: 4 },
});
