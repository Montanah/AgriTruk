import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

const TermsAndConditionsScreen = () => {
  const navigation = useNavigation();

  const termsContent = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using TRUK Africa (the "Platform"), including the website at www.trukafrica.com and mobile applications, you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree, do not use the Platform.',
    },
    {
      title: '2. Definitions',
      items: [
        { term: '"We," "Us," "Our," "TRUK Africa"', definition: 'TRUK Africa Limited, a company registered in Kenya.' },
        { term: '"You," "User"', definition: 'Any individual or entity using the Platform.' },
        { term: '"Recruiter"', definition: 'A company or individual seeking to hire drivers.' },
        { term: '"Driver"', definition: 'A job seeker registered to find employment.' },
        { term: '"Subscription"', definition: 'Paid access to premium features.' },
      ],
    },
    {
      title: '3. Eligibility',
      content: 'You must be:\n• At least 18 years old.\n• Legally capable of entering into contracts.\n• A licensed driver (for Drivers) or a registered business (for Recruiters).',
    },
    {
      title: '4. Account Registration',
      items: [
        { text: 'You must provide accurate, complete, and current information.' },
        { text: 'You are responsible for maintaining the confidentiality of your account.' },
        { text: 'You are liable for all activities under your account.' },
        { text: 'We may suspend or terminate accounts for violations.' },
      ],
    },
    {
      title: '5. Subscriptions & Payments',
      items: [
        { text: 'Subscriptions are required to access the Driver Job Board.' },
        { text: 'Payments are processed via M-PESA or Paystack (card).' },
        { text: 'All fees are in Kenyan Shillings (KES) and non-refundable.' },
        { text: 'Subscriptions auto-renew unless canceled.' },
        { text: 'You may cancel anytime; access continues until the end of the billing cycle.' },
        { text: 'We reserve the right to change pricing with 30 days\' notice.' },
      ],
    },
    {
      title: '6. Recruiter Responsibilities',
      content: 'You agree to:\n• Use the Platform only for lawful hiring purposes.\n• Not contact drivers for spam, harassment, or illegal activities.\n• Respect contact limits as per your plan.\n• Not share driver data with third parties without consent.',
    },
    {
      title: '7. Driver Responsibilities',
      content: 'You agree to:\n• Provide truthful and up-to-date information and documents.\n• Upload valid licenses, certificates, and ID.\n• Respond promptly to legitimate job inquiries.\n• Not create multiple accounts.',
    },
    {
      title: '8. Document Verification',
      items: [
        { text: 'We verify driver documents (license, Good Conduct, PSV, etc.).' },
        { text: 'Verification status: Pending → Approved → Rejected.' },
        { text: 'We are not liable for forged documents.' },
        { text: 'Rejected drivers may reapply after 30 days.' },
      ],
    },
    {
      title: '9. Prohibited Activities',
      content: 'You may not:\n• Use bots, scrapers, or automated tools.\n• Impersonate others.\n• Post false, defamatory, or harmful content.\n• Attempt to reverse-engineer the Platform.\n• Violate any applicable law.',
    },
    {
      title: '10. Intellectual Property',
      content: '• All content, logos, and code are owned by TRUK Africa.\n• You are granted a limited, non-transferable license to use the Platform.\n• You may not copy, modify, or distribute content without permission.',
    },
    {
      title: '11. Disclaimers',
      content: '• The Platform is provided "as is" and "as available".\n• We do not guarantee job placement or hiring.\n• We are not responsible for disputes between users.\n• Internet delays or failures are not our liability.',
    },
    {
      title: '12. Limitation of Liability',
      content: 'To the fullest extent permitted by law:\n• We are not liable for indirect, incidental, or consequential damages.\n• Our total liability shall not exceed the amount you paid in the last 12 months.',
    },
    {
      title: '13. Termination',
      items: [
        { text: 'We may suspend or terminate your access at any time, with or without cause.' },
        { text: 'You may delete your account via settings.' },
        { text: 'Upon termination, your right to use the Platform ceases immediately.' },
      ],
    },
    {
      title: '14. Governing Law',
      content: 'These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi.',
    },
    {
      title: '15. Changes to Terms',
      items: [
        { text: 'We may update these Terms at any time.' },
        { text: 'Changes are effective upon posting.' },
        { text: 'Continued use constitutes acceptance.' },
      ],
    },
    {
      title: '16. Contact Us',
      content: 'TRUK Africa Limited\nEmail: hello@trukafrica.com\nPhone: +254 758 594 951\nWebsite: www.trukafrica.com\nAddress: Nairobi, Kenya',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.lastUpdated}>
          <Text style={styles.lastUpdatedText}>Last Updated: November 2, 2025</Text>
        </View>

        {termsContent.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.content && (
              <Text style={styles.sectionContent}>{section.content}</Text>
            )}
            
            {section.items && (
              <View style={styles.itemsContainer}>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.item}>
                    {item.term ? (
                      <>
                        <Text style={styles.itemTerm}>{item.term}:</Text>
                        <Text style={styles.itemDefinition}>{item.definition}</Text>
                      </>
                    ) : (
                      <View style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.itemText}>{item.text}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  lastUpdated: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  lastUpdatedText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  sectionContent: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  itemsContainer: {
    marginTop: spacing.sm,
  },
  item: {
    marginBottom: spacing.md,
  },
  itemTerm: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemDefinition: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bullet: {
    fontSize: fonts.size.md,
    color: colors.primary,
    marginRight: spacing.sm,
    fontWeight: 'bold',
  },
  itemText: {
    flex: 1,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});

export default TermsAndConditionsScreen;

