import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface ShipperProfileData {
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    businessType?: string;
    address: string;
    city: string;
    country: string;
    profilePhoto: any;
    verificationStatus: 'pending' | 'verified' | 'unverified';
    memberSince: string;
    totalShipments: number;
    completedShipments: number;
    activeShipments: number;
    rating: number;
    preferences: {
        preferredTransporterTypes: string[];
        preferredRoutes: string[];
        notificationSettings: {
            email: boolean;
            push: boolean;
            sms: boolean;
        };
    };
}

const ShipperProfileScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    
    const [profileData, setProfileData] = useState<ShipperProfileData>({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        businessType: '',
        address: '',
        city: '',
        country: '',
        profilePhoto: null,
        verificationStatus: 'pending',
        memberSince: '',
        totalShipments: 0,
        completedShipments: 0,
        activeShipments: 0,
        rating: 0,
        preferences: {
            preferredTransporterTypes: [],
            preferredRoutes: [],
            notificationSettings: {
                email: true,
                push: true,
                sms: false,
            },
        },
    });

    const [editData, setEditData] = useState<ShipperProfileData>({ ...profileData });

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const profile: ShipperProfileData = {
                        name: data.name || user.displayName || '',
                        email: data.email || user.email || '',
                        phone: data.phone || '',
                        companyName: data.companyName || '',
                        businessType: data.businessType || '',
                        address: data.address || '',
                        city: data.city || '',
                        country: data.country || 'Kenya',
                        profilePhoto: data.profilePhoto || null,
                        verificationStatus: data.verificationStatus || 'pending',
                        memberSince: data.memberSince || new Date().toISOString(),
                        totalShipments: data.totalShipments || 0,
                        completedShipments: data.completedShipments || 0,
                        activeShipments: data.activeShipments || 0,
                        rating: data.rating || 0,
                        preferences: data.preferences || {
                            preferredTransporterTypes: [],
                            preferredRoutes: [],
                            notificationSettings: {
                                email: true,
                                push: true,
                                sms: false,
                            },
                        },
                    };
                    setProfileData(profile);
                    setEditData(profile);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProfileData();
        setRefreshing(false);
    };

    const pickProfilePhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setEditData({ ...editData, profilePhoto: result.assets[0] });
        }
    };

    const handleSave = async () => {
        if (!editData.name.trim() || !editData.email.trim()) {
            Alert.alert('Error', 'Name and email are required');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                await updateDoc(doc(db, 'users', user.uid), {
                    name: editData.name,
                    email: editData.email,
                    phone: editData.phone,
                    companyName: editData.companyName,
                    businessType: editData.businessType,
                    address: editData.address,
                    city: editData.city,
                    country: editData.country,
                    profilePhoto: editData.profilePhoto,
                    preferences: editData.preferences,
                    updatedAt: new Date().toISOString(),
                });

                setProfileData(editData);
                setEditing(false);
                Alert.alert('Success', 'Profile updated successfully');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditData(profileData);
        setEditing(false);
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Welcome' }],
                            });
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    const getVerificationColor = (status: string) => {
        switch (status) {
            case 'verified':
                return colors.success;
            case 'pending':
                return colors.warning;
            case 'unverified':
                return colors.error;
            default:
                return colors.text.secondary;
        }
    };

    const getVerificationIcon = (status: string) => {
        switch (status) {
            case 'verified':
                return 'check-circle';
            case 'pending':
                return 'clock';
            case 'unverified':
                return 'alert-circle';
            default:
                return 'help-circle';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Shipper Profile</Text>
                    <TouchableOpacity
                        onPress={() => setEditing(!editing)}
                        style={styles.editButton}
                    >
                        <MaterialCommunityIcons
                            name={editing ? "close" : "pencil"}
                            size={24}
                            color={colors.white}
                        />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Profile Header Card */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.profilePhotoContainer}>
                        <TouchableOpacity
                            style={styles.profilePhoto}
                            onPress={editing ? pickProfilePhoto : undefined}
                            disabled={!editing}
                        >
                            {editData.profilePhoto ? (
                                <Image
                                    source={{ uri: editData.profilePhoto.uri || editData.profilePhoto }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name="account-circle"
                                    size={80}
                                    color={colors.primary}
                                />
                            )}
                            {editing && (
                                <View style={styles.editPhotoOverlay}>
                                    <MaterialCommunityIcons
                                        name="camera"
                                        size={24}
                                        color={colors.white}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                        
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {editing ? editData.name : profileData.name}
                            </Text>
                            <Text style={styles.profileEmail}>
                                {editing ? editData.email : profileData.email}
                            </Text>
                            <View style={styles.verificationBadge}>
                                <MaterialCommunityIcons
                                    name={getVerificationIcon(profileData.verificationStatus)}
                                    size={16}
                                    color={getVerificationColor(profileData.verificationStatus)}
                                />
                                <Text style={[
                                    styles.verificationText,
                                    { color: getVerificationColor(profileData.verificationStatus) }
                                ]}>
                                    {profileData.verificationStatus.charAt(0).toUpperCase() + 
                                     profileData.verificationStatus.slice(1)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {editing && (
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.saveButton]}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                                )}
                                <Text style={styles.actionButtonText}>Save</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={handleCancel}
                            >
                                <MaterialCommunityIcons name="close" size={20} color={colors.error} />
                                <Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Statistics Cards */}
                <View style={styles.statsContainer}>
                    <TouchableOpacity
                        style={styles.statsCard}
                        onPress={() => setShowStatsModal(true)}
                    >
                        <View style={styles.statsHeader}>
                            <MaterialCommunityIcons name="truck-delivery" size={24} color={colors.primary} />
                            <Text style={styles.statsTitle}>Shipment Overview</Text>
                        </View>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{profileData.totalShipments}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{profileData.completedShipments}</Text>
                                <Text style={styles.statLabel}>Completed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{profileData.activeShipments}</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                        </View>
                        <View style={styles.ratingContainer}>
                            <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                            <Text style={styles.ratingText}>{profileData.rating.toFixed(1)}</Text>
                            <Text style={styles.ratingLabel}>Rating</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Profile Details */}
                <View style={styles.detailsCard}>
                    <Text style={styles.sectionTitle}>Profile Details</Text>
                    
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.name}
                                onChangeText={(text) => setEditData({ ...editData, name: text })}
                                placeholder="Enter your full name"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.name}</Text>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.email}
                                onChangeText={(text) => setEditData({ ...editData, email: text })}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.email}</Text>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.phone}
                                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                                placeholder="Enter your phone number"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.phone || 'Not provided'}</Text>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Company Name (Optional)</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.companyName}
                                onChangeText={(text) => setEditData({ ...editData, companyName: text })}
                                placeholder="Enter company name"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.companyName || 'Not provided'}</Text>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Business Type</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.businessType}
                                onChangeText={(text) => setEditData({ ...editData, businessType: text })}
                                placeholder="e.g., Agriculture, Manufacturing, Retail"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.businessType || 'Not specified'}</Text>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Address</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={editData.address}
                                onChangeText={(text) => setEditData({ ...editData, address: text })}
                                placeholder="Enter your address"
                                multiline
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profileData.address || 'Not provided'}</Text>
                        )}
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.sm }]}>
                            <Text style={styles.fieldLabel}>City</Text>
                            {editing ? (
                                <TextInput
                                    style={styles.input}
                                    value={editData.city}
                                    onChangeText={(text) => setEditData({ ...editData, city: text })}
                                    placeholder="Enter city"
                                />
                            ) : (
                                <Text style={styles.fieldValue}>{profileData.city || 'Not provided'}</Text>
                            )}
                        </View>

                        <View style={[styles.fieldGroup, { flex: 1, marginLeft: spacing.sm }]}>
                            <Text style={styles.fieldLabel}>Country</Text>
                            {editing ? (
                                <TextInput
                                    style={styles.input}
                                    value={editData.country}
                                    onChangeText={(text) => setEditData({ ...editData, country: text })}
                                    placeholder="Enter country"
                                />
                            ) : (
                                <Text style={styles.fieldValue}>{profileData.country}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Member Since</Text>
                        <Text style={styles.fieldValue}>
                            {formatDate(profileData.memberSince)}
                        </Text>
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.preferencesCard}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    
                    <View style={styles.preferenceSection}>
                        <Text style={styles.preferenceLabel}>Preferred Transporter Types</Text>
                        <View style={styles.preferenceChips}>
                            {profileData.preferences.preferredTransporterTypes.length > 0 ? (
                                profileData.preferences.preferredTransporterTypes.map((type, index) => (
                                    <View key={index} style={styles.preferenceChip}>
                                        <Text style={styles.preferenceChipText}>{type}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noPreferencesText}>No preferences set</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.preferenceSection}>
                        <Text style={styles.preferenceLabel}>Preferred Routes</Text>
                        <View style={styles.preferenceChips}>
                            {profileData.preferences.preferredRoutes.length > 0 ? (
                                profileData.preferences.preferredRoutes.map((route, index) => (
                                    <View key={index} style={styles.preferenceChip}>
                                        <Text style={styles.preferenceChipText}>{route}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noPreferencesText}>No routes specified</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.preferenceSection}>
                        <Text style={styles.preferenceLabel}>Notification Settings</Text>
                        <View style={styles.notificationSettings}>
                            <View style={styles.notificationRow}>
                                <Text style={styles.notificationLabel}>Email Notifications</Text>
                                <View style={[
                                    styles.notificationToggle,
                                    profileData.preferences.notificationSettings.email && styles.notificationActive
                                ]}>
                                    <MaterialCommunityIcons
                                        name={profileData.preferences.notificationSettings.email ? "check" : "close"}
                                        size={16}
                                        color={profileData.preferences.notificationSettings.email ? colors.success : colors.error}
                                    />
                                </View>
                            </View>
                            <View style={styles.notificationRow}>
                                <Text style={styles.notificationLabel}>Push Notifications</Text>
                                <View style={[
                                    styles.notificationToggle,
                                    profileData.preferences.notificationSettings.push && styles.notificationActive
                                ]}>
                                    <MaterialCommunityIcons
                                        name={profileData.preferences.notificationSettings.push ? "check" : "close"}
                                        size={16}
                                        color={profileData.preferences.notificationSettings.push ? colors.success : colors.error}
                                    />
                                </View>
                            </View>
                            <View style={styles.notificationRow}>
                                <Text style={styles.notificationLabel}>SMS Notifications</Text>
                                <View style={[
                                    styles.notificationToggle,
                                    profileData.preferences.notificationSettings.sms && styles.notificationActive
                                ]}>
                                    <MaterialCommunityIcons
                                        name={profileData.preferences.notificationSettings.sms ? "check" : "close"}
                                        size={16}
                                        color={profileData.preferences.notificationSettings.sms ? colors.success : colors.error}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={() => navigation.navigate('ServiceRequest', { mode: 'shipper' })}
                    >
                        <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
                        <Text style={styles.actionButtonText}>New Transport Request</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => navigation.navigate('BookingList')}
                    >
                        <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.secondary} />
                        <Text style={[styles.actionButtonText, { color: colors.secondary }]}>View My Bookings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.logoutButton]}
                        onPress={handleLogout}
                    >
                        <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
                        <Text style={[styles.actionButtonText, { color: colors.error }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Stats Modal */}
            <Modal
                visible={showStatsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStatsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detailed Statistics</Text>
                            <TouchableOpacity
                                onPress={() => setShowStatsModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalBody}>
                            <View style={styles.detailedStats}>
                                <View style={styles.detailedStatItem}>
                                    <Text style={styles.detailedStatNumber}>{profileData.totalShipments}</Text>
                                    <Text style={styles.detailedStatLabel}>Total Shipments</Text>
                                    <Text style={styles.detailedStatDescription}>
                                        All time shipments created
                                    </Text>
                                </View>
                                
                                <View style={styles.detailedStatItem}>
                                    <Text style={styles.detailedStatNumber}>{profileData.completedShipments}</Text>
                                    <Text style={styles.detailedStatLabel}>Completed</Text>
                                    <Text style={styles.detailedStatDescription}>
                                        Successfully delivered shipments
                                    </Text>
                                </View>
                                
                                <View style={styles.detailedStatItem}>
                                    <Text style={styles.detailedStatNumber}>{profileData.activeShipments}</Text>
                                    <Text style={styles.detailedStatLabel}>Active</Text>
                                    <Text style={styles.detailedStatDescription}>
                                        Currently in progress
                                    </Text>
                                </View>
                                
                                <View style={styles.detailedStatItem}>
                                    <Text style={styles.detailedStatNumber}>
                                        {profileData.totalShipments > 0 
                                            ? ((profileData.completedShipments / profileData.totalShipments) * 100).toFixed(1)
                                            : '0'}%
                                    </Text>
                                    <Text style={styles.detailedStatLabel}>Success Rate</Text>
                                    <Text style={styles.detailedStatDescription}>
                                        Completion percentage
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.white,
        flex: 1,
        textAlign: 'center',
    },
    editButton: {
        padding: spacing.sm,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    profileHeaderCard: {
        backgroundColor: colors.white,
        borderRadius: spacing.lg,
        padding: spacing.lg,
        marginTop: -spacing.xl,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    profilePhotoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    profilePhoto: {
        position: 'relative',
        marginRight: spacing.lg,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    editPhotoOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    profileEmail: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    verificationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verificationText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    editActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.sm,
        flex: 1,
    },
    saveButton: {
        backgroundColor: colors.success,
    },
    cancelButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.error,
    },
    actionButtonText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.white,
    },
    statsContainer: {
        marginBottom: spacing.lg,
    },
    statsCard: {
        backgroundColor: colors.white,
        borderRadius: spacing.lg,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statsTitle: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    statLabel: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    ratingText: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.warning,
    },
    ratingLabel: {
        marginLeft: spacing.xs,
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    detailsCard: {
        backgroundColor: colors.white,
        borderRadius: spacing.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    fieldGroup: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldValue: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.background,
        borderRadius: spacing.sm,
    },
    input: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.background,
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.text.light + '30',
    },
    row: {
        flexDirection: 'row',
    },
    preferencesCard: {
        backgroundColor: colors.white,
        borderRadius: spacing.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    preferenceSection: {
        marginBottom: spacing.lg,
    },
    preferenceLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    preferenceChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    preferenceChip: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    preferenceChipText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
    },
    noPreferencesText: {
        color: colors.text.light,
        fontStyle: 'italic',
        fontSize: fonts.size.sm,
    },
    notificationSettings: {
        gap: spacing.sm,
    },
    notificationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.background,
        borderRadius: spacing.sm,
    },
    notificationLabel: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
    },
    notificationToggle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.text.light + '30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationActive: {
        backgroundColor: colors.success + '20',
    },
    actionButtons: {
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.secondary,
    },
    logoutButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.error,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: spacing.lg,
        width: width * 0.9,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    modalTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    modalCloseButton: {
        padding: spacing.sm,
    },
    modalBody: {
        padding: spacing.lg,
    },
    detailedStats: {
        gap: spacing.lg,
    },
    detailedStatItem: {
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderRadius: spacing.md,
    },
    detailedStatNumber: {
        fontSize: fonts.size.xl * 1.5,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    detailedStatLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    detailedStatDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
});

export default ShipperProfileScreen;
