#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

NAMESPACE="web-vrdnkcar"
IMAGE="web-vrdnkcar:latest"

# ── ตรวจจับ kubectl (อาจต้อง sudo) ──────────────────────
KUBECTL="kubectl"
if ! kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
  if sudo kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
    KUBECTL="sudo kubectl"
  elif ! kubectl version --client &>/dev/null 2>&1; then
    echo -e "${RED}Error: kubectl ไม่พบ${NC}"
    exit 1
  fi
fi

echo -e "${BLUE}=== K3s Deploy: ${IMAGE} ===${NC}"
echo -e "  kubectl: $KUBECTL"

# ── ดึง env vars อัตโนมัติ ─────────────────────────────────
# ลำดับ: 1) ตัวแปรที่ export มาแล้ว  2) K3s secret  3) .env file
# K3s secret = แหล่งหลัก (มี token ครบ), .env = fallback สำหรับ deploy ครั้งแรก

_load_from_k3s() {
  if $KUBECTL get secret app-secrets -n "$NAMESPACE" &>/dev/null; then
    echo -e "${YELLOW}ดึงค่าจาก K3s secret...${NC}"
    _get() { $KUBECTL get secret app-secrets -n "$NAMESPACE" -o jsonpath="{.data.$1}" 2>/dev/null | base64 -d 2>/dev/null; }
    [ -z "$DB_USER" ]          && export DB_USER=$(_get DB_USER)
    [ -z "$DB_PASSWORD" ]      && export DB_PASSWORD=$(_get DB_PASSWORD)
    [ -z "$DB_NAME" ]          && export DB_NAME=$(_get DB_NAME)
    [ -z "$DOMAIN" ]           && export DOMAIN=$($KUBECTL get ingressroute -n "$NAMESPACE" -o jsonpath='{.items[0].spec.routes[0].match}' 2>/dev/null | sed -n 's/.*`\([^`]*\)`.*/\1/p')
    [ -z "$SITE_NAME" ]        && export SITE_NAME=$(_get NEXT_PUBLIC_SITE_NAME)
    [ -z "$ORGANIZATION" ]     && export ORGANIZATION=$(_get NEXT_PUBLIC_ORGANIZATION)
    [ -z "$TELEGRAM_ENABLED" ] && export TELEGRAM_ENABLED=$(_get TELEGRAM_ENABLED)
    [ -z "$TELEGRAM_TOKEN" ]   && export TELEGRAM_TOKEN=$(_get TELEGRAM_TOKEN)
    [ -z "$TELEGRAM_CHAT_ID" ] && export TELEGRAM_CHAT_ID=$(_get TELEGRAM_CHAT_ID)
    [ -z "$LINE_ENABLED" ]     && export LINE_ENABLED=$(_get LINE_ENABLED)
    [ -z "$LINE_TOKEN" ]       && export LINE_TOKEN=$(_get LINE_TOKEN)
    [ -z "$LINE_USER_ID_1" ]   && export LINE_USER_ID_1=$(_get LINE_USER_ID_1)
    [ -z "$LINE_USER_ID_2" ]   && export LINE_USER_ID_2=$(_get LINE_USER_ID_2)
    unset -f _get
    echo -e "${GREEN}ดึงจาก K3s secret สำเร็จ${NC}"
    return 0
  fi
  return 1
}

_load_from_env() {
  local ENV_FILE="$PROJECT_DIR/.env"
  if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}ดึงค่าจาก .env...${NC}"
    set -a
    source "$ENV_FILE"
    set +a
    # map .env variable names → script variable names
    [ -z "$DB_USER" ]     && export DB_USER="$POSTGRES_USER"
    [ -z "$DB_PASSWORD" ] && export DB_PASSWORD="$POSTGRES_PASSWORD"
    [ -z "$DB_NAME" ]     && export DB_NAME="$POSTGRES_DB"
    echo -e "${GREEN}ดึงจาก .env สำเร็จ${NC}"
    return 0
  fi
  return 1
}

if [ -z "$DB_USER" ] || [ -z "$DOMAIN" ]; then
  _load_from_k3s || _load_from_env || true
fi

