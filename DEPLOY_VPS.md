# Deploying to a VPS with Docker Compose

Prerequisites:
- A VPS or VM with Docker and Docker Compose (v2) installed and accessible.
- A GitHub Container Registry Personal Access Token with `read:packages` scope.
- Repository images published to GHCR: `ghcr.io/<OWNER>/carbonwise-web:latest` and `ghcr.io/<OWNER>/carbonwise-ml:latest`.

Steps (on the VPS):
1. Copy this repo or `docker-compose.yml` and `deploy_vps.sh` to the VPS.
2. Export your GHCR PAT and set your GitHub username:
```bash
export GHCR_PAT="<your_pat>"
export OWNER="<your_github_user_or_org>"
```
3. Make the helper executable and run it:
```bash
chmod +x deploy_vps.sh
./deploy_vps.sh
```
4. Check services:
```bash
docker compose ps
docker compose logs -f
```

Notes:
- Replace `<OWNER>` with your GitHub username or org in `docker-compose.yml` and `deploy_vps.sh` or export `OWNER` before running.
- For production, add a reverse proxy (nginx) and TLS (Certbot) or use a cloud load balancer.
- If model artifacts are large, consider hosting them in object storage and mounting or downloading them at startup.
