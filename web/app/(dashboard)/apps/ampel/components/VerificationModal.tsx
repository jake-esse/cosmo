/**
 * Component: VerificationModal
 * Purpose: Verification flow for claiming shares
 * Regulatory Requirement: Investor acknowledgment and suitability
 * State: Manages checkbox states and submission
 */

import { useState } from "react"
import { X, CheckCircle, AlertCircle } from "lucide-react"

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function VerificationModal({ isOpen, onClose, onConfirm }: VerificationModalProps) {
  const [hasReviewedEducation, setHasReviewedEducation] = useState(false)
  const [understandsRisks, setUnderstandsRisks] = useState(false)
  
  const handleConfirm = () => {
    if (hasReviewedEducation && understandsRisks) {
      localStorage.setItem('ampel_verified', 'true')
      onConfirm()
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-brand text-2xl text-black">Complete Verification</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Introduction */}
          <div className="bg-sky-50 rounded-lg p-4">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sky-900 mb-1">You&apos;re almost there!</p>
                <p className="text-sm text-sky-800">
                  Please confirm that you&apos;ve reviewed the educational materials and understand 
                  the terms of this equity incentive program.
                </p>
              </div>
            </div>
          </div>
          
          {/* Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={hasReviewedEducation}
                onChange={(e) => setHasReviewedEducation(e.target.checked)}
                className="mt-1 h-4 w-4 text-sky-500 rounded border-gray-300 focus:ring-sky-500"
              />
              <div className="flex-1">
                <span className="font-medium text-black">
                  I have reviewed the educational materials
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  I confirm that I have read and understood all sections in the Education tab, 
                  including how the equity incentive program works.
                </p>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={understandsRisks}
                onChange={(e) => setUnderstandsRisks(e.target.checked)}
                className="mt-1 h-4 w-4 text-sky-500 rounded border-gray-300 focus:ring-sky-500"
              />
              <div className="flex-1">
                <span className="font-medium text-black">
                  I understand the risks and restrictions
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  I understand that the shares may become worthless, cannot be sold for 1 year, 
                  and that this is a high-risk speculative investment in a pre-revenue startup.
                </p>
              </div>
            </label>
          </div>
          
          {/* ID Verification Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">ID Verification Coming Soon</p>
                <p className="text-sm text-amber-800">
                  Note: Identity verification will be required before shares are distributed. 
                  This feature is currently in development and will be available soon.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasReviewedEducation || !understandsRisks}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              hasReviewedEducation && understandsRisks
                ? 'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-lg'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirm & Receive Shares
          </button>
        </div>
      </div>
    </div>
  )
}