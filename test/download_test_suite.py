#!/usr/bin/env python3
"""
Script to download n8n workflow from local instance
"""

import os
import json
# requirements.txt will install the below modules
import requests # type: ignore
import yaml # type: ignore
from pathlib import Path


def load_env_variables():
    """Load environment variables from .env.local.yml file"""
    env_path = Path(__file__).parent.parent / '.env.local.yml'

    if not env_path.exists():
        raise FileNotFoundError(f".env.local.yml file not found at {env_path}\n"
                              f"Please create this file with your N8N:API_TOKEN.\n"
                              f"See test/env.example for the required format.")

    # Try to load the YAML file
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            env_data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ValueError(f"Error parsing YAML file {env_path}: {e}")
    except Exception as e:
        raise ValueError(f"Error reading file {env_path}: {e}")

    if not env_data:
        raise ValueError(f"YAML file {env_path} is empty or invalid")

    # Extract N8N:API_TOKEN from the YAML structure
    api_token = None
    if isinstance(env_data, dict):
        # Look for N8N:API_TOKEN in nested structure
        if 'N8N' in env_data and isinstance(env_data['N8N'], dict):
            api_token = env_data['N8N'].get('API_TOKEN')
        # Also check for direct key access in case the structure is different
        elif 'N8N:API_TOKEN' in env_data:
            api_token = env_data['N8N:API_TOKEN']

    if not api_token:
        raise ValueError(f"N8N:API_TOKEN not found in .env.local.yml file at {env_path}\n"
                       f"Please add:\nN8N:\n  API_TOKEN: your_token_here\n"
                       f"or:\nN8N:API_TOKEN: your_token_here")

    return api_token


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
        raise Exception(f"Error fetching workflow: {e}")


def save_workflow_json(workflow_data, output_path):
    """Save workflow data to JSON file"""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(workflow_data, f, indent=2, ensure_ascii=False)

    print(f"Workflow saved to: {output_path}")


def main():
    """Main function to download the workflow"""
    try:
        # Configuration
        base_url = "http://localhost:5678"
        workflow_name = "n8n-nodes-binalyze-air-spec"
        output_filename = "n8n-nodes-binalyze-air-spec.json"

        # Get the script directory and set output path
        script_dir = Path(__file__).parent
        output_path = script_dir / output_filename

        print(f"Loading API token from .env.local...")
        api_token = load_env_variables()

        print(f"Fetching workflow '{workflow_name}' from {base_url}...")
        workflow_data = get_workflow_by_name(base_url, api_token, workflow_name)

        print(f"Saving workflow to '{output_path}'...")
        save_workflow_json(workflow_data, output_path)

        print("✅ Test Suite Workflow downloaded successfully!")

    except Exception as e:
        print(f"Error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
