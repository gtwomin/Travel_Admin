export interface OrderSummary {
  orderId: number;
  orderNumber: string;
  primaryTripName: string;
  totalQuantity: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string | null;
  createdAt: string;
}
export interface OrderPayment {
  paymentId: number;
  amount: number;
  status: string;
  transactionId: string | null;
  paidAt: string | null;
}
export interface OrderDetail {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  contact: { contactName: string; contactEmail: string; countryCode: string; contactPhone: string };
  items: { orderItemId: number; tripName: string; quantity: number; subtotal: number; orderItemStatus: string }[];
  payments: OrderPayment[];
}
