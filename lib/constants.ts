import type {
  CommonBillFieldKey,
  IndividualBillFieldKey,
  PaymentMethod,
  SessionUser,
} from "@/types/domain";

export const APP_NAME = "BillVerse";
export const APP_SUBTITLE = "Building Billing";
export const BUILDING_NAME = "FlatBill Residency";
export const BILL_DUE_DAY = 5;
export const THEME_STORAGE_KEY = "billverse-theme";

export const COMMON_BILL_FIELDS: Array<{
  key: CommonBillFieldKey;
  label: string;
}> = [
  { key: "electricity", label: "Electricity" },
  { key: "water", label: "Water" },
  { key: "gas", label: "Gas" },
  { key: "garbage", label: "Garbage" },
  { key: "projectSecurity", label: "Security" },
  { key: "cleaner", label: "Cleaner" },
  { key: "others", label: "Other" },
];

export const INDIVIDUAL_BILL_FIELDS: Array<{
  key: IndividualBillFieldKey;
  label: string;
}> = [
  { key: "electricity", label: "Electricity" },
  { key: "water", label: "Water" },
  { key: "gas", label: "Gas" },
  { key: "dishLine", label: "Dish" },
  { key: "internetLine", label: "Internet" },
];

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "card", label: "Card" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "pending", label: "Pending" },
] as const;

export function getNavigationItems(user: SessionUser) {
  if (user.role === "admin") {
    return [
      { href: "/admin/dashboard", label: "Overview" },
      { href: "/admin/bills/new", label: "Bills" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/flats", label: "Flats" },
      { href: "/status", label: "Status" },
    ];
  }

  return [
    { href: "/dashboard", label: "Current bill" },
    { href: "/history", label: "History" },
    { href: "/notifications", label: "Notifications" },
    { href: "/status", label: "Status" },
  ];
}
