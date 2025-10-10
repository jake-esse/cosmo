#!/bin/bash
#
# Mobile build script for Capacitor
# Temporarily moves API routes, route handlers, and Server Actions since they're not needed in static export
# (Mobile app will call production API at https://ampel.app)

set -e

echo "📱 Building for Capacitor mobile..."

# Create temp directory outside project for API routes, route handlers, and Server Actions
TEMP_DIR="/tmp/ampel-routes-$$"
mkdir -p "$TEMP_DIR"

# Ensure routes and actions are restored even if build fails
restore_routes() {
  echo "🔄 Restoring server-side routes and actions..."
  if [ -d "$TEMP_DIR/api" ]; then
    rm -rf app/api 2>/dev/null || true
    mv "$TEMP_DIR/api" app/api
  fi
  if [ -d "$TEMP_DIR/auth-callback" ]; then
    mkdir -p app/auth
    rm -rf app/auth/callback 2>/dev/null || true
    mv "$TEMP_DIR/auth-callback" app/auth/callback
  fi
  if [ -d "$TEMP_DIR/logout" ]; then
    rm -rf app/logout 2>/dev/null || true
    mv "$TEMP_DIR/logout" app/logout
  fi
  # Restore KYC pages
  if [ -d "$TEMP_DIR/kyc" ]; then
    rm -rf app/kyc 2>/dev/null || true
    mv "$TEMP_DIR/kyc" app/kyc
  fi
  # Restore compliance portal
  if [ -d "$TEMP_DIR/compliance" ]; then
    rm -rf "app/(compliance)" 2>/dev/null || true
    mv "$TEMP_DIR/compliance" "app/(compliance)"
  fi
  # Restore admin pages
  if [ -d "$TEMP_DIR/admin" ]; then
    mkdir -p "app/(dashboard)"
    rm -rf "app/(dashboard)/admin" 2>/dev/null || true
    mv "$TEMP_DIR/admin" "app/(dashboard)/admin"
  fi
  # Restore Server Actions
  if [ -f "$TEMP_DIR/auth-actions.ts" ]; then
    mv "$TEMP_DIR/auth-actions.ts" "app/(auth)/actions.ts"
  fi
  if [ -f "$TEMP_DIR/admin-actions.ts" ]; then
    mv "$TEMP_DIR/admin-actions.ts" "app/(dashboard)/admin/actions.ts"
  fi
  if [ -f "$TEMP_DIR/onboarding-actions.ts" ]; then
    mv "$TEMP_DIR/onboarding-actions.ts" "app/onboarding/actions.ts"
  fi
  if [ -f "$TEMP_DIR/notifications-actions.ts" ]; then
    mv "$TEMP_DIR/notifications-actions.ts" "lib/notifications/actions.ts"
  fi
  rm -rf "$TEMP_DIR"
}

# Set trap to restore routes on exit (success or failure)
trap restore_routes EXIT

# Move API routes, route handlers, Server Actions, and KYC pages outside project
echo "🔄 Temporarily moving server-side routes and actions..."
if [ -d "app/api" ]; then
  mv app/api "$TEMP_DIR/api"
fi
if [ -d "app/auth/callback" ]; then
  mv app/auth/callback "$TEMP_DIR/auth-callback"
fi
if [ -d "app/logout" ]; then
  mv app/logout "$TEMP_DIR/logout"
fi
# KYC pages use server-side features (cookies) - exclude from mobile build
# Mobile users will complete KYC on web at https://ampel.app
if [ -d "app/kyc" ]; then
  mv app/kyc "$TEMP_DIR/kyc"
fi
# Compliance portal uses server-side features (cookies) - exclude from mobile build
# Compliance portal is admin-only and accessed via web
if [ -d "app/(compliance)" ]; then
  mv "app/(compliance)" "$TEMP_DIR/compliance"
