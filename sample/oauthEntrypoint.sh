#!/bin/bash

npm start &

sleep 10

oauth2-proxy --config /app/oauth2proxy.cfg --code-challenge-method "S256" --logging-filename ""
