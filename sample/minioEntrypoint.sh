#!/bin/bash

npm start &

sleep 10

mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc admin config set myminio identity_openid \
    config_url="http://localhost:3000/oidc/.well-known/openid-configuration" \
    client_id="myminioadmin" \
    client_secret="minio-secret-key-change-me" \
    display_name="Stencil SSO"

mc admin service restart myminio

tail -f /dev/null
