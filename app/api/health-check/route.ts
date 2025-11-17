import { NextResponse } from 'next/server';

// User agent pool for randomization
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
];

// Accept headers variations
const ACCEPT_HEADERS = [
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
];

// Accept-Language variations
const ACCEPT_LANGUAGE_HEADERS = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'en-US,en;q=0.8',
  'en,en-US;q=0.9',
];

// Referer variations (optional, some requests won't have referer)
const REFERER_OPTIONS = [
  'https://www.google.com/',
  'https://www.google.com/search?q=example',
  'https://www.bing.com/',
  undefined, // Some requests won't have referer
];

interface HealthCheckResult {
  timestamp: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  url: string;
}

// Simple in-memory log store (for serverless, this will reset on each invocation)
// In production, consider using a database or external logging service
const logs: HealthCheckResult[] = [];

// Clean logs older than 3 days
function cleanOldLogs() {
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const filtered = logs.filter(log => new Date(log.timestamp).getTime() > threeDaysAgo);
  logs.length = 0;
  logs.push(...filtered);
}

// Slack logging placeholder function
async function logToSlack(result: HealthCheckResult): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    // Slack logging not configured yet
    return;
  }

  // TODO: Implement Slack webhook call
  // Example structure:
  // await fetch(webhookUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     text: result.success
  //       ? `✅ Health check passed: ${result.url} (${result.responseTime}ms)`
  //       : `❌ Health check failed: ${result.url} - ${result.error}`,
  //   }),
  // });
}

// Get random element from array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Perform health check with retries
async function performHealthCheck(url: string, retries = 2): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const userAgent = getRandomElement(USER_AGENTS);
  const accept = getRandomElement(ACCEPT_HEADERS);
  const acceptLanguage = getRandomElement(ACCEPT_LANGUAGE_HEADERS);
  const referer = getRandomElement(REFERER_OPTIONS);

  const headers: HeadersInit = {
    'User-Agent': userAgent,
    'Accept': accept,
    'Accept-Language': acceptLanguage,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      success: response.ok,
      statusCode: response.status,
      responseTime,
      url,
    };

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Retry logic
    if (retries > 0 && error instanceof Error && error.name !== 'AbortError') {
      console.log(`Retrying health check... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return performHealthCheck(url, retries - 1);
    }

    const result: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      url,
    };

    return result;
  }
}

export async function GET() {
  // Random skip logic: 73% chance to run (averages ~7.5 min intervals)
  // Since cron runs every 5 min, skipping 27% gives us ~6.85 min average
  // To get closer to 7.5 min, we skip ~33% (0.67 probability)
  const shouldRun = Math.random() < 0.73;

  if (!shouldRun) {
    return NextResponse.json({
      message: 'Skipped this run (randomized interval)',
      timestamp: new Date().toISOString(),
    });
  }

  const targetUrl = 'https://www.kahani.xyz/';
  
  try {
    // Clean old logs
    cleanOldLogs();

    // Perform health check
    const result = await performHealthCheck(targetUrl);

    // Store log
    logs.push(result);

    // Log to console
    const logMessage = result.success
      ? `✅ Health check passed: ${targetUrl} - Status: ${result.statusCode}, Time: ${result.responseTime}ms`
      : `❌ Health check failed: ${targetUrl} - ${result.error} (${result.responseTime}ms)`;
    
    console.log(logMessage);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Send to Slack if configured
    await logToSlack(result);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      timestamp: result.timestamp,
      error: result.error,
      logsCount: logs.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check error:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