# ── ตรวจสอบ env vars ที่จำเป็น ──────────────────────────
REQUIRED_VARS=(DOMAIN DB_USER DB_PASSWORD DB_NAME)
MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
  [ -z "${!VAR}" ] && MISSING+=("$VAR")
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}Error: กรุณา export ตัวแปรต่อไปนี้ก่อน deploy:${NC}"
  for V in "${MISSING[@]}"; do echo "  - $V"; done
  exit 1
fi

# ── Step 1: Build Next.js ──────────────────────────────
echo -e "${BLUE}[1/5] Building Next.js...${NC}"
npm run build

# ── Step 2: Build Docker image ─────────────────────────
echo -e "${BLUE}[2/5] Building Docker image (Dockerfile.k3s)...${NC}"
docker build -f Dockerfile.k3s -t "$IMAGE" .

# ── Step 3: Import image เข้า k3s ─────────────────────
echo -e "${BLUE}[3/5] Importing image into k3s containerd...${NC}"
docker save "$IMAGE" | sudo k3s ctr images import -
echo -e "${GREEN}Import เสร็จแล้ว${NC}"

# ── Step 4: Apply manifests ────────────────────────────
echo -e "${BLUE}[4/5] Applying k3s manifests...${NC}"

# Static manifests
for FILE in \
  k3s-manifests/00-namespace.yaml \
  k3s-manifests/02-pvc.yaml \
  k3s-manifests/03-postgres-statefulset.yaml \
  k3s-manifests/04-postgres-service.yaml \
  k3s-manifests/05-app-deployment.yaml \
  k3s-manifests/06-app-service.yaml
do
  echo "  apply: $FILE"
  $KUBECTL apply -f "$FILE"
done

# Secrets — ใช้ kubectl --from-literal แทน envsubst เพื่อหลีกเลี่ยง YAML escape issues
echo "  apply: secrets (kubectl create --from-literal)"
$KUBECTL create secret generic db-credentials \
  --namespace="$NAMESPACE" \
  --from-literal=POSTGRES_USER="$DB_USER" \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD" \
  --from-literal=POSTGRES_DB="$DB_NAME" \
  --dry-run=client -o yaml | $KUBECTL apply -f -

$KUBECTL create secret generic app-secrets \
  --namespace="$NAMESPACE" \
  --from-literal=DB_HOST=postgres \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_USER="$DB_USER" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=DB_NAME="$DB_NAME" \
  --from-literal=NEXT_PUBLIC_SITE_NAME="${SITE_NAME:-ระบบจองรถ}" \
  --from-literal=NEXT_PUBLIC_ORGANIZATION="${ORGANIZATION:-}" \
  --from-literal=TELEGRAM_ENABLED="${TELEGRAM_ENABLED:-false}" \
  --from-literal=TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}" \
  --from-literal=TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}" \
  --from-literal=LINE_ENABLED="${LINE_ENABLED:-false}" \
  --from-literal=LINE_TOKEN="${LINE_TOKEN:-}" \
  --from-literal=LINE_USER_ID_1="${LINE_USER_ID_1:-}" \
  --from-literal=LINE_USER_ID_2="${LINE_USER_ID_2:-}" \
  --from-literal=APP_URL="https://$DOMAIN" \
  --from-literal=USE_SECURE_COOKIES=true \
  --from-literal=NODE_ENV=production \
  --from-literal=DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}" \
  --dry-run=client -o yaml | $KUBECTL apply -f -

# IngressRoute (envsubst — ไม่มี special chars ที่มีปัญหา)
echo "  apply: 07-ingressroute.yaml.template → (envsubst)"
envsubst < k3s-manifests/07-ingressroute.yaml.template | $KUBECTL apply -f -

# ── Step 5: Rollout ────────────────────────────────────
echo -e "${BLUE}[5/5] Rolling out deployment...${NC}"
$KUBECTL rollout restart deployment/web-vrdnkcar-app -n "$NAMESPACE"
$KUBECTL rollout status deployment/web-vrdnkcar-app -n "$NAMESPACE" --timeout=120s

echo ""
echo -e "${GREEN}✓ Deploy สำเร็จ!${NC}"
echo -e "${GREEN}  URL: https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}Pod status:${NC}"
$KUBECTL get pods -n "$NAMESPACE"