fi
# Admin pages use server-side features (cookies) - exclude from mobile build
# Admin portal is accessed via web only
if [ -d "app/(dashboard)/admin" ]; then
  mv "app/(dashboard)/admin" "$TEMP_DIR/admin"
fi
# Replace Server Actions with stubs (not compatible with static export)
# Mobile app will use production API at https://ampel.app instead

if [ -f "app/(auth)/actions.ts" ]; then
  mv "app/(auth)/actions.ts" "$TEMP_DIR/auth-actions.ts"
  cat > "app/(auth)/actions.ts" << 'EOF'
// Stub file for static export - mobile app uses production API
export async function signUp() { throw new Error('Server actions not available in static export') }
export async function signIn() { throw new Error('Server actions not available in static export') }
export async function signOut() { throw new Error('Server actions not available in static export') }
export async function resetPassword() { throw new Error('Server actions not available in static export') }
export async function updatePassword() { throw new Error('Server actions not available in static export') }
export async function completeUserReferral() { throw new Error('Server actions not available in static export') }
export async function getUserBalance() { throw new Error('Server actions not available in static export') }
export async function getUserReferralStats() { throw new Error('Server actions not available in static export') }
export async function applyReferralCode() { throw new Error('Server actions not available in static export') }
EOF
fi

if [ -f "app/(dashboard)/admin/actions.ts" ]; then
  mv "app/(dashboard)/admin/actions.ts" "$TEMP_DIR/admin-actions.ts"
  cat > "app/(dashboard)/admin/actions.ts" << 'EOF'
// Stub file for static export - mobile app uses production API
export async function completeReferralManually() { throw new Error('Server actions not available in static export') }
export async function testFraudDetection() { throw new Error('Server actions not available in static export') }
export async function testReferralValidation() { throw new Error('Server actions not available in static export') }
export async function toggleUserBlock() { throw new Error('Server actions not available in static export') }
export async function updateSecurityConfig() { throw new Error('Server actions not available in static export') }
export async function clearReferralAttempts() { throw new Error('Server actions not available in static export') }
export async function testIdempotency() { throw new Error('Server actions not available in static export') }
export async function validateAndApplyReferralCode() { throw new Error('Server actions not available in static export') }
export async function getAdminReferralStats() { throw new Error('Server actions not available in static export') }
EOF
fi

if [ -f "app/onboarding/actions.ts" ]; then
  mv "app/onboarding/actions.ts" "$TEMP_DIR/onboarding-actions.ts"
  cat > "app/onboarding/actions.ts" << 'EOF'
// Stub file for static export - mobile app uses production API
export async function completeEducationAcknowledgment() { throw new Error('Server actions not available in static export') }
export async function skipSharesForNow() { throw new Error('Server actions not available in static export') }
export async function trackSectionRead() { throw new Error('Server actions not available in static export') }
export async function getEducationProgress() { throw new Error('Server actions not available in static export') }
EOF
fi

if [ -f "lib/notifications/actions.ts" ]; then
  mv "lib/notifications/actions.ts" "$TEMP_DIR/notifications-actions.ts"
  cat > "lib/notifications/actions.ts" << 'EOF'
// Stub file for static export - mobile app uses production API
export async function markNotificationAsRead() { throw new Error('Server actions not available in static export') }
export async function markAllNotificationsAsRead() { throw new Error('Server actions not available in static export') }
export async function dismissNotification() { throw new Error('Server actions not available in static export') }
export async function getNotificationCount() { throw new Error('Server actions not available in static export') }
export async function getUserNotifications() { throw new Error('Server actions not available in static export') }
export async function broadcastSystemNotice() { throw new Error('Server actions not available in static export') }
EOF
fi

# Clean Next.js cache to ensure fresh build
echo "🧹 Cleaning build cache..."
rm -rf .next

# Build with static export
echo "🏗️  Building static export..."
NEXT_PUBLIC_BUILD_TARGET=mobile next build

# Routes will be automatically restored by the EXIT trap
echo "✨ Mobile build complete! Output in /out directory"
