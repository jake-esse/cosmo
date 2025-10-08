"use client"

import { PageTransition } from "@/components/ui/transitions"
import { Wallet, TrendingUp, Award, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react"

export default function EquityWalletPage() {
  const transactions = [
    { id: 1, type: "earn", description: "Referred a friend", points: 50, date: "Yesterday" },
    { id: 2, type: "earn", description: "Premium subscription", points: 200, date: "2 days ago" },
    { id: 3, type: "spend", description: "Redeemed for Pro features", points: -100, date: "5 days ago" },
    { id: 4, type: "earn", description: "App usage reward", points: 25, date: "1 week ago" }
  ]
  
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Equity Wallet</h1>
          <p className="text-gray-600">Track your ownership in the Cosmo ecosystem</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card-section">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="h-5 w-5 text-sky-500" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-3xl font-bold text-black">485</p>
            <p className="text-sm text-gray-600">Equity Points</p>
          </div>
          
          <div className="card-section">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-xs text-gray-500">This Month</span>
            </div>
            <p className="text-3xl font-bold text-black">+285</p>
            <p className="text-sm text-gray-600">Points Earned</p>
          </div>
          
          <div className="card-section">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-5 w-5 text-yellow-300" />
              <span className="text-xs text-gray-500">Rank</span>
            </div>
            <p className="text-3xl font-bold text-black">Silver</p>
            <p className="text-sm text-gray-600">Member Tier</p>
          </div>
          
          <div className="card-section">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-xs text-gray-500">Member</span>
            </div>
            <p className="text-3xl font-bold text-black">30</p>
            <p className="text-sm text-gray-600">Days</p>
          </div>
        </div>
        
        {/* Earning Opportunities */}
        <div className="card-section mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">Ways to Earn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-sunny-50 rounded-lg border border-sunny-200">
              <div>
                <p className="font-medium text-black">Invite Friends</p>
                <p className="text-sm text-gray-600">Share your code</p>
              </div>
              <span className="text-xl font-bold text-sunny-600">+50</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-black">Go Premium</p>
                <p className="text-sm text-gray-600">Upgrade your plan</p>
              </div>
              <span className="text-xl font-bold text-gray-700">+200</span>
            </div>
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="card-base">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-black">Transaction History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    tx.type === 'earn' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'earn' ? (
                      <ArrowDownRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-black">{tx.description}</p>
                    <p className="text-sm text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <span className={`text-lg font-semibold ${
                  tx.type === 'earn' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.type === 'earn' ? '+' : ''}{tx.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}