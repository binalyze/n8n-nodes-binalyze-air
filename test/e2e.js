#!/usr/bin/env node
/**
 * Workflow management tool for n8n-nodes-binalyze-air
 * Downloads test workflows from n8n instance
 *
 * Usage:
 *     node e2e.js download [options]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const yaml = require('js-yaml');
const readline = require('readline');
const { program } = require('commander');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Load or create environment variables from .env.local.yml file
 */
async function loadOrCreateEnvVariables() {
  const envPath = path.join(__dirname, '.env.local.yml');

  // Default configuration
  let config = {
    n8n_api_token: null,
    n8n_instance_url: 'http://127.0.0.1:5678'
  };

  // Try to load existing file
  if (fs.existsSync(envPath)) {
    try {
      const envData = yaml.load(fs.readFileSync(envPath, 'utf8'));

      if (envData && typeof envData === 'object') {
        // Extract N8N configuration
        if (envData.N8N && typeof envData.N8N === 'object') {
          config.n8n_api_token = envData.N8N.API_TOKEN;
          config.n8n_instance_url = envData.N8N.INSTANCE_URL || config.n8n_instance_url;
        }

        // Check if we have a valid n8n API token
        if (config.n8n_api_token && config.n8n_api_token !== 'your_n8n_api_token_here') {
          return config;
        }
      }
    } catch (e) {
      console.log(`Warning: Error reading existing .env.local.yml: ${e.message}`);
    }
  }

  // If we get here, we need to prompt for API key
  console.log('\n🔑 N8N API Token Configuration');
  console.log('='.repeat(40));
  console.log('No valid API token found in .env.local.yml');
  console.log('\nTo get your API token:');
  console.log('1. Open your n8n instance (default: http://127.0.0.1:5678)');
  console.log('2. Go to Settings → API');
  console.log('3. Create a new API key or copy an existing one');
  console.log();

  // Hide input for API token
  const apiToken = await question('Enter your n8n API token: ');

  if (!apiToken.trim()) {
    throw new Error('API token cannot be empty');
  }

  config.n8n_api_token = apiToken.trim();

  // Save the API token to .env.local.yml
  const envData = {
    N8N: {
      API_TOKEN: config.n8n_api_token,
      INSTANCE_URL: config.n8n_instance_url
    }
  };

  try {
    fs.writeFileSync(envPath, yaml.dump(envData));
    console.log(`\n✅ API token saved to ${envPath}`);
  } catch (e) {
    console.log(`\n⚠️  Warning: Could not save API token to file: ${e.message}`);
    console.log('The token will be used for this session only.');
  }

  return config;
}

/**
 * Make HTTP request
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          const error = new Error(`HTTP ${res.statusCode}`);
          error.response = {
            statusCode: res.statusCode,
            data: data
          };
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Test if the API connection works
 */
async function testApiConnection(baseUrl, apiToken) {
  const headers = {
    'X-N8N-API-KEY': apiToken,
    'Content-Type': 'application/json'
  };

  try {
    await makeRequest(`${baseUrl}/api/v1/workflows`, { headers });
    return true;
  } catch (e) {
    console.log('\n❌ API Connection Test Failed:');
    if (e.response) {
      console.log(`   Status Code: ${e.response.statusCode}`);
      try {
        const errorData = JSON.parse(e.response.data);
        console.log(`   Error Message: ${errorData.message || 'Unknown error'}`);
      } catch {
        console.log(`   Response: ${e.response.data.substring(0, 200)}`);
      }
    }
    return false;
  }
}

/**
 * Fetch workflow by name from n8n API
 */
async function getWorkflowByName(baseUrl, apiToken, workflowName) {
  const headers = {
    'X-N8N-API-KEY': apiToken,
    'Content-Type': 'application/json'
  };

  try {
    // Get all workflows
    const workflows = await makeRequest(`${baseUrl}/api/v1/workflows`, { headers });

    // Find the workflow by name
    let targetWorkflow = null;
    for (const workflow of workflows.data || []) {
      if (workflow.name === workflowName) {
        targetWorkflow = workflow;
        break;
      }
    }

    if (!targetWorkflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    // Get the full workflow details
    const workflowId = targetWorkflow.id;
    const workflowDetails = await makeRequest(`${baseUrl}/api/v1/workflows/${workflowId}`, { headers });

    return workflowDetails;

  } catch (e) {
    let errorMsg = `Error fetching workflow: ${e.message}`;
    if (e.response) {
      try {
        const errorData = JSON.parse(e.response.data);
        if (errorData.message) {
          errorMsg += `\nAPI Error: ${errorData.message}`;
        }
      } catch {
        errorMsg += `\nResponse: ${e.response.data}`;
      }
    }
    throw new Error(errorMsg);
  }
}

/**
 * Save workflow data to JSON file
 */
function saveWorkflowJson(workflowData, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(workflowData, null, 2), 'utf8');
  console.log(`Workflow saved to: ${outputPath}`);
}

/**
 * Download a workflow from n8n
 */
async function downloadWorkflow(baseUrl, apiToken, workflowName, outputPath) {
  console.log(`\n📥 Downloading workflow '${workflowName}'...`);
  const workflowData = await getWorkflowByName(baseUrl, apiToken, workflowName);
  saveWorkflowJson(workflowData, outputPath);
  console.log('✅ Download completed!');
}

/**
 * Handle the download command
 */
async function downloadCommand(options, config) {
  // Use URL from options or fall back to config
  const baseUrl = options.url || config.n8n_instance_url;
  const apiToken = config.n8n_api_token;

  // Test connection
  console.log(`\n🔌 Connecting to n8n at ${baseUrl}...`);
  if (!await testApiConnection(baseUrl, apiToken)) {
    console.log('❌ Failed to connect to n8n. Please check:');
    console.log('   - n8n is running at the specified URL');
    console.log('   - The API token is valid');
    process.exit(1);
  }
  console.log('✅ Connected successfully!');

  // Get the script directory and set file path
  const scriptDir = __dirname;
  const filePath = path.join(scriptDir, options.file);

  // Download the workflow
  await downloadWorkflow(baseUrl, apiToken, options.name, filePath);
}

/**
 * Main function
 */
async function main() {
  program
    .name('e2e')
    .description('Workflow download tool for n8n-nodes-binalyze-air')
    .version('1.0.0');

  program
    .command('download')
    .description('Download workflow from n8n instance')
    .option('--url <url>', 'n8n instance URL (overrides .env.local.yml)')
    .option('--file <file>', 'Output workflow JSON file name', 'n8n-nodes-binalyze-air-e2e.json')
    .option('--name <name>', 'Workflow name to download', 'n8n-nodes-binalyze-air-e2e')
    .action(async (options) => {
      try {
        console.log('🔧 n8n Workflow Download Tool');
        console.log('='.repeat(40));
        const config = await loadOrCreateEnvVariables();
        await downloadCommand(options, config);
        rl.close();
      } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        rl.close();
        process.exit(1);
      }
    });

  program.addHelpText('after', `
Examples:
  # Download workflow from n8n
  node e2e.js download

  # Use custom n8n URL
  node e2e.js download --url http://n8n.example.com:5678

  # Use custom workflow name
  node e2e.js download --name my-custom-workflow

  # Use custom output file
  node e2e.js download --file my-workflow.json
  `);

  // Parse command line arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
    rl.close();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
});

// Run main function if called directly
if (require.main === module) {
  main();
}
