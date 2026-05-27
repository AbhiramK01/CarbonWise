# Deploying to Fly.io (quick guide)

Prerequisites:
- Create Fly apps names and a Fly API token: https://fly.io
- Create two GitHub secrets in this repo: `FLY_API_TOKEN`, `FLY_APP_WEB`, `FLY_APP_ML`.
- Push images to GHCR (CI already publishes images on `main`).

Deploy via GitHub Actions:
- On push to `main`, `.github/workflows/deploy-fly.yml` will run and deploy images referenced from GHCR. Ensure the three secrets above are set.

Manual deploy (local):
1. Install `flyctl` (https://fly.io/docs/getting-started/installing-flyctl/)
2. Login: `flyctl auth login`
3. Deploy web:
```bash
flyctl deploy --app <FLY_APP_WEB> --image=ghcr.io/<OWNER>/carbonwise-web:latest --config fly.toml
```
4. Deploy ml-service:
```bash
cd ml-service
flyctl deploy --app <FLY_APP_ML> --image=ghcr.io/<OWNER>/carbonwise-ml:latest --config fly.toml
```

Notes:
- The `fly.toml` files are placeholders; use `flyctl launch` to generate a more complete config if needed.
- Free tier resources are limited; large models may require downsizing or using object storage for model files.
