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

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  const dataCollection = [
    { userType: 'Drivers', data: 'Name, phone, email, National ID, driving license, Certificate of Good Conduct, PSV badge, photo, location, experience, ratings' },
    { userType: 'Recruiters', data: 'Company name, contact person, phone, email, payment details, subscription history' },
    { userType: 'All Users', data: 'IP address, device info, browser type, usage patterns, cookies' },
  ];

  const dataUsage = [
    { purpose: 'Create and manage your account', legalBasis: 'Contract' },
    { purpose: 'Verify driver documents', legalBasis: 'Legitimate Interest' },
    { purpose: 'Match drivers with job opportunities', legalBasis: 'Contract' },
    { purpose: 'Process payments and subscriptions', legalBasis: 'Contract' },
    { purpose: 'Send job alerts and notifications', legalBasis: 'Consent' },
    { purpose: 'Improve platform performance', legalBasis: 'Legitimate Interest' },
    { purpose: 'Prevent fraud and ensure security', legalBasis: 'Legitimate Interest' },
    { purpose: 'Comply with legal obligations', legalBasis: 'Legal Obligation' },
  ];

  const dataRetention = [
    { dataType: 'Account & profile data', retentionPeriod: 'Until deletion + 3 years' },
    { dataType: 'Payment & transaction records', retentionPeriod: '7 years (per KRA)' },
    { dataType: 'Driver documents', retentionPeriod: 'Until expiry or account deletion' },
    { dataType: 'System logs', retentionPeriod: '90 days' },
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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

        {/* Section 1: Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionContent}>
            TRUK Africa ("We") respects your privacy and is committed to protecting your personal data under the Kenya Data Protection Act, 2019.
          </Text>
          <Text style={styles.sectionContent}>
            This Privacy Policy explains how we collect, use, store, and protect your information when you use www.trukafrica.com and our mobile apps.
          </Text>
        </View>

        {/* Section 2: Data We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Data We Collect</Text>
          <View style={styles.tableContainer}>
            {dataCollection.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>{item.userType}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellText}>{item.data}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: How We Use Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Data</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Purpose</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Legal Basis</Text>
            </View>
            {dataUsage.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.tableCellText}>{item.purpose}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={styles.tableCellText}>{item.legalBasis}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: Data Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Sharing</Text>
          <Text style={styles.sectionContent}>
            We share your data only with:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Payment processors</Text> (Safaricom M-PESA, Paystack) – encrypted and PCI-compliant.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Verified recruiters</Text> – only approved driver profiles and contact info (with consent).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Law enforcement or regulators</Text> – when required by Kenyan law.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Trusted service providers</Text> (cloud hosting, analytics) – under strict data processing agreements.
              </Text>
            </View>
          </View>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              We never sell your personal data.
            </Text>
          </View>
        </View>

        {/* Section 5: Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>All data is encrypted in transit (TLS/HTTPS) and at rest (AES-256).</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Access is restricted and audited.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Regular penetration testing and security updates.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>In case of a breach, we will notify you and the Office of the Data Protection Commissioner within 72 hours.</Text>
            </View>
          </View>
        </View>

        {/* Section 6: Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights (Under Kenya Data Protection Act)</Text>
          <Text style={styles.sectionContent}>
            You have the right to:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Access a copy of your data.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Correct inaccurate information.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Delete your data (subject to legal retention).</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Object to processing.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Restrict processing.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Withdraw consent at any time.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Lodge a complaint with the ODPC.</Text>
            </View>
          </View>
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>
              Email your request to: <Text style={styles.linkText}>hello@trukafrica.com</Text>
            </Text>
          </View>
        </View>

        {/* Section 7: Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Retention</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Data Type</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Retention Period</Text>
            </View>
            {dataRetention.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <Text style={styles.tableCellText}>{item.dataType}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={styles.tableCellText}>{item.retentionPeriod}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 8: Cookies & Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies & Tracking</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Essential cookies:</Text> Required for login, security, and core functionality.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Analytics cookies:</Text> Optional – help us improve the app (you can disable).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Third-party services:</Text> Paystack, Google Analytics – see their privacy policies.
              </Text>
            </View>
          </View>
          <Text style={styles.sectionContent}>
            Manage preferences in Settings {'>'} Privacy.
          </Text>
        </View>

        {/* Section 9: Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children&apos;s Privacy</Text>
          <Text style={styles.sectionContent}>
            TRUK Africa is not intended for users under 18. We do not knowingly collect data from minors.
          </Text>
        </View>

        {/* Section 10: International Data Transfers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.sectionContent}>
            Your data may be processed in Kenya, EU, or US. We ensure adequate safeguards using:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Standard Contractual Clauses (SCCs)</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Binding Corporate Rules (where applicable)</Text>
            </View>
          </View>
        </View>

        {/* Section 11: Contact DPO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Our Data Protection Officer</Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>DPO: Data Protection Team</Text>
            <Text style={styles.contactText}>
              Email: <Text style={styles.linkText}>hello@trukafrica.com</Text>
            </Text>
            <Text style={styles.contactText}>
              Phone: <Text style={styles.linkText}>+254 758 594 951</Text>
            </Text>
            <Text style={styles.contactText}>
              Response within 7 business days.
            </Text>
          </View>
        </View>

        {/* Section 12: Changes to Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
          <Text style={styles.sectionContent}>
            We may update this Privacy Policy. Changes will be posted on this page with the updated date. Continued use means you accept the changes.
          </Text>
        </View>

        {/* Consent Statement */}
        <View style={styles.consentBox}>
          <Text style={styles.consentText}>
            By using TRUK Africa, you consent to this Privacy Policy.
          </Text>
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
    marginBottom: spacing.sm,
  },
  tableContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '30',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  tableHeader: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '30',
  },
  tableHeaderText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    padding: spacing.md,
  },
  tableCell: {
    padding: spacing.md,
    flex: 1,
  },
  tableCellText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: spacing.sm,
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
  bulletText: {
    flex: 1,
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  highlightBox: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  highlightText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 22,
  },
  contactBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
  },
  contactLabel: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  consentBox: {
    backgroundColor: colors.primary + '10',
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  consentText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default PrivacyPolicyScreen;

