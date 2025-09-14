import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatModal from '../components/Chat/ChatModal';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface Message {
    id: string;
    text: string;
    sender: 'transporter' | 'customer';
    timestamp: Date;
    type: 'text' | 'image' | 'location';
}

interface ContactCustomerScreenProps {
    route: {
        params: {
            requestId: string;
            customerName: string;
            customerPhone: string;
            customerEmail?: string;
            pickupLocation: string;
            deliveryLocation: string;
            requestDetails: any;
        };
    };
}

const ContactCustomerScreen: React.FC<ContactCustomerScreenProps> = ({ route }) => {
    const navigation = useNavigation();
    const { requestId, customerName, customerPhone, customerEmail, pickupLocation, deliveryLocation, requestDetails } = route.params;

    const [chatVisible, setChatVisible] = useState(false);

    const handleStartChat = () => {
        setChatVisible(true);
    };

    const handleCall = () => {
        Alert.alert(
            'Call Customer',
            `Call ${customerName} at ${customerPhone}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call',
                    onPress: () => {
                        // Here you would integrate with actual calling functionality
                        Alert.alert('Calling...', `Connecting to ${customerPhone}`);
                    }
                }
            ]
        );
    };

    const handleVideoCall = () => {
        Alert.alert(
            'Video Call Customer',
            `Start video call with ${customerName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Call',
                    onPress: () => {
                        // Here you would integrate with actual video calling functionality
                        Alert.alert('Video Calling...', `Connecting to ${customerName}`);
                    }
                }
            ]
        );
    };

    const handleShareLocation = () => {
        const locationMessage: Message = {
            id: Date.now().toString(),
            text: '📍 Current Location Shared',
            sender: 'transporter',
            timestamp: new Date(),
            type: 'location'
        };
        setMessages(prev => [locationMessage, ...prev]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageContainer,
            item.sender === 'transporter' ? styles.transporterMessage : styles.customerMessage
        ]}>
            <View style={[
                styles.messageBubble,
                item.sender === 'transporter' ? styles.transporterBubble : styles.customerBubble
            ]}>
                {item.type === 'location' ? (
                    <View style={styles.locationMessage}>
                        <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                        <Text style={styles.locationText}>{item.text}</Text>
                    </View>
                ) : (
                    <Text style={[
                        styles.messageText,
                        item.sender === 'transporter' ? styles.transporterText : styles.customerText
                    ]}>
                        {item.text}
                    </Text>
                )}
                <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
            </View>
        </View>
    );

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

                    <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{customerName}</Text>
                        <Text style={styles.requestId}>Request #{requestId}</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleCall} style={styles.headerActionButton}>
                            <Ionicons name="call" size={20} color={colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleVideoCall} style={styles.headerActionButton}>
                            <Ionicons name="videocam" size={20} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            {/* Request Summary */}
            <View style={styles.requestSummary}>
                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                    <Text style={styles.summaryText}>From: {pickupLocation}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.success} />
                    <Text style={styles.summaryText}>To: {deliveryLocation}</Text>
                </View>
            </View>

            {/* Messages */}
            <View style={styles.messagesContainer}>
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    inverted
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.messagesList}
                />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity onPress={handleShareLocation} style={styles.quickActionButton}>
                    <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                    <Text style={styles.quickActionText}>Share Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('TransporterService')}
                    style={styles.quickActionButton}
                >
                    <MaterialCommunityIcons name="clipboard-list" size={20} color={colors.secondary} />
                    <Text style={styles.quickActionText}>View Requests</Text>
                </TouchableOpacity>
            </View>

            {/* Message Input */}
            <View style={styles.chatButtonContainer}>
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={handleStartChat}
                >
                    <Ionicons name="chatbubble" size={20} color={colors.white} />
                    <Text style={styles.chatButtonText}>Start Chat with {customerName}</Text>
                </TouchableOpacity>
            </View>

            {/* Chat Modal */}
            <ChatModal
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                participantIds={[customerEmail]} // Use customer email as participant ID
                onChatCreated={(chatRoom) => {
                    // Chat created with customer
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    customerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    customerName: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    requestId: {
        fontSize: fonts.size.sm,
        color: colors.white + 'CC',
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerActionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    requestSummary: {
        backgroundColor: colors.white,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    summaryText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesList: {
        padding: spacing.md,
    },
    messageContainer: {
        marginBottom: spacing.md,
    },
    transporterMessage: {
        alignItems: 'flex-end',
    },
    customerMessage: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: spacing.md,
        borderRadius: 16,
    },
    transporterBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    customerBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: fonts.size.md,
        lineHeight: 20,
    },
    transporterText: {
        color: colors.white,
    },
    customerText: {
        color: colors.text.primary,
    },
    locationMessage: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: fonts.size.md,
        color: colors.primary,
        marginLeft: spacing.xs,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        marginTop: spacing.xs,
        alignSelf: 'flex-end',
    },
    quickActions: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
        marginHorizontal: spacing.xs,
    },
    quickActionText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        marginLeft: spacing.xs,
        fontWeight: '600',
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
    },
    messageInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        maxHeight: 100,
        marginRight: spacing.sm,
    },
    sendButton: {
        backgroundColor: colors.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.text.light,
    },
    chatButtonContainer: {
        padding: 16,
        backgroundColor: colors.white,
    },
    chatButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    chatButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default ContactCustomerScreen;
