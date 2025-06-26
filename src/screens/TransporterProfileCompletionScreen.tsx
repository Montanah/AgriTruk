import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../constants/colors';

const initialVehicle = {
  make: '',
  model: '',
  year: '',
  reg: '',
  color: '',
  refrigeration: false,
  humidityControl: false,
  specialCargo: false,
  features: '',
};

const TransporterProfileCompletionScreen = () => {
  const [logbook, setLogbook] = useState(null);
  const [dl, setDL] = useState(null);
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [vehiclePhotos, setVehiclePhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickFile = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.IMAGE, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setter(result.assets[0]);
  };

  const pickVehiclePhotos = async () => {
    if (vehiclePhotos.length >= 5) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType.IMAGE, allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0].uri) setVehiclePhotos([...vehiclePhotos, result.assets[0]]);
  };

  const removeVehiclePhoto = (idx) => {
    setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== idx));
  };

  const isComplete =
    logbook && dl && vehicle.make && vehicle.model && vehicle.year && vehicle.reg && vehiclePhotos.length >= 3;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    // Here you would upload files and save data to Firestore/Storage
    setTimeout(() => {
      setLoading(false);
      // Navigate to TransporterServiceScreen
      navigation.navigate('TransporterServiceScreen');
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Complete Your Transporter Profile</Text>
      <Text style={styles.desc}>Upload required documents and provide vehicle details to start accepting requests.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logbook (PDF or Image)</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickFile(setLogbook)}>
          <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
          <Text style={styles.uploadBtnText}>{logbook ? 'Change File' : 'Upload File'}</Text>
        </TouchableOpacity>
        {logbook && <Text style={styles.fileName}>{logbook.fileName || logbook.uri.split('/').pop()}</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver's License (PDF or Image)</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickFile(setDL)}>
          <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.primary} />
          <Text style={styles.uploadBtnText}>{dl ? 'Change File' : 'Upload File'}</Text>
        </TouchableOpacity>
        {dl && <Text style={styles.fileName}>{dl.fileName || dl.uri.split('/').pop()}</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <TextInput style={styles.input} placeholder="Make" value={vehicle.make} onChangeText={v => setVehicle({ ...vehicle, make: v })} />
        <TextInput style={styles.input} placeholder="Model" value={vehicle.model} onChangeText={v => setVehicle({ ...vehicle, model: v })} />
        <TextInput style={styles.input} placeholder="Year" value={vehicle.year} onChangeText={v => setVehicle({ ...vehicle, year: v })} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Registration Number" value={vehicle.reg} onChangeText={v => setVehicle({ ...vehicle, reg: v })} />
        <TextInput style={styles.input} placeholder="Color" value={vehicle.color} onChangeText={v => setVehicle({ ...vehicle, color: v })} />
        <View style={styles.featuresRow}>
          <TouchableOpacity style={[styles.featureBtn, vehicle.refrigeration && styles.featureBtnActive]} onPress={() => setVehicle({ ...vehicle, refrigeration: !vehicle.refrigeration })}>
            <MaterialCommunityIcons name="snowflake" size={18} color={vehicle.refrigeration ? colors.white : colors.primary} />
            <Text style={[styles.featureText, vehicle.refrigeration && { color: colors.white }]}>Refrigeration</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.featureBtn, vehicle.humidityControl && styles.featureBtnActive]} onPress={() => setVehicle({ ...vehicle, humidityControl: !vehicle.humidityControl })}>
            <MaterialCommunityIcons name="water-percent" size={18} color={vehicle.humidityControl ? colors.white : colors.primary} />
            <Text style={[styles.featureText, vehicle.humidityControl && { color: colors.white }]}>Humidity Control</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.featureBtn, vehicle.specialCargo && styles.featureBtnActive]} onPress={() => setVehicle({ ...vehicle, specialCargo: !vehicle.specialCargo })}>
            <MaterialCommunityIcons name="cube-outline" size={18} color={vehicle.specialCargo ? colors.white : colors.primary} />
            <Text style={[styles.featureText, vehicle.specialCargo && { color: colors.white }]}>Special Cargo</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} placeholder="Other Features (comma separated)" value={vehicle.features} onChangeText={v => setVehicle({ ...vehicle, features: v })} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Photos (3-5)</Text>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.submitBtn, !isComplete && { backgroundColor: colors.text.light }]} onPress={handleSubmit} disabled={!isComplete || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Review</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 8, marginTop: 8 },
  desc: { color: colors.text.secondary, marginBottom: 18 },
  section: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 18, shadowColor: colors.black, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 4 },
  uploadBtnText: { color: colors.primary, marginLeft: 8, fontWeight: 'bold' },
  fileName: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 10, marginVertical: 6, fontSize: 15, borderWidth: 1, borderColor: colors.text.light },
  featuresRow: { flexDirection: 'row', marginTop: 8, marginBottom: 2, gap: 8 },
  featureBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  featureBtnActive: { backgroundColor: colors.primary },
  featureText: { color: colors.primary, marginLeft: 6, fontWeight: '600' },
  photosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  photoWrap: { position: 'relative', marginRight: 8 },
  photo: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#eee' },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.background, borderRadius: 10 },
  addPhotoBtn: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  photoHint: { color: colors.text.light, fontSize: 13, marginTop: 4 },
  error: { color: colors.error, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 18, marginBottom: 24 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default TransporterProfileCompletionScreen;
