import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Alert, 
    Platform, 
    ScrollView,
    Image,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { notificationService } from '../../services/notificationService';

interface Broker {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
}

interface DocumentAsset {
    uri: string;
    name?: string;
    type?: string;
    size?: number;
}

const EnhancedVerifyIdentificationDocumentScreen = ({ navigation, route }: any) => {
    const { broker }: { broker?: Broker } = route.params || {};
    const [idType, setIdType] = useState('national');
    const [idDoc, setIdDoc] = useState<DocumentAsset | null>(null);
    const [status, setStatus] = useState<'not_uploaded' | 'pending' | 'verified' | 'rejected'>('not_uploaded');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const ID_TYPES = [
        {
            key: 'national',
            label: 'National ID',
            icon: 'card-account-details',
            description: 'Kenya National ID Card',
            color: colors.primary,
        },
        {
            key: 'passport',
            label: 'Passport',
            icon: 'passport',
            description: 'International Passport',
            color: colors.secondary,
        },
        {
            key: 'military',
            label: 'Military ID',
            icon: 'shield-account',
            description: 'Military Identification',
            color: colors.tertiary,
        },
    ];

    const handlePickIdDoc = async () => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Camera/gallery option for ID upload
            const options = [
                { label: 'Take Photo', value: 'camera' },
                { label: 'Choose from Gallery', value: 'gallery' },
                { label: 'Cancel', value: 'cancel' },
            ];

            // Use a simple prompt for now (replace with ActionSheet for better UX)
            const choice = await new Promise((resolve) => {
                let res = window?.prompt
                    ? window.prompt('Choose option: camera/gallery')
                    : null;
                if (res === 'camera' || res === 'gallery') resolve(res);
                else resolve('gallery');
            });

            let result;
            if (choice === 'camera') {
                const { status } = await import('expo-image-picker').then(m => m.requestCameraPermissionsAsync());
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Camera permission is required to take photos of your ID document.');
                    return;
                }
                result = await import('expo-image-picker').then(m => m.launchCameraAsync({
                    mediaTypes: m.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                }));
            } else {
                const { status } = await import('expo-image-picker').then(m => m.requestMediaLibraryPermissionsAsync());
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Media library permission is required to select your ID document.');
                    return;
                }
                result = await import('expo-image-picker').then(m => m.launchImageLibraryAsync({
                    mediaTypes: m.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                }));
            }

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                setIdDoc({
                    uri: asset.uri,
                    name: asset.fileName || `id_document_${Date.now()}.jpg`,
                    type: 'image/jpeg',
                    size: asset.fileSize,
                });
                
                setUploadProgress(100);
                
                // Simulate processing delay
                setTimeout(() => {
                    setStatus('pending');
                    setIsUploading(false);
                    setUploadProgress(0);
                    
                    // Notify admin for verification
                    notificationService.sendInApp(
                        'ADMIN',
                        `Broker ${broker?.name || broker?.email || 'New Broker'} uploaded ${ID_TYPES.find(t => t.key === idType)?.label} for verification.`,
                        'admin',
                        'admin_alert',
                        { broker, idType, idDoc: asset }
                    );
                    
                    notificationService.sendEmail(
                        broker?.email,
                        'ID Document Submitted for Verification',
                        `Your ${ID_TYPES.find(t => t.key === idType)?.label} has been submitted and is pending verification. You will be notified once the verification is complete.`,
                        'broker',
                        'id_verification',
                        { broker, idType, idDoc: asset }
                    );
                    
                    notificationService.sendSMS(
                        broker?.phone,
                        `Your ${ID_TYPES.find(t => t.key === idType)?.label} has been submitted for verification. You will be notified once verified.`,
                        'broker',
                        'id_verification',
                        { broker, idType, idDoc: asset }
                    );

                    Alert.alert(
                        'Document Submitted',
                        'Your ID document has been submitted for verification. You will be notified once the verification is complete.',
                        [{ text: 'OK' }]
                    );
                }, 1000);
            } else {
                setIsUploading(false);
                setUploadProgress(0);
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            setIsUploading(false);
            setUploadProgress(0);
            Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
        }
    };

    const handleContactSupport = () => {
        Alert.alert(
            'Contact Support',
            'For assistance with ID verification, please contact our support team.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call Support', onPress: () => console.log('Call support') },
                { text: 'Email Support', onPress: () => console.log('Email support') },
            ]
        );
    };

    const handleRetryUpload = () => {
        setIdDoc(null);
        setStatus('not_uploaded');
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    icon: 'clock-outline',
                    title: 'Verification in Progress',
                    subtitle: 'Your document is being reviewed by our verification team',
                    description: 'This process typically takes 1-2 business days. You will receive a notification once verification is complete.',
                    color: colors.warning,
                    backgroundColor: colors.warning + '15',
                    borderColor: colors.warning + '30',
                };
            case 'verified':
                return {
                    icon: 'check-circle',
                    title: 'Verification Complete',
                    subtitle: 'Your identity has been successfully verified',
                    description: 'You can now access all broker features and start managing your clients.',
                    color: colors.success,
                    backgroundColor: colors.success + '15',
                    borderColor: colors.success + '30',
                };
            case 'rejected':
                return {
                    icon: 'close-circle',
                    title: 'Verification Rejected',
                    subtitle: 'Your document could not be verified',
                    description: 'Please ensure your document is clear, valid, and matches the selected ID type. Contact support if you need assistance.',
                    color: colors.error,
                    backgroundColor: colors.error + '15',
                    borderColor: colors.error + '30',
                };
            default:
                return null;
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Identity Verification</Text>
                        <Text style={styles.headerSubtitle}>Secure your broker account</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Welcome Section */}
                <View style={styles.welcomeCard}>
                    <View style={styles.welcomeIconContainer}>
                        <MaterialCommunityIcons name="shield-check" size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.welcomeTitle}>Verify Your Identity</Text>
                    <Text style={styles.welcomeDescription}>
                        To ensure the security and trust of our platform, we require all brokers to verify their identity. 
                        This helps us comply with regulations and maintain a safe environment for all users.
                    </Text>
                </View>

                {/* ID Type Selection */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="card-account-details" size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Select ID Type</Text>
                    </View>
                    <Text style={styles.sectionDescription}>
                        Choose the type of identification document you want to upload
                    </Text>
                    
                    <View style={styles.idTypeGrid}>
                        {ID_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.key}
                                style={[
                                    styles.idTypeCard,
                                    idType === type.key && styles.idTypeCardActive
                                ]}
                                onPress={() => setIdType(type.key)}
                            >
                                <View style={[
                                    styles.idTypeIconContainer,
                                    { backgroundColor: idType === type.key ? type.color + '20' : colors.background }
                                ]}>
                                    <MaterialCommunityIcons 
                                        name={type.icon as any} 
                                        size={24} 
                                        color={idType === type.key ? type.color : colors.text.secondary} 
                                    />
                                </View>
                                <Text style={[
                                    styles.idTypeLabel,
                                    idType === type.key && { color: type.color, fontWeight: '600' }
                                ]}>
                                    {type.label}
                                </Text>
                                <Text style={styles.idTypeDescription}>
                                    {type.description}
                                </Text>
                                {idType === type.key && (
                                    <View style={styles.selectedIndicator}>
                                        <MaterialCommunityIcons name="check-circle" size={16} color={type.color} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Document Upload Section */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="cloud-upload" size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Upload Document</Text>
                    </View>
                    
                    {!idDoc ? (
                        <TouchableOpacity 
                            style={styles.uploadCard} 
                            onPress={handlePickIdDoc}
                            disabled={isUploading}
                        >
                            <View style={styles.uploadIconContainer}>
                                <MaterialCommunityIcons 
                                    name="cloud-upload-outline" 
                                    size={32} 
                                    color={isUploading ? colors.text.light : colors.primary} 
                                />
                            </View>
                            <Text style={styles.uploadTitle}>
                                {isUploading ? 'Uploading...' : 'Upload ID Document'}
                            </Text>
                            <Text style={styles.uploadDescription}>
                                Take a clear photo or select from gallery
                            </Text>
                            
                            {isUploading && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.documentPreview}>
                            <View style={styles.documentInfo}>
                                <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
                                <View style={styles.documentDetails}>
                                    <Text style={styles.documentName}>{idDoc.name}</Text>
                                    <Text style={styles.documentSize}>
                                        {idDoc.size ? `${(idDoc.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={styles.changeButton}
                                onPress={handleRetryUpload}
                            >
                                <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                                <Text style={styles.changeButtonText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Status Section */}
                {statusConfig && (
                    <View style={[
                        styles.statusCard,
                        { 
                            backgroundColor: statusConfig.backgroundColor,
                            borderColor: statusConfig.borderColor 
                        }
                    ]}>
                        <View style={styles.statusIconContainer}>
                            <MaterialCommunityIcons 
                                name={statusConfig.icon as any} 
                                size={32} 
                                color={statusConfig.color} 
                            />
                        </View>
                        <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                            {statusConfig.title}
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {statusConfig.subtitle}
                        </Text>
                        <Text style={styles.statusDescription}>
                            {statusConfig.description}
                        </Text>
                        
                        {status === 'verified' && (
                            <TouchableOpacity 
                                style={styles.primaryButton}
                                onPress={() => navigation.replace('BrokerTabs')}
                            >
                                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
                                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                            </TouchableOpacity>
                        )}
                        
                        {status === 'rejected' && (
                            <View style={styles.rejectedActions}>
                                <TouchableOpacity 
                                    style={styles.primaryButton}
                                    onPress={handleRetryUpload}
                                >
                                    <MaterialCommunityIcons name="refresh" size={20} color={colors.white} />
                                    <Text style={styles.primaryButtonText}>Try Again</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.secondaryButton}
                                    onPress={handleContactSupport}
                                >
                                    <MaterialCommunityIcons name="help-circle" size={20} color={colors.primary} />
                                    <Text style={styles.secondaryButtonText}>Contact Support</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Security Notice */}
                <View style={styles.securityCard}>
                    <MaterialCommunityIcons name="shield-lock" size={20} color={colors.success} />
                    <View style={styles.securityContent}>
                        <Text style={styles.securityTitle}>Your Data is Secure</Text>
                        <Text style={styles.securityDescription}>
                            All documents are encrypted and stored securely. We only use this information for verification purposes and comply with all data protection regulations.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.white + 'CC',
        textAlign: 'center',
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    welcomeCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    welcomeIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    welcomeDescription: {
        fontSize: 16,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    idTypeGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    idTypeCard: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    idTypeCardActive: {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary + '30',
    },
    idTypeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    idTypeLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: 2,
        textAlign: 'center',
    },
    idTypeDescription: {
        fontSize: 12,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    selectedIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    uploadCard: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    uploadIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    uploadDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    progressContainer: {
        width: '100%',
        marginTop: spacing.md,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    documentPreview: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    documentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    documentDetails: {
        marginLeft: spacing.md,
        flex: 1,
    },
    documentName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: 2,
    },
    documentSize: {
        fontSize: 12,
        color: colors.text.secondary,
    },
    changeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    changeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.primary,
        marginLeft: spacing.xs,
    },
    statusCard: {
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 2,
        alignItems: 'center',
    },
    statusIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    statusSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    statusDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
        marginLeft: spacing.sm,
    },
    rejectedActions: {
        width: '100%',
        gap: spacing.md,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    securityCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    securityContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    securityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    securityDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
    },
});

export default EnhancedVerifyIdentificationDocumentScreen;
