import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { BUILDING_NAME } from "@/lib/constants";
import { formatCurrency, formatDateTime, getMonthLabel } from "@/lib/utils";
import type { PublicStatusResponse } from "@/types/domain";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#475569",
  },
  meta: {
    fontSize: 10,
    color: "#475569",
    textAlign: "right",
    lineHeight: 1.5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  summaryLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#64748b",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  note: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#ffffff",
    color: "#475569",
    lineHeight: 1.5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eaf2f7",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe4ee",
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 9,
    textTransform: "uppercase",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    alignItems: "center",
  },
  cellFlat: {
    width: "10%",
    fontWeight: 700,
  },
  cellOwner: {
    width: "24%",
    paddingRight: 8,
  },
  cellMoney: {
    width: "14%",
    textAlign: "right",
  },
  cellStatus: {
    width: "12%",
    textAlign: "right",
    fontWeight: 700,
  },
  cellDate: {
    width: "12%",
    textAlign: "right",
    color: "#64748b",
  },
  footer: {
    marginTop: 14,
    fontSize: 9,
    color: "#64748b",
  },
});

const filterLabels = {
  all: "All",
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
} as const;

export function StatusBoardPdfDocument({
  data,
  generatedAt,
}: {
  data: PublicStatusResponse;
  generatedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{BUILDING_NAME}</Text>
            <Text style={styles.subtitle}>
              Public collection board for {getMonthLabel(data.period.month, data.period.year)}
            </Text>
          </View>
          <Text style={styles.meta}>
            Generated: {formatDateTime(generatedAt)}
            {"\n"}
            Filter: {filterLabels[data.filter]}
            {"\n"}
            Last updated: {data.lastUpdated ? formatDateTime(data.lastUpdated) : "No published update yet"}
            {"\n"}
            {"\n"}
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalCollected)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total due</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalDue)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>{formatCurrency(data.summary.outstanding)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Collection rate</Text>
            <Text style={styles.summaryValue}>{data.summary.collectionRate}%</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Text>
            Paid: {data.summary.countByStatus.paid} | Partial: {data.summary.countByStatus.partial} | Pending: {data.summary.countByStatus.pending} | Visible rows: {data.rows.length}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellFlat}>Flat</Text>
            <Text style={styles.cellOwner}>Owner</Text>
            <Text style={styles.cellMoney}>Due</Text>
            <Text style={styles.cellMoney}>Paid</Text>
            <Text style={styles.cellMoney}>Balance</Text>
            <Text style={styles.cellStatus}>Status</Text>
            <Text style={styles.cellDate}>Payment</Text>
          </View>

          {data.rows.map((row) => (
            <View key={row.statementId} style={styles.tableRow} wrap={false}>
              <Text style={styles.cellFlat}>{row.flatNumber}</Text>
              <Text style={styles.cellOwner}>{row.ownerName}</Text>
              <Text style={styles.cellMoney}>{formatCurrency(row.totalDue)}</Text>
              <Text style={styles.cellMoney}>{formatCurrency(row.amountPaid)}</Text>
              <Text style={styles.cellMoney}>{formatCurrency(row.balance)}</Text>
              <Text style={styles.cellStatus}>{row.paymentStatus.toUpperCase()}</Text>
              <Text style={styles.cellDate}>
                {row.paymentDate ? formatDateTime(row.paymentDate) : "-"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated by BillVerse.</Text>
      </Page>
    </Document>
  );
}
