#!/usr/bin/env python3
"""
Workflow management tool for n8n-nodes-binalyze-air
Downloads test workflows from n8n instance

Usage:
    python e2e.py download [options]
"""

import json
import sys
import argparse
from getpass import getpass
# requirements.txt will install the below modules
import requests # type: ignore
import yaml # type: ignore
from pathlib import Path


def load_or_create_env_variables():
    """Load environment variables from .env.local.yml file or create it with user input"""
    env_path = Path(__file__).parent.parent / '.env.local.yml'
    
    # Default configuration
    config = {
        'n8n_api_token': None,
        'n8n_instance_url': 'http://127.0.0.1:5678'
    }
    
    # Try to load existing file
    if env_path.exists():
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                env_data = yaml.safe_load(f)
            
            if isinstance(env_data, dict):
                # Extract N8N configuration
                if 'N8N' in env_data and isinstance(env_data['N8N'], dict):
                    config['n8n_api_token'] = env_data['N8N'].get('API_TOKEN')
                    config['n8n_instance_url'] = env_data['N8N'].get('INSTANCE_URL', config['n8n_instance_url'])
            
            # Check if we have a valid n8n API token
            if config['n8n_api_token'] and config['n8n_api_token'] != 'your_n8n_api_token_here':
                return config
        except Exception as e:
            print(f"Warning: Error reading existing .env.local.yml: {e}")
    
    # If we get here, we need to prompt for API key
    print("\n🔑 N8N API Token Configuration")
    print("=" * 40)
    print("No valid API token found in .env.local.yml")
    print("\nTo get your API token:")
    print("1. Open your n8n instance (default: http://127.0.0.1:5678)")
    print("2. Go to Settings → API")
    print("3. Create a new API key or copy an existing one")
    print()
    
    api_token = getpass("Enter your n8n API token: ").strip()
    
    if not api_token:
        raise ValueError("API token cannot be empty")
    
    config['n8n_api_token'] = api_token
    
    # Save the API token to .env.local.yml
    env_data = {
        'N8N': {
            'API_TOKEN': api_token,
            'INSTANCE_URL': config['n8n_instance_url']
        }
    }
    
    try:
        with open(env_path, 'w', encoding='utf-8') as f:
            yaml.dump(env_data, f, default_flow_style=False)
        print(f"\n✅ API token saved to {env_path}")
    except Exception as e:
        print(f"\n⚠️  Warning: Could not save API token to file: {e}")
        print("The token will be used for this session only.")
    
    return config


def test_api_connection(base_url, api_token):
    """Test if the API connection works"""
    headers = {
        'X-N8N-API-KEY': api_token,
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{base_url}/api/v1/workflows", headers=headers)
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        if hasattr(e, 'response') and e.response is not None:
            print(f"\n❌ API Connection Test Failed:")
            print(f"   Status Code: {e.response.status_code}")
            try:
                error_data = e.response.json()
                print(f"   Error Message: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {e.response.text[:200]}")
        return False


def get_workflow_by_name(base_url, api_token, workflow_name):
    """Fetch workflow by name from n8n API"""
    headers = {
        'X-N8N-API-KEY': api_token,
        'Content-Type': 'application/json'
    }
    
    # Get all workflows
    workflows_url = f"{base_url}/api/v1/workflows"
    
    try:
        response = requests.get(workflows_url, headers=headers)
        response.raise_for_status()
        
        workflows = response.json()
        
        # Find the workflow by name
        target_workflow = None
        for workflow in workflows.get('data', []):
            if workflow.get('name') == workflow_name:
                target_workflow = workflow
                break
        
        if not target_workflow:
            raise ValueError(f"Workflow '{workflow_name}' not found")
        
        # Get the full workflow details
        workflow_id = target_workflow['id']
        workflow_detail_url = f"{base_url}/api/v1/workflows/{workflow_id}"
        
        detail_response = requests.get(workflow_detail_url, headers=headers)
        detail_response.raise_for_status()
        
        return detail_response.json()
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Error fetching workflow: {e}"
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                if 'message' in error_data:
                    error_msg += f"\nAPI Error: {error_data['message']}"
            except:
                error_msg += f"\nResponse: {e.response.text}"
        raise Exception(error_msg)


def save_workflow_json(workflow_data, output_path):
    """Save workflow data to JSON file"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(workflow_data, f, indent=2, ensure_ascii=False)
    
    print(f"Workflow saved to: {output_path}")



def download_workflow(base_url, api_token, workflow_name, output_path):
    """Download a workflow from n8n"""
    print(f"\n📥 Downloading workflow '{workflow_name}'...")
    workflow_data = get_workflow_by_name(base_url, api_token, workflow_name)
    save_workflow_json(workflow_data, output_path)
    print("✅ Download completed!")


def download_command(args, config):
    """Handle the download subcommand"""
    # Use URL from args or fall back to config
    base_url = args.url or config['n8n_instance_url']
    api_token = config['n8n_api_token']
    
    # Test connection
    print(f"\n🔌 Connecting to n8n at {base_url}...")
    if not test_api_connection(base_url, api_token):
        print("❌ Failed to connect to n8n. Please check:")
        print("   - n8n is running at the specified URL")
        print("   - The API token is valid")
        sys.exit(1)
    print("✅ Connected successfully!")
    
    # Get the script directory and set file path
    script_dir = Path(__file__).parent
    file_path = script_dir / args.file
    
    # Download the workflow
    download_workflow(base_url, api_token, args.name, file_path)


def main():
    """Main function for n8n workflow download tool"""
    parser = argparse.ArgumentParser(
        description='Workflow download tool for n8n-nodes-binalyze-air',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download workflow from n8n
  python e2e.py download
  
  # Use custom n8n URL
  python e2e.py download --url http://n8n.example.com:5678
  
  # Use custom workflow name
  python e2e.py download --name my-custom-workflow
  
  # Use custom output file
  python e2e.py download --file my-workflow.json
        """
    )
    
    # Create subparsers
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create download subcommand
    download_parser = subparsers.add_parser(
        'download',
        help='Download workflow from n8n instance',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download workflow with default settings
  python e2e.py download
  
  # Use custom n8n URL
  python e2e.py download --url http://n8n.example.com:5678
  
  # Use custom workflow name and output file
  python e2e.py download --name my-workflow --file my-workflow.json
        """
    )
    
    # Add arguments to download subcommand
    download_parser.add_argument(
        '--url',
        help='n8n instance URL (overrides .env.local.yml)'
    )
    download_parser.add_argument(
        '--file',
        default='n8n-nodes-binalyze-air-e2e.json',
        help='Output workflow JSON file name (default: n8n-nodes-binalyze-air-e2e.json)'
    )
    download_parser.add_argument(
        '--name',
        default='n8n-nodes-binalyze-air-e2e',
        help='Workflow name to download (default: n8n-nodes-binalyze-air-e2e)'
    )
    
    args = parser.parse_args()
    
    # Check if a command was provided
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        # Get configuration (prompt if needed)
        print("🔧 n8n Workflow Download Tool")
        print("=" * 40)
        config = load_or_create_env_variables()
        
        # Execute the appropriate command
        if args.command == 'download':
            download_command(args, config)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()