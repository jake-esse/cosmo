/**
 * Quick test script to verify environment variables are loaded correctly
 * Run with: node test-config.js
 */

const path = require('path');
const fs = require('fs');

console.log('\n🔍 Testing Expo Environment Configuration\n');

// 1. Check if root .env.local exists
const rootEnvPath = path.resolve(__dirname, '../.env.local');
console.log('1. Checking root .env.local file...');
if (fs.existsSync(rootEnvPath)) {
  console.log('   ✅ Found:', rootEnvPath);
} else {
  console.log('   ❌ NOT FOUND:', rootEnvPath);
  process.exit(1);
}

// 2. Load and parse the .env.local file
console.log('\n2. Loading environment variables...');
const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
const expoVars = {};
const nextVars = {};

envContent.split('\n').forEach((line) => {
  if (line.trim() && !line.trim().startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    const cleanKey = key.trim();
    const cleanValue = value.replace(/^['"]|['"]$/g, '');

    if (cleanKey.startsWith('EXPO_PUBLIC_')) {
      expoVars[cleanKey] = cleanValue;
    } else if (cleanKey.startsWith('NEXT_PUBLIC_')) {
      nextVars[cleanKey] = cleanValue;
    }
  }
});

console.log(`   Found ${Object.keys(expoVars).length} EXPO_PUBLIC_* variables`);
console.log(`   Found ${Object.keys(nextVars).length} NEXT_PUBLIC_* variables`);

// 3. Check required Supabase variables
console.log('\n3. Checking required variables...');
const requiredVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
];

let allPresent = true;
requiredVars.forEach(varName => {
  if (expoVars[varName]) {
    const preview = expoVars[varName].substring(0, 30) + '...';
    console.log(`   ✅ ${varName}: ${preview}`);
  } else {
    console.log(`   ❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

// 4. Verify app.config.js exists
console.log('\n4. Checking app.config.js...');
const appConfigPath = path.join(__dirname, 'app.config.js');
if (fs.existsSync(appConfigPath)) {
  console.log('   ✅ app.config.js exists and will load root .env.local');
} else {
  console.log('   ❌ app.config.js NOT FOUND');
  allPresent = false;
}

// 5. Summary
console.log('\n' + '='.repeat(60));
if (allPresent) {
  console.log('✅ ALL CHECKS PASSED - Configuration is ready!');
  console.log('\nYou can now run:');
  console.log('  npm run start --workspace=@ampel/mobile');
  console.log('\nThe mobile app will:');
  console.log('  1. Load root .env.local via app.config.js');
  console.log('  2. Detect React Native platform automatically');
  console.log('  3. Use EXPO_PUBLIC_* prefixed variables');
  console.log('  4. Access config via: import { config } from "@ampel/shared/config"');
} else {
  console.log('❌ CONFIGURATION ERRORS DETECTED');
  console.log('\nPlease fix the issues above before running the mobile app.');
  process.exit(1);
}
console.log('='.repeat(60) + '\n');
