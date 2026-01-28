/**
 * Dispute Detail Screen
 * View and manage a single dispute
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, Dispute } from '../services/disputeService';
import { getDisplayBookingId } from '../utils/unifiedIdSystem';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import RealtimeChatModal from '../components/Chat/RealtimeChatModal';
import { API_ENDPOINTS } from '../constants/api';
// Robust date formatter that handles various date formats including Firestore Timestamps
const formatDate = (dateString: string | undefined | null | any): string => {
  if (!dateString) return 'N/A';
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (typeof dateString === 'object' && dateString !== null) {
      if ('toDate' in dateString && typeof dateString.toDate === 'function') {
        // Firestore Timestamp object
        date = dateString.toDate();
      } else if ('seconds' in dateString && 'nanoseconds' in dateString) {
        // Firestore Timestamp-like object with seconds/nanoseconds
        date = new Date(dateString.seconds * 1000 + (dateString.nanoseconds || 0) / 1000000);
      } else if ('_seconds' in dateString) {
        // Alternative Firestore Timestamp format
        date = new Date(dateString._seconds * 1000);
      } else {
        // Try to convert object to date
        date = new Date(dateString);
      }
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (typeof dateString === 'number') {
      // Unix timestamp (seconds or milliseconds)
      date = dateString > 1000000000000 ? new Date(dateString) : new Date(dateString * 1000);
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'N/A';
    }
    
    // Use toLocaleString for proper formatting
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'N/A';
  }
};

const DisputeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Log immediately when component mounts
  console.log('🚀 [DisputeDetail] Component mounting...');
  console.log('🚀 [DisputeDetail] Route object:', {
    name: route.name,
    key: route.key,
    params: route.params,
  });
  
  const params = route.params as { disputeId?: string; action?: string } || {};
  const { disputeId, action } = params;
  
  // Log route params for debugging
  console.log('🔍 [DisputeDetail] Screen mounted with params:', {
    routeParams: route.params,
    disputeId,
    action,
    hasParams: !!route.params,
  });
  
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Add navigation listener to detect if we're being unmounted
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('✅ [DisputeDetail] Screen focused');
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('⚠️ [DisputeDetail] Screen blurred (navigating away)');
    });
    
    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Check user role and admin status
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          setUserRole(role);
          setIsAdmin(role === 'admin');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    checkUserRole();
  }, []);

  useEffect(() => {
    console.log('🔍 [DisputeDetail] useEffect triggered:', { disputeId, params });
    if (disputeId) {
      loadDispute();
    } else {
      console.error('❌ [DisputeDetail] No disputeId provided in route params. Route params:', route.params);
      // Don't auto-navigate back - let user see the error
      setLoading(false);
      setError('Dispute ID is missing from navigation parameters');
    }
  }, [disputeId, route.params]);

  const loadDispute = async () => {
    if (!disputeId) {
      console.error('DisputeDetailScreen: Cannot load dispute without disputeId');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📋 [DisputeDetail] Loading dispute:', disputeId);
      const data = await disputeService.getDispute(disputeId);
      console.log('✅ [DisputeDetail] Loaded dispute:', {
        disputeId: data.disputeId || data.id,
        status: data.status,
        hasTransporter: !!data.transporter,
        bookingId: data.bookingId,
      });
      setDispute(data);
      
      // Use booking object from dispute if available (backend populated it or fetched by service)
      // The disputeService.getDispute() now ensures booking has readableId
      if (data.booking) {
        console.log('✅ [DisputeDetail] Using booking from dispute:', {
          bookingId: data.booking.id || data.booking.bookingId,
          readableId: data.booking.readableId,
        });
        setBookingDetails(data.booking);
      } else if (data.bookingId) {
        // Fallback: fetch booking if service didn't populate it (shouldn't happen, but just in case)
        console.warn('⚠️ [DisputeDetail] Booking not populated by service, fetching manually...');
        try {
          const { apiRequest } = await import('../utils/api');
          const booking = await apiRequest(`/bookings/${data.bookingId}`);
          console.log('✅ [DisputeDetail] Fetched booking manually:', {
            bookingId: booking.id || booking.bookingId,
            readableId: booking.readableId,
          });
          setBookingDetails(booking);
        } catch (error) {
          console.warn('Could not fetch booking details:', error);
          // Continue without booking details - will use bookingId as fallback
        }
      }
    } catch (error: any) {
      console.error('❌ [DisputeDetail] Error loading dispute:', error);
      console.error('❌ [DisputeDetail] Error details:', {
        message: error?.message,
        stack: error?.stack,
        disputeId,
      });
      setError(error?.message || 'Failed to load dispute details');
      setLoading(false);
      // Don't auto-navigate - show error state instead
      // User can choose to retry or go back
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.warning; // Backend uses 'open' not 'pending'
      case 'resolved': return colors.success;
      case 'in_progress': return colors.primary;
      case 'closed': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dispute...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no disputeId
  if (!disputeId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Dispute ID is missing</Text>
          <Text style={styles.emptySubtext}>Please go back and try again</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.emptyText}>
            {error || 'Dispute not found'}
          </Text>
          {error && (
            <Text style={styles.emptySubtext}>
              Please check your connection and try again
            </Text>
          )}
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              if (disputeId) {
                setError(null);
                loadDispute();
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.retryButtonText}>
              {disputeId ? 'Retry' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Don't render main content if still loading or no dispute
  // But show loading state instead of returning null (which can cause navigation issues)
  if (!dispute && loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dispute details...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // If we have an error or no dispute after loading, show error state (already handled above)
  if (!dispute) {
    // This should already be handled by the error state above, but just in case
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.emptyText}>
            {error || 'Dispute not found'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ensure we always have a dispute before rendering main content
  if (!dispute) {
    // This should never happen due to checks above, but just in case
    console.warn('⚠️ [DisputeDetail] Attempting to render without dispute');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Unable to load dispute</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark || colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>Dispute Details</Text>
            <Text style={styles.headerSubtitle}>View and manage dispute</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dispute ID and Status */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={[colors.background, colors.white]}
            style={styles.statusGradient}
          >
            <View style={styles.statusHeader}>
              <View style={styles.disputeIdRow}>
                <View style={styles.disputeIdContainer}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.primary} />
                  <Text style={styles.disputeId} numberOfLines={1} ellipsizeMode="tail">
                    {dispute.disputeId || `DSP${(dispute.id || dispute.bookingId || '').substring(0, 6).toUpperCase()}`}
                  </Text>
                </View>
              </View>
              <View style={styles.badgeContainer}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) + '15', borderColor: getPriorityColor(dispute.priority) + '40' }]}>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(dispute.priority) }]} />
                  <Text style={[styles.badgeText, { color: getPriorityColor(dispute.priority) }]}>
                    {dispute.priority}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + '15', borderColor: getStatusColor(dispute.status) + '40' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(dispute.status) }]} />
                  <Text style={[styles.badgeText, { color: getStatusColor(dispute.status) }]}>
                    {dispute.status}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Booking Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Booking Information</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="file-document" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Booking ID</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  // Priority 1: Use readableId from bookingDetails (fetched booking)
                  if (bookingDetails) {
                    // ONLY use readableId from database - no fallback generation
                    const readableId = bookingDetails.readableId || 
                                       bookingDetails.displayId || 
                                       bookingDetails.userFriendlyId || 
                                       bookingDetails.customerReadableId || 
                                       bookingDetails.shipperReadableId;
                    if (readableId) return readableId;
                    // If no readableId, show raw bookingId from booking object
                    return bookingDetails.id || bookingDetails.bookingId || dispute.bookingId || 'N/A';
                  }
                  // Priority 2: Use readableId from dispute.booking (backend populated)
                  if (dispute.booking) {
                    // ONLY use readableId from database - no fallback generation
                    const readableId = dispute.booking.readableId || 
                                       dispute.booking.displayId || 
                                       dispute.booking.userFriendlyId;
                    if (readableId) return readableId;
                    // If no readableId, show raw bookingId from booking object
                    return dispute.booking.id || dispute.booking.bookingId || dispute.bookingId || 'N/A';
                  }
                  // Priority 3: If no booking object, just show bookingId (don't generate fallback)
                  return dispute.bookingId || 'N/A';
                })()}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information (from openedBy) */}
        {dispute.openedBy && typeof dispute.openedBy === 'object' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-circle" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Customer</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{dispute.openedBy.name || dispute.openedBy.displayName || 'N/A'}</Text>
              </View>
            </View>
            {dispute.openedBy.phone && (
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{dispute.openedBy.phone}</Text>
                </View>
              </View>
            )}
            {dispute.openedBy.email && (
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="email" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{dispute.openedBy.email}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Transporter/Driver Information - Enhanced with booking details */}
        {(dispute.transporter || bookingDetails?.assignedDriver || bookingDetails?.transporter || bookingDetails?.driver) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name={dispute.transporterType === 'driver' ? "account-circle" : "truck-delivery"} 
                size={20} 
                color={colors.secondary} 
              />
              <Text style={styles.sectionTitle}>
                {dispute.transporterType === 'driver' ? 'Driver' : 'Transporter'}
              </Text>
            </View>
            
            {/* Get driver/transporter data from multiple sources */}
            {(() => {
              const driver = bookingDetails?.assignedDriver || bookingDetails?.driver || dispute.transporter;
              const transporter = bookingDetails?.transporter || dispute.transporter;
              const company = driver?.company || transporter?.company || bookingDetails?.company;
              const vehicle = driver?.assignedVehicle || transporter?.vehicle || bookingDetails?.vehicle;
              
              return (
                <>
                  {/* Name */}
                  <View style={styles.infoRow}>
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons 
                        name={dispute.transporterType === 'driver' ? "account" : "truck"} 
                        size={18} 
                        color={colors.secondary} 
                      />
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Name</Text>
                      <Text style={styles.infoValue}>
                        {driver?.name || 
                         driver?.driverName || 
                         (driver?.firstName && driver?.lastName ? `${driver.firstName} ${driver.lastName}` : null) ||
                         transporter?.name || 
                         transporter?.companyName || 
                         dispute.transporter?.name ||
                         dispute.transporter?.companyName || 
                         dispute.transporter?.displayName || 
                         'N/A'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Phone */}
                  {(driver?.phone || transporter?.phone || dispute.transporter?.phone) && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>
                          {driver?.phone || transporter?.phone || dispute.transporter?.phone}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Email */}
                  {(driver?.email || transporter?.email || dispute.transporter?.email) && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="email" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>
                          {driver?.email || transporter?.email || dispute.transporter?.email}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* License Number (for drivers) */}
                  {dispute.transporterType === 'driver' && (driver?.licenseNumber || driver?.driverLicense) && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="card-account-details" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>License Number</Text>
                        <Text style={styles.infoValue}>
                          {driver?.licenseNumber || driver?.driverLicense}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Company Name */}
                  {(company?.name || driver?.companyName || transporter?.companyName) && (
                    <View style={styles.infoRow}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="office-building" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>Company</Text>
                        <Text style={styles.infoValue}>
                          {company?.name || driver?.companyName || transporter?.companyName}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Vehicle Details */}
                  {vehicle && (
                    <>
                      {(vehicle.make || vehicle.model) && (
                        <View style={styles.infoRow}>
                          <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="car" size={18} color={colors.secondary} />
                          </View>
                          <View style={styles.infoContainer}>
                            <Text style={styles.infoLabel}>Vehicle</Text>
                            <Text style={styles.infoValue}>
                              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.type || 'N/A'}
                            </Text>
                          </View>
                        </View>
                      )}
                      {vehicle.registration && (
                        <View style={styles.infoRow}>
                          <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="license" size={18} color={colors.secondary} />
                          </View>
                          <View style={styles.infoContainer}>
                            <Text style={styles.infoLabel}>Registration</Text>
                            <Text style={styles.infoValue}>{vehicle.registration}</Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </View>
        )}

        {/* Issue Details (Backend uses 'reason') */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>Reason for Dispute</Text>
          </View>
          <LinearGradient
            colors={[colors.background, colors.white]}
            style={styles.issueCard}
          >
            <Text style={styles.issueDescription}>{dispute.reason}</Text>
          </LinearGradient>
        </View>

        {/* Conversation/Chat Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Conversation</Text>
          </View>
          <View style={styles.conversationCard}>
            <Text style={styles.conversationDescription}>
              {(() => {
                const auth = getAuth();
                const currentUserId = auth.currentUser?.uid;
                const complainantId = typeof dispute.openedBy === 'object' ? dispute.openedBy.id || dispute.openedBy.uid : dispute.openedBy;
                const accusedId = dispute.transporterId || (dispute.transporter?.id || dispute.transporter?.uid);
                
                // Check if current user is complainant, accused, or admin
                const isComplainant = currentUserId === complainantId;
                const isAccused = currentUserId === accusedId;
                
                if (isAdmin) {
                  return 'View and participate in the conversation between the complainant and accused parties.';
                } else if (isComplainant) {
                  return 'Chat with the transporter/driver to resolve this dispute.';
                } else if (isAccused) {
                  return 'Chat with the customer to resolve this dispute.';
                } else {
                  return 'View the conversation history between the parties involved in this dispute.';
                }
              })()}
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => setShowChatModal(true)}
            >
              <MaterialCommunityIcons name="message-text" size={20} color={colors.white} />
              <Text style={styles.chatButtonText}>
                {isAdmin ? 'View & Join Conversation' : 'Open Conversation'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Evidence (Backend uses 'evidence' array) */}
        {dispute.evidence && dispute.evidence.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="camera" size={20} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Evidence</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
              {dispute.evidence.map((url, index) => (
                <TouchableOpacity key={index} style={styles.attachmentCard} activeOpacity={0.8}>
                  <Image source={{ uri: url }} style={styles.attachmentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Transporter Response - Not in backend model, removed */}

        {/* Resolution (Backend uses string, not object) */}
        {dispute.resolution && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.sectionTitle}>Resolution</Text>
            </View>
            <LinearGradient
              colors={[colors.success + '15', colors.white]}
              style={styles.resolutionCard}
            >
              <Text style={styles.resolutionNotes}>{dispute.resolution}</Text>
              {dispute.amountRefunded && dispute.amountRefunded > 0 && (
                <View style={styles.amountRow}>
                  <MaterialCommunityIcons name="cash" size={18} color={colors.success} />
                  <Text style={styles.resolutionAmount}>
                    Amount Refunded: KES {dispute.amountRefunded.toLocaleString()}
                  </Text>
                </View>
              )}
              {dispute.resolvedAt && (
                <View style={styles.dateRow}>
                  <MaterialCommunityIcons name="clock-check" size={16} color={colors.text.secondary} />
                  <Text style={styles.resolutionDate}>
                    Resolved: {formatDate(dispute.resolvedAt)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Comments */}
        {dispute.comments && dispute.comments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="comment-text-multiple" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Comments</Text>
            </View>
            {dispute.comments.map((comment, index) => (
              <LinearGradient
                key={index}
                colors={[colors.background, colors.white]}
                style={styles.commentCard}
              >
                <View style={styles.commentHeader}>
                  <MaterialCommunityIcons name="account-circle" size={16} color={colors.primary} />
                  <Text style={styles.commentLabel}>Comment #{index + 1}</Text>
                </View>
                <Text style={styles.commentText}>{comment}</Text>
              </LinearGradient>
            ))}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineLineContainer}>
                <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                {dispute.resolvedAt && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <MaterialCommunityIcons name="plus-circle" size={16} color={colors.primary} />
                  <Text style={styles.timelineLabel}>Created</Text>
                </View>
                <Text style={styles.timelineDate}>{formatDate(dispute.createdAt)}</Text>
              </View>
            </View>
            {dispute.resolvedAt && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineLineContainer}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.timelineLabel}>Resolved</Text>
                  </View>
                  <Text style={styles.timelineDate}>{formatDate(dispute.resolvedAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      {dispute.status === 'open' && (
        <View style={styles.actionsContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark || colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateDispute' as never, { disputeId: dispute.disputeId, edit: true } as never)}
            >
              <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Update</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* Chat Modal for Dispute Conversation */}
      {dispute && (() => {
        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;
        
        // Determine complainant (openedBy) - try multiple ways to get the ID
        let complainantId: string | null = null;
        if (typeof dispute.openedBy === 'object' && dispute.openedBy !== null) {
          complainantId = dispute.openedBy.id || 
                         dispute.openedBy.uid || 
                         dispute.openedBy._id || 
                         dispute.openedBy.userId ||
                         dispute.userId ||
                         null;
        } else if (typeof dispute.openedBy === 'string') {
          complainantId = dispute.openedBy;
        } else {
          complainantId = dispute.userId || null;
        }
        
        const complainantName = typeof dispute.openedBy === 'object' && dispute.openedBy !== null
          ? (dispute.openedBy.name || dispute.openedBy.displayName || dispute.customer?.name || 'Customer')
          : 'Customer';
        const complainantPhoto = typeof dispute.openedBy === 'object' && dispute.openedBy !== null
          ? (dispute.openedBy.profilePhoto || dispute.openedBy.photoURL || dispute.customer?.profilePhoto)
          : undefined;
        const complainantType = typeof dispute.openedBy === 'object' && dispute.openedBy !== null
          ? (dispute.openedBy.role || 'shipper')
          : 'shipper';
        
        // Determine accused (transporter/driver) - try multiple ways to get the USER ID
        // NOTE: dispute.transporterId might be a driver ID (Firestore doc ID), not a user ID
        // For chat, we need the user ID (Firebase UID), not the driver ID
        let accusedId: string | null = null;
        
        // Priority 1: Get userId from booking (most reliable - booking.transporterId is always userId)
        if (bookingDetails?.transporterId) {
          accusedId = bookingDetails.transporterId;
          console.log('✅ [DisputeDetail] Using userId from booking.transporterId:', accusedId);
        } 
        // Priority 2: Get userId from dispute.transporter object
        else if (dispute.transporter) {
          accusedId = dispute.transporter.userId || 
                     dispute.transporter.id || 
                     dispute.transporter.uid || 
                     dispute.transporter._id ||
                     null;
          if (accusedId) {
            console.log('✅ [DisputeDetail] Using userId from dispute.transporter:', accusedId);
          }
        }
        // Priority 3: If dispute.transporterId exists, it might be a driver ID or userId
        // If we have bookingDetails with assignedDriver, try to get userId from there
        else if (bookingDetails?.assignedDriver?.userId) {
          accusedId = bookingDetails.assignedDriver.userId;
          console.log('✅ [DisputeDetail] Using userId from bookingDetails.assignedDriver.userId:', accusedId);
        }
        // Priority 4: Fallback to dispute.transporterId (might be driver ID - will fail chat but we'll log it)
        else if (dispute.transporterId) {
          accusedId = dispute.transporterId;
          console.warn('⚠️ [DisputeDetail] Using dispute.transporterId as fallback (may be driver ID, not userId):', accusedId);
          console.warn('⚠️ [DisputeDetail] This may cause "Participant not found" error if it\'s a driver ID');
        }
        
        // Get accused name from multiple sources - prioritize booking details which have the actual driver/transporter info
        const accusedName = 
          bookingDetails?.assignedDriver?.name || 
          bookingDetails?.assignedDriver?.driverName ||
          bookingDetails?.transporter?.name ||
          bookingDetails?.transporter?.companyName ||
          dispute.transporter?.name || 
          dispute.transporter?.companyName || 
          dispute.transporter?.displayName || 
          (dispute.transporterType === 'driver' ? 'Driver' : 'Transporter');
        const accusedPhoto = 
          bookingDetails?.assignedDriver?.photo ||
          bookingDetails?.assignedDriver?.profilePhoto ||
          bookingDetails?.transporter?.profilePhoto ||
          bookingDetails?.transporter?.photoURL ||
          dispute.transporter?.profilePhoto || 
          dispute.transporter?.photoURL;
        const accusedType = 
          (bookingDetails?.assignedDriver ? 'driver' : null) ||
          dispute.transporterType || 
          (dispute.transporter?.role || 'transporter');
        
        // Validate that we have both participant IDs
        if (!complainantId || !accusedId) {
          console.warn('⚠️ [DisputeDetail] Missing participant IDs:', {
            complainantId,
            accusedId,
            dispute: {
              openedBy: dispute.openedBy,
              transporterId: dispute.transporterId,
              transporter: dispute.transporter,
              userId: dispute.userId,
            }
          });
        }
        
        // Determine participant types for chat
        // If admin, they can view/join as admin
        // Otherwise, current user is either complainant or accused
        let participant1Id = currentUserId || '';
        let participant1Type = userRole || 'shipper';
        let participant2Id = '';
        let participant2Name = '';
        let participant2Type = '';
        let participant2Photo = undefined;
        
        if (isAdmin) {
          // Admin can view conversation between complainant and accused
          // Admin joins as participant1, and can see messages from both parties
          participant1Id = currentUserId || '';
          participant1Type = 'admin';
          // For admin view, we'll show conversation with the complainant first
          participant2Id = complainantId || '';
          participant2Name = complainantName;
          participant2Type = complainantType;
          participant2Photo = complainantPhoto;
        } else if (currentUserId === complainantId) {
          // Current user is complainant - chat with accused
          participant1Id = complainantId;
          participant1Type = complainantType;
          participant2Id = accusedId || '';
          participant2Name = accusedName;
          participant2Type = accusedType;
          participant2Photo = accusedPhoto;
        } else if (currentUserId === accusedId) {
          // Current user is accused - chat with complainant
          participant1Id = accusedId;
          participant1Type = accusedType;
          participant2Id = complainantId || '';
          participant2Name = complainantName;
          participant2Type = complainantType;
          participant2Photo = complainantPhoto;
        } else {
          // Fallback: current user is neither, show complainant's view
          participant1Id = complainantId || '';
          participant1Type = complainantType;
          participant2Id = accusedId || '';
          participant2Name = accusedName;
          participant2Type = accusedType;
          participant2Photo = accusedPhoto;
        }
        
        // Don't render chat modal if we don't have valid participant IDs
        if (!participant1Id || !participant2Id) {
          console.error('❌ [DisputeDetail] Cannot create chat: missing participant IDs', {
            participant1Id,
            participant2Id,
            complainantId,
            accusedId,
            currentUserId,
          });
          return null;
        }
        
        return (
          <RealtimeChatModal
            visible={showChatModal}
            onClose={() => setShowChatModal(false)}
            bookingId={dispute.bookingId}
            participant1Id={participant1Id}
            participant1Type={participant1Type}
            participant2Id={participant2Id}
            participant2Type={participant2Type}
            participant2Name={participant2Name}
            participant2Photo={participant2Photo}
            onChatCreated={(chatRoom) => {
              console.log('✅ [DisputeDetail] Dispute chat room created:', chatRoom);
            }}
          />
        );
      })()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    marginTop: spacing.md,
  },
  statusCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  statusGradient: {
    padding: spacing.md,
  },
  statusHeader: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  disputeIdRow: {
    width: '100%',
  },
  disputeIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  disputeId: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    width: '100%',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs / 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs / 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontFamily: fonts.family.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  issueCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  issueTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  issueDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    marginLeft: spacing.xs / 2,
    textTransform: 'capitalize',
  },
  evidenceScroll: {
    marginTop: spacing.xs,
  },
  attachmentCard: {
    width: 120,
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border + '40',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  commentCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentLabel: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  resolutionCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  resolutionOutcome: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.success,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  resolutionNotes: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  resolutionAmount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  resolutionDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginTop: spacing.xs,
  },
  timeline: {
    marginTop: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  timelineLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  timelineDate: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  actionButtonGradient: {
    flex: 1,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
  conversationCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
    backgroundColor: colors.background,
  },
  conversationDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  chatButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
});

export default DisputeDetailScreen;

