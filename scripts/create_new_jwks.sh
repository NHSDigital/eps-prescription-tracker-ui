#!/usr/bin/env bash

ENVIRONMENT=${1:?"Usage: $0 <environment>"}
CURRENT_DATE=$(date +"%Y-%m-%d")
KID="eps-cptui-${ENVIRONMENT}-${CURRENT_DATE}"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
SECRETS_DIR="$REPO_ROOT/.secrets"
JWKS_FILE="$REPO_ROOT/packages/staticContent/jwks/${ENVIRONMENT}/jwks.json"

if ! command -v jq >/dev/null 2>&1; then
	echo "jq is required to update the JWKS file" >&2
	exit 1
fi

if [ ! -f "$JWKS_FILE" ]; then
	echo "JWKS file not found for environment '$ENVIRONMENT' at $JWKS_FILE" >&2
	exit 1
fi

mkdir -p "$SECRETS_DIR"

openssl genrsa -out "$SECRETS_DIR/$KID.pem" 4096
openssl rsa -in "$SECRETS_DIR/$KID.pem" -pubout -outform PEM -out "$SECRETS_DIR/$KID.pem.pub"
MODULUS=$(
openssl rsa -pubin -in "$SECRETS_DIR/$KID.pem.pub" -noout -modulus `# Print modulus of public key` \
| cut -d '=' -f2 `# Extract modulus value from output` \
| xxd -r -p `# Convert from string to bytes` \
| openssl base64 -A `# Base64 encode without wrapping lines` \
| sed 's|+|-|g; s|/|_|g; s|=||g' `# URL encode as JWK standard requires`
)

TMP_JWKS=$(mktemp)

jq --arg n "$MODULUS" \
	 --arg kid "$KID" \
	 '.keys += [{"kty":"RSA","n":$n,"e":"AQAB","alg":"RS512","kid":$kid,"use":"sig"}]' \
	 "$JWKS_FILE" > "$TMP_JWKS"

mv "$TMP_JWKS" "$JWKS_FILE"
