# Deployment Guide for File60

This document outlines the procedures for deploying the **File60** application, which consists of a **Cloudflare Worker** (backend) and a **React UI** (frontend) deployed to **Cloudflare Pages**.

## Prerequisites

Before deployment, ensure you have the following:

1.  **Cloudflare Account**: [Sign up here](https://dash.cloudflare.com/sign-up).
2.  **Node.js & npm**: Instaled on your local machine.
3.  **Wrangler CLI**: Installed globally (`npm i -g wrangler`) or available via `npx`.
4.  **R2 Bucket**: An R2 bucket named `file60-files` (or as configured in `wrangler.toml`).
5.  **GitHub Repository**: For CI/CD integration.

---

## 1. Environment Configuration

### Local Development (`.dev.vars`)
Local secrets are stored in `.dev.vars` (this file is ignored by Git).
```ini
JWT_SECRET="your-development-secret-key"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_BUCKET_NAME="file60-files"
R2_PUBLIC_URL="https://your-public-bucket-url"
```

### Production Secrets
For production, secrets must be set in the Cloudflare Dashboard or via GitHub Secrets (for CI/CD). **Do not commit secrets to `wrangler.toml`**.

---

## 2. Manual Deployment (via CLI)

You can manually deploy the application from your terminal using the npm scripts provided in `package.json`.

### Authenticate
First, ensure you are logged in to Cloudflare:
```bash
npx wrangler login
```

### Deploy Backend (Worker)
Deploy the Cloudflare Worker:
```bash
npm run deploy:worker
```
*This runs `wrangler deploy --minify` using the configuration in `wrangler.toml`.*

### Deploy Frontend (UI)
Build and deploy the React UI to Cloudflare Pages:
```bash
npm run deploy:ui
```
*This runs `npm run build:ui` followed by `wrangler pages deploy dist --project-name file60-ui`.*

> **Note**: For the frontend, ensure the project `file60-ui` exists in your Cloudflare Pages dashboard, or allow Wrangler to create it for you. You may need to configure the `VITE_API_URL` environment variable in the Cloudflare Pages dashboard for the frontend to communicate with the production worker.

---

## 3. Automated Deployment (CI/CD)

We use **GitHub Actions** for automated deployments. Pushing to the `main` branch triggers the respective workflows.

### Workflows
*   **Backend**: `.github/workflows/deploy-worker.yml`
*   **Frontend**: `.github/workflows/deploy-ui.yml`

### Setup Required
To enable CI/CD, you must add the following **Repository Secrets** in GitHub (`Settings` > `Secrets and variables` > `Actions`):

| Secret Name | Description |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | API Token with permissions for Workers, Pages, and R2. |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID. |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID. |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key. |
| `R2_ACCOUNT_ID` | R2 Account ID. |
| `R2_BUCKET_NAME` | Name of your R2 bucket (e.g., `file60-files`). |
| `R2_PUBLIC_URL` | Public CDN URL for your bucket (e.g., `https://pub-xxx.r2.dev`). |
| `JWT_SECRET` | Strong secret key for JWT signing. |
| `VITE_API_URL` | The URL of your deployed Worker (e.g., `https://file60-worker.username.workers.dev`). |

### Triggering Deployments
*   **Push to `main`**: Automatically deploys both the Worker and the UI if changes are detected in their respective directories.
*   **Manual Trigger**: You can usually manually trigger workflows from the "Actions" tab in GitHub if configured (currently set to `push` events only).

---

## 4. Troubleshooting

*   **CORS Errors**: Ensure the `R2_PUBLIC_URL` is correct and allowed in your Worker's CORS configuration if fetching directly.
*   **Deployment Failures**: Check GitHub Actions logs for detailed error messages. Common issues include missing secrets or incorrect permissions for the Cloudflare API Token.
*   **Environment Variables**: If the UI cannot reach the API, verify that `VITE_API_URL` is set correctly in the GitHub Secrets and injected during the build.

---

## 5. File Structure Reference

*   `.github/workflows/`: CI/CD definitions.
*   `worker/`: Backend Cloudflare Worker code.
*   `ui/`: Frontend React application.
*   `wrangler.toml`: Worker configuration (excluding secrets).
*   `package.json`: Project dependencies and scripts.
