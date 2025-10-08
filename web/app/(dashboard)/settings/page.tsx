"use client"

import { PageTransition } from "@/components/ui/transitions"
import { Bell, Lock, Globe, Palette } from "lucide-react"

export default function SettingsPage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences</p>
        </div>
        
        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                <input
                  type="text"
                  placeholder="Guest User"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          </div>
          
          {/* Preferences */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Notifications</p>
                    <p className="text-xs text-gray-500">Receive updates about your equity and apps</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Dark Mode</p>
                    <p className="text-xs text-gray-500">Use dark theme</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-black">Language</p>
                    <p className="text-xs text-gray-500">Select your preferred language</p>
                  </div>
                </div>
                <select className="px-3 py-1 rounded-lg border border-gray-200 text-sm">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Security */}
          <div className="card-section">
            <h2 className="text-lg font-semibold text-black mb-4">Security</h2>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-black">Change Password</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-black">Two-Factor Authentication</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-4">
            <button className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors order-2 sm:order-1">
              Cancel
            </button>
            <button className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium order-1 sm:order-2">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

// Import missing icon
import { ChevronRight, Shield } from "lucide-react"