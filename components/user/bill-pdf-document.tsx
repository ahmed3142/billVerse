import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { BUILDING_NAME } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatShortDate, getMonthLabel, getDueDate } from "@/lib/utils";
import type { CommonBill, IndividualBill, MonthlyStatement, PaymentHistory } from "@/types/domain";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    color: "#475569",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1e3a8a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
    color: "#64748b",
    fontSize: 10,
  },
});

export function BillPdfDocument({
  flat,
  statement,
  commonBill,
  individualBill,
  payments,
}: {
  flat: { flatNumber: string; ownerName: string };
  statement: MonthlyStatement;
  commonBill: CommonBill;
  individualBill: IndividualBill;
  payments: PaymentHistory[];
}) {
  const dueDate = getDueDate(statement);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{BUILDING_NAME}</Text>
          <Text style={styles.subtitle}>Monthly Bill Statement</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.box}>
            <Text>Flat: {flat.flatNumber}</Text>
            <Text>Owner: {flat.ownerName}</Text>
            <Text>Month: {getMonthLabel(statement.month, statement.year)}</Text>
          </View>
          <View style={styles.box}>
            <Text>Due Date: {formatShortDate(dueDate)}</Text>
            <Text>Status: {statement.paymentStatus.toUpperCase()}</Text>
            <Text>Generated: {formatDateTime(statement.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Bills (Your Share)</Text>
          <View style={styles.row}>
            <Text>Total Common Bills</Text>
            <Text>{formatCurrency(commonBill.electricity + commonBill.water + commonBill.gas + commonBill.garbage + commonBill.projectSecurity + commonBill.cleaner + commonBill.others)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Your Share</Text>
            <Text>{formatCurrency(statement.commonShare)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Electricity</Text>
            <Text>{formatCurrency(statement.commonBreakdown.electricity)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Water</Text>
            <Text>{formatCurrency(statement.commonBreakdown.water)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Gas</Text>
            <Text>{formatCurrency(statement.commonBreakdown.gas)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Garbage</Text>
            <Text>{formatCurrency(statement.commonBreakdown.garbage)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Security</Text>
            <Text>{formatCurrency(statement.commonBreakdown.projectSecurity)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Cleaner</Text>
            <Text>{formatCurrency(statement.commonBreakdown.cleaner)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Others</Text>
            <Text>{formatCurrency(statement.commonBreakdown.others)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Individual Bills</Text>
          <View style={styles.row}>
            <Text>Electricity</Text>
            <Text>{formatCurrency(individualBill.electricity)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Water</Text>
            <Text>{formatCurrency(individualBill.water)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Gas</Text>
            <Text>{formatCurrency(individualBill.gas)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Dish Line</Text>
            <Text>{formatCurrency(individualBill.dishLine)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Internet Line</Text>
            <Text>{formatCurrency(individualBill.internetLine)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Individual Total</Text>
            <Text>{formatCurrency(statement.individualTotal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.row}>
            <Text>Common Bills</Text>
            <Text>{formatCurrency(statement.commonShare)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Individual Bills</Text>
            <Text>{formatCurrency(statement.individualTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Previous Due</Text>
            <Text>{formatCurrency(statement.previousDue)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Amount Paid</Text>
            <Text>{formatCurrency(statement.amountPaid)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total Due</Text>
            <Text>{formatCurrency(statement.totalDue)}</Text>
          </View>
        </View>

        {payments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.row}>
                <Text>{formatShortDate(payment.paymentDate)} · {payment.paymentMethod}</Text>
                <Text>{formatCurrency(payment.amount)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generated by BillVerse on {formatDateTime(statement.updatedAt)}.
        </Text>
      </Page>
    </Document>
  );
}
