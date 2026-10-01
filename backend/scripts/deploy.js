/**
 * Book Buddy Backend Deployment Script
 * 
 * This script handles the deployment process for the Book Buddy backend.
 * It includes:
 * 1. Environment validation
 * 2. Database migration
 * 3. Building the production version
 * 4. Starting the server
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ENV_FILE = '.env';
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'NODE_ENV'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let prefix = '';
  
  switch (type) {
    case 'error':
      prefix = `${colors.red}[ERROR]${colors.reset}`;
      break;
    case 'warning':
      prefix = `${colors.yellow}[WARNING]${colors.reset}`;
      break;
    case 'success':
      prefix = `${colors.green}[SUCCESS]${colors.reset}`;
      break;
    default:
      prefix = `${colors.blue}[INFO]${colors.reset}`;
  }
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, errorMessage) {
  try {
    log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`${errorMessage}: ${error.message}`, 'error');
    return false;
  }
}

// Step 1: Validate environment
function validateEnvironment() {
  log('Validating environment...');
  
  if (!fs.existsSync(ENV_FILE)) {
    log(`${ENV_FILE} file not found. Please create one from .env.example`, 'error');
    return false;
  }
  
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const missingVars = [];
  
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!envContent.includes(`${varName}=`)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    log(`Missing required environment variables: ${missingVars.join(', ')}`, 'error');
    return false;
  }
  
  log('Environment validation successful', 'success');
  return true;
}

// Step 2: Run database migrations
function runMigrations() {
  log('Running database migrations...');
  return runCommand(
    'npx prisma migrate deploy',
    'Failed to run database migrations'
  );
}

// Step 3: Build for production
function buildProduction() {
  log('Building production version...');
  
  // Clean previous build
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    log('Cleaned previous build');
  }
  
  return runCommand(
    'npm run build',
    'Failed to build production version'
  );
}

// Step 4: Start the server
function startServer() {
  log('Starting server...');
  return runCommand(
    'npm run start:prod',
    'Failed to start server'
  );
}

// Main deployment function
async function deploy() {
  log(`${colors.bright}Starting Book Buddy Backend Deployment${colors.reset}`);
  
  if (!validateEnvironment()) {
    process.exit(1);
  }
  
  if (!runMigrations()) {
    process.exit(1);
  }
  
  if (!buildProduction()) {
    process.exit(1);
  }
  
  log(`${colors.green}${colors.bright}Deployment successful!${colors.reset}`);
  
  // Start the server if requested
  if (process.argv.includes('--start')) {
    startServer();
  } else {
    log('To start the server, run: npm run start:prod');
  }
}

// Run the deployment
deploy().catch(error => {
  log(`Unhandled deployment error: ${error.message}`, 'error');
  process.exit(1);
}); 