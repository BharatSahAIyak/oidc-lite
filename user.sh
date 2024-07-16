#!/bin/bash

# Base URL and constant values
BASE_URL="https://jl4spt7t-3000.inc1.devtunnels.ms"
APPLICATION_ID="myminioadmin"
TENANT_ID="minio-tenant"
API_KEY_VALUE="master"
ROLE_ID="adminRoleId"
GROUP_ID="agroup"

# Function to generate a random email
generate_random_email() {
  echo "$(pwgen -1 8)@example.com"
}

# Function to generate a random password
generate_random_password() {
  echo "$(pwgen -s 12 1)"
}

# Loop to create 100 users
for i in {1..100}
do
  USER_EMAIL=$(generate_random_email)
  USER_PASSWORD=$(generate_random_password)

  # JSON payload
  JSON_PAYLOAD=$(cat <<EOF
{
  "data": {
      "userInfo": {
        "active": true,
        "applicationId": "${APPLICATION_ID}",
        "membership": ["${GROUP_ID}"],
        "userData": {
            "username": "AdminUser",
            "password": "${USER_PASSWORD}"
        },
        "email": "${USER_EMAIL}"
      },
      "registrationInfo": {
        "generateAuthenticationToken": true,
        "applicationId": "${APPLICATION_ID}",
        "roles": ["user"]
      }
  }
}
EOF
)

  # Send the request using curl
  curl -X POST "${BASE_URL}/user/registration/combined/" \
    -H "x-stencil-tenantid: ${TENANT_ID}" \
    -H "authorization: ${API_KEY_VALUE}" \
    -H "Content-Type: application/json" \
    -d "${JSON_PAYLOAD}"

  echo
done
