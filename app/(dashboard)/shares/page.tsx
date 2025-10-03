"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { VineIcon } from "@/components/icons"
import { getUserBalance } from "@/app/(auth)/actions"
import { PageLayout } from "@/components/layout/PageLayout"
import type {
  AppWithShares,
  TransactionWithApp
} from "@/types/shares"

interface AppSharesExtended extends AppWithShares {
  total_issued: number
  total_shareholders: number
}

export default function SharesPage() {
  const [apps, setApps] = useState<AppSharesExtended[]>([])
  const [transactions, setTransactions] = useState<TransactionWithApp[]>([])
  const [loading, setLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState(0)
  const [ampelShares, setAmpelShares] = useState(0)
  const [appSharesTotal, setAppSharesTotal] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadSharesData()
  }, [])

  async function loadSharesData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get total equity balance using the same method as dashboard
      const balance = await getUserBalance(user.id)
      if (balance) {
        setTotalBalance(balance.total_balance || 0)
      }

      // Get ALL equity transactions to calculate platform equity correctly
      const { data: allEquity } = await supabase
        .from('equity_transactions')
        .select('amount, transaction_type, app_id')
        .eq('user_id', user.id)
      
      // Calculate total platform equity (null or Ampel app_id)
      let platformEquity = 0
      let appEquity = 0
      
      if (allEquity) {
        allEquity.forEach(tx => {
          const amount = Number(tx.amount)
          const adjustedAmount = tx.transaction_type === 'credit' ? amount : -amount
          
          // Platform equity includes null app_id or the Ampel app ID
          if (!tx.app_id || tx.app_id === '00000000-0000-0000-0000-000000000001') {
            platformEquity += adjustedAmount
          } else {
            appEquity += adjustedAmount
          }
        })
      }
      
      setAmpelShares(platformEquity)
      setAppSharesTotal(appEquity)

      // Get user's shares by app
      const { data: sharesData, error: sharesError } = await supabase
        .from('user_app_shares')
        .select('*')
        .eq('user_id', user.id)

      if (sharesError) {
        console.error('Error loading shares:', sharesError)
        return
      }

      // Get aggregated data for all apps (total shareholders and total issued)
      const { data: appAggregates } = await supabase
        .from('user_app_shares')
        .select('app_id, user_id, shares_owned')
      
      // Create a map of app_id to aggregate data
      const aggregateMap = new Map<string, { totalShareholders: Set<string>, totalIssued: number }>()
      
      if (appAggregates) {
        appAggregates.forEach(record => {
          if (!aggregateMap.has(record.app_id)) {
            aggregateMap.set(record.app_id, { 
              totalShareholders: new Set(), 
              totalIssued: 0 
            })
          }
          const appData = aggregateMap.get(record.app_id)!
          appData.totalShareholders.add(record.user_id)
          appData.totalIssued += Number(record.shares_owned)
        })
      }

      // Get app details for each share record
      const appShares: AppSharesExtended[] = []
      
      if (sharesData && sharesData.length > 0) {
        for (const shareRecord of sharesData) {
          const { data: appData } = await supabase
            .from('apps')
            .select('*')
            .eq('id', shareRecord.app_id)
            .single()
          
          if (appData) {
            const aggregates = aggregateMap.get(shareRecord.app_id)
            
            appShares.push({
              ...appData,
              user_shares: Number(shareRecord.shares_owned),
              ownership_percentage: 0, // Not used anymore
              estimated_value: 0, // Not used anymore
              total_issued: aggregates?.totalIssued || Number(appData.equity_distributed) || 0,
              total_shareholders: aggregates?.totalShareholders.size || 0
            })
          }
        }
      }

      // Handle Ampel platform shares (using the calculated platformEquity)
      if (platformEquity > 0) {
        // Get Ampel app info
        const { data: ampelApp } = await supabase
          .from('apps')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single()

        if (ampelApp) {
          // Check if Ampel already exists in the list from user_app_shares
          const existingAmpelIndex = appShares.findIndex(app => app.id === ampelApp.id)
          
          const ampelAggregates = aggregateMap.get('00000000-0000-0000-0000-000000000001')
          
          if (existingAmpelIndex >= 0) {
            // Update existing Ampel entry with platform equity
            appShares[existingAmpelIndex].user_shares = platformEquity
          } else {
            // Add Ampel to the list with platform equity
            appShares.push({
              ...ampelApp,
              user_shares: platformEquity,
              ownership_percentage: 0,
              estimated_value: 0,
              total_issued: ampelAggregates?.totalIssued || Number(ampelApp.equity_distributed) || 0,
              total_shareholders: ampelAggregates?.totalShareholders.size || 0
            })
          }
        }
      }

      // Get recent transactions
      const { data: txData, error: txError } = await supabase
        .from('equity_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (txError) {
        console.error('Error loading transactions:', txError)
      }

      // Map transactions with app info
      const mappedTransactions: TransactionWithApp[] = await Promise.all(
        (txData || []).map(async (tx) => {
          const appId = tx.app_id || '00000000-0000-0000-0000-000000000001'
          const { data: appData } = await supabase
            .from('apps')
            .select('name, icon_url')
            .eq('id', appId)
            .single()

          return {
            ...tx,
            app_name: appData?.name || 'Ampel',
            app_icon: appData?.icon_url
          }
        })
      )

      setApps(appShares)
      setTransactions(mappedTransactions)
    } catch (error) {
      console.error('Error in loadSharesData:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageLayout pageName="Shares">
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout pageName="Shares">
      <div className="p-4 md:p-8">
          
          {/* Portfolio Summary Card */}
          <div className="mb-8 bg-[#485C11] text-white rounded-[20px] md:rounded-[30px] p-6 md:p-8">
            <h2 className="font-brand text-heading-lg mb-6">Portfolio Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="font-sans text-label-md text-[#DFECC6] mb-1">Total Equity Balance</p>
                <p className="font-brand text-3xl">{totalBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-sans text-label-md text-[#DFECC6] mb-1">Platform Shares</p>
                <p className="font-brand text-2xl">{ampelShares.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-sans text-label-md text-[#DFECC6] mb-1">App Shares</p>
                <p className="font-brand text-2xl">{appSharesTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {/* Shares Table in shaded box */}
          <div className="mb-8 md:mb-12 bg-[#DFECC6]/20 rounded-[20px] p-4 md:p-6 border border-[#DFECC6]/40">
            {apps.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-sans text-body-lg text-slate-500">No shares yet</p>
                <p className="font-sans text-body-md text-slate-400 mt-1">
                  Start using apps to earn equity
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[500px]">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[20%]" />
                    <col className="w-[22.5%]" />
                    <col className="w-[22.5%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#B0C4C9]/40">
                      <th className="text-left py-3 px-4 font-brand text-xl font-normal text-slate-900">App</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">Your Shares</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">Total Issued</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">Shareholders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => (
                      <tr key={app.id} className="border-b border-[#B0C4C9]/20 hover:bg-[#DFECC6]/10 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {app.name === 'Ampel' ? (
                              <VineIcon className="h-8 w-8 text-slate-900" />
                            ) : app.icon_url ? (
                              <img 
                                src={app.icon_url} 
                                alt={app.name}
                                className="h-8 w-8 rounded-[20px]"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-[20px] bg-gradient-to-br from-[#3985AB] to-[#485C11] flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {app.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-sans font-medium text-slate-900">{app.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-sans font-semibold text-slate-900">
                          {app.user_shares.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-sans text-slate-600">
                          {(app.total_issued || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-sans text-slate-600">
                          {(app.total_shareholders || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Rewards Table with outline box */}
          <div className="border border-[#B0C4C9]/40 rounded-[20px] p-4 md:p-6">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-sans text-body-lg text-slate-500">No rewards yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[500px]">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[20%]" />
                    <col className="w-[22.5%]" />
                    <col className="w-[22.5%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#B0C4C9]/40">
                      <th className="text-left py-3 px-4 font-brand text-xl font-normal text-slate-900">Reward History</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">App</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">Date</th>
                      <th className="text-right py-3 px-4 font-brand text-xl font-normal text-slate-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[#B0C4C9]/20 hover:bg-[#DFECC6]/5 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-sans font-medium text-slate-900">
                            {tx.description || `${tx.transaction_type} shares`}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-sans text-slate-600">{tx.app_name}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-sans text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-sans font-semibold text-[#3985AB]">
                            {tx.transaction_type === 'credit' ? '+' : 
                             tx.transaction_type === 'debit' ? '-' : ''}
                            {Math.abs(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>
    </PageLayout>
  )
}