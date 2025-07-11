# App Store Publish Action

Automated GitHub Action for submitting iOS apps to the App Store via App Store Connect API.

## Features

- =� **Automated App Store Submission**: Streamlines the entire submission process
- = **TestFlight Integration**: Automatically finds and submits TestFlight builds
- < **Multi-language Support**: Updates release notes in Japanese, English, and Chinese
- = **Secure Authentication**: Uses App Store Connect API with private key authentication
- � **Fast Processing**: Built with TypeScript for reliable and efficient execution

## Prerequisites

Before using this action, ensure you have:

1. **App Store Connect API Key**: Generate an API key with "App Manager" role or higher
2. **TestFlight Build**: Your app version must be uploaded to TestFlight first
3. **App Store Connect Setup**: App must be configured in App Store Connect with proper metadata

## Required Inputs

| Input | Description | Required | Example |
|-------|-------------|----------|---------|
| `app-id` | App Store Connect APP ID |  | `1234567890` |
| `version` | Version number to submit |  | `2.0.1303` |
| `issuer-id` | App Store Connect API Issuer ID |  | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `key-id` | App Store Connect API Key ID |  | `ABCDEF1234` |
| `private-key` | App Store Connect API Private Key (base64 encoded) |  | `LS0tLS1CRUdJTi...` |
| `what-news-ja` | Japanese release notes |  | `テスト更新` |
| `what-news-en` | English release notes |  | `Test update` |
| `what-news-zh` | Chinese release notes |  | `測試更新` |

## Usage

### Basic Example

```yaml
name: Submit to App Store

on:
  push:
    tags:
      - 'v*'

jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - name: Submit to App Store
        uses: nextDriveIoE/app-store-publish-action@v1
        with:
          app-id: ${{ secrets.APP_STORE_APP_ID }}
          version: ${{ github.ref_name }}
          issuer-id: ${{ secrets.APP_STORE_ISSUER_ID }}
          key-id: ${{ secrets.APP_STORE_KEY_ID }}
          private-key: ${{ secrets.APP_STORE_PRIVATE_KEY }}
          what-news-ja: "テスト更新"
          what-news-en: "Test update"
          what-news-zh: "測試更新"
```

### Advanced Example with Conditional Submission

```yaml
name: App Store Submission

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to submit'
        required: true
        type: string
      release_notes:
        description: 'Release notes'
        required: true
        type: string

jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - name: Submit to App Store
        uses: nextDriveIoE/app-store-publish-action@v1
        with:
          app-id: ${{ secrets.APP_STORE_APP_ID }}
          version: ${{ inputs.version }}
          issuer-id: ${{ secrets.APP_STORE_ISSUER_ID }}
          key-id: ${{ secrets.APP_STORE_KEY_ID }}
          private-key: ${{ secrets.APP_STORE_PRIVATE_KEY }}
          what-news-ja: ${{ inputs.release_notes }}
          what-news-en: ${{ inputs.release_notes }}
          what-news-zh: ${{ inputs.release_notes }}
```

## Setup Instructions

### 1. Generate App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** � **Keys**
3. Click **Generate API Key**
4. Select **App Manager** role or higher
5. Download the `.p8` key file
6. Note the **Key ID** and **Issuer ID**

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

```bash
# App Store Connect API credentials
APP_STORE_APP_ID=1234567890
APP_STORE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APP_STORE_KEY_ID=ABCDEF1234
APP_STORE_PRIVATE_KEY=<base64-encoded-private-key>
```

To encode your private key:
```bash
base64 -i AuthKey_ABCDEF1234.p8 | pbcopy
```

### 3. Ensure TestFlight Build Exists

The action requires that your app version is already uploaded to TestFlight. The submission process will:

1. Find the TestFlight build matching your version
2. Create or update the App Store version
3. Associate the TestFlight build with the App Store version
4. Update release notes in all specified languages
5. Submit for App Store review

## How It Works

1. **Authentication**: Securely authenticates with App Store Connect using your API key
2. **Build Discovery**: Searches TestFlight for the specified version
3. **Version Management**: Creates or updates the App Store version entry
4. **Build Association**: Links the TestFlight build to the App Store version
5. **Localization**: Updates release notes for Japanese, English, and Chinese
6. **Submission**: Submits the version for App Store review

## Output

The action provides a `result` output containing the submission status:

```yaml
- name: Submit to App Store
  id: submit
  uses: nextDriveIoE/app-store-publish-action@v1
  with:
    # ... inputs

- name: Check result
  run: echo "Submission result: ${{ steps.submit.outputs.result }}"
```