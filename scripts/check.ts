#!/usr/bin/env node

/**
 * Script to run health check immediately
 * Usage: npm run check
 *        npm run check:dev (for local development server)
 */

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const baseUrl = isDev 
  ? 'http://localhost:3000' 
  : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://your-vercel-app.vercel.app';

const healthCheckUrl = `${baseUrl}/api/health-check`;

async function runCheck() {
  console.log('🔍 Running health check...');
  console.log(`📍 URL: ${healthCheckUrl}\n`);

  try {
    const startTime = Date.now();
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    console.log('📊 Results:');
    console.log('─'.repeat(50));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Success: ${data.success ? '✅' : '❌'}`);
    
    if (data.statusCode) {
      console.log(`HTTP Status: ${data.statusCode}`);
    }
    
    if (data.responseTime) {
      console.log(`Response Time: ${data.responseTime}ms`);
    }
    
    if (data.timestamp) {
      console.log(`Timestamp: ${data.timestamp}`);
    }
    
    if (data.error) {
      console.log(`Error: ${data.error}`);
    }
    
    if (data.logsCount !== undefined) {
      console.log(`Logs Count: ${data.logsCount}`);
    }

    if (data.message) {
      console.log(`Message: ${data.message}`);
    }

    console.log('─'.repeat(50));
    console.log(`\nTotal Request Time: ${responseTime}ms`);

    // Exit with error code if check failed
    process.exit(data.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error running health check:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runCheck();

