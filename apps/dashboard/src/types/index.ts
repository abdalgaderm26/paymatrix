export interface IUser {
  _id: string;
  telegram_id: number;
  username: string;
  full_name: string;
  wallet_balance: number;
  role: string;
  language: string;
  referred_by: number | null;
  is_banned: boolean;
  total_earned_from_referrals: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITransaction {
  _id: string;
  user_id: IUser | string;
  type: 'deposit' | 'payment' | 'withdraw' | 'earning';
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_file_id?: string;
  createdAt: string;
}

export interface IOrder {
  _id: string;
  user_id: IUser | string;
  service_id: IService | string;
  price_usd: number;
  exchange_rate: number;
  final_price: number;
  currency: string;
  payment_method: string;
  status: string;
  createdAt: string;
}

export interface IService {
  _id: string;
  vendor_id: string;
  name: string;
  description: string;
  price_usd: number;
  type: string;
  is_active: boolean;
  delivery_details: string;
  createdAt: string;
}

export interface ISetting {
  key: string;
  value: string;
}

export interface IStats {
  users: {
    totalUsers: number;
    totalBalance: number;
    bannedUsers: number;
    activeToday: number;
  };
  transactions: {
    totalDeposits: number;
    totalPayments: number;
    pendingCount: number;
    totalRevenue: number;
  };
  orders: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSales: number;
  };
  services: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface PaginatedResponse<T> {
  total: number;
  pages: number;
  [key: string]: T[] | number;
}
