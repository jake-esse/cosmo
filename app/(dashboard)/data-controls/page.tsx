"use client"

import { PageTransition } from "@/components/ui/transitions"
import { Shield, Eye, Download, Trash2, Lock, AlertCircle } from "lucide-react"

export default function DataControlsPage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Data Controls</h1>
          <p className="text-gray-600">Manage your privacy and data settings</p>
        </div>
        
        {/* Privacy Overview */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-sky-500 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-black mb-2">Your Privacy Matters</h2>
              <p className="text-sm text-gray-700">
                At Cosmo, you own your data. You have complete control over what information is collected,
                how it's used, and when it's deleted. Your conversations are encrypted and never sold to third parties.
              </p>
            </div>
          </div>
        </div>
        
        {/* Data Management Options */}
        <div className="space-y-6">
          {/* Data Collection */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Data Collection</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Usage Analytics</p>
                    <p className="text-xs text-gray-500">Help us improve by sharing app usage data</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Chat History</p>
                    <p className="text-xs text-gray-500">Save conversations for continuity</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Performance Metrics</p>
                    <p className="text-xs text-gray-500">Share AI model performance data</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Data Actions */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Data Management</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-black">Export Your Data</p>
                    <p className="text-xs text-gray-500">Download all your data in JSON format</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-black">Encryption Settings</p>
                    <p className="text-xs text-gray-500">Configure end-to-end encryption</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-600">Delete All Data</p>
                    <p className="text-xs text-red-500">Permanently remove all your data</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
          
          {/* Data Retention */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Data Retention</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat History Retention</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20">
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>1 year</option>
                  <option>Forever</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Analytics Data Retention</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20">
                  <option>7 days</option>
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>1 year</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Info Notice */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                Changes to data settings take effect immediately. Deleted data cannot be recovered.
                For questions about your privacy rights, contact privacy@cosmo.ai
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

// Import missing icons
import { MessageSquare, TrendingUp, ChevronRight } from "lucide-react"