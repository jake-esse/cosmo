export interface UserAppShares {
  app_id: string
  user_id: string
  total_shares: number
  last_transaction_date: string
  created_at: string
}

export interface App {
  id: string
  name: string
  slug: string
  icon_url?: string
  equity_pool_size: number
  metadata?: Record<string, any>
  created_at: string
}

export interface AppWithShares extends App {
  user_shares: number
  ownership_percentage: number
  estimated_value: number
}

export interface EquityTransaction {
  id: string
  user_id: string
  app_id?: string
  transaction_type: 'earn' | 'spend' | 'transfer' | 'system'
  amount: number
  balance_after: number
  description?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface TransactionWithApp extends EquityTransaction {
  app_name?: string
  app_icon?: string
}

export interface PortfolioStats {
  total_value: number
  total_apps: number
  average_ownership: number
  growth_percentage: number
  total_shares: number
}

export interface SharesPageData {
  portfolio: PortfolioStats
  apps: AppWithShares[]
  recentTransactions: TransactionWithApp[]
}