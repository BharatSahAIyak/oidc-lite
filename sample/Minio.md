# Integrating our service with MinIO

## Steps

1. Install `minio-client` i.e `mc`:

```
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs \
  -o $HOME/minio-binaries/mc

chmod +x $HOME/minio-binaries/mc
export PATH=$PATH:$HOME/minio-binaries/

mc --help
```
If you have already installed `mc` but it is not showing in terminal, do: `export PATH=$PATH:$HOME/minio-binaries/`

2. Configure minio with our setup:

```
mc admin config set myminio identity_openid \
   config_url="http://localhost:3000/oidc/.well-known/openid-configuration" \
client_id="myminioadmin" \
client_secret="minio-secret-key-change-me" \
display_name="Stencil SSO"
```

3. Run `mc admin service restart myminio`

4. Goto `localhost:9001`

5. Select `Stencil SSO`

6. Enter credentials as `user@email.com ` `userPassword12#`, else create a new user
<!-- 
7. You will most probably run with an error: `Policy claim missing from the JWT token, credentials will not be generated`

8. This occurs because minIO requires an additional property in `id_token` i.e. `policy`. `Policies` are maintained by MinIO and are required in `id_token`. Default policies are: `['consoleAdmin', 'diagnostics','readonly','readwrite','writeonly']`.

8a. To solve this, a mapper is required. However for now just go to `line 575` of `oidc.service.ts` and uncomment the line `policy: ['consoleAdmin']`

9. Refresh the error page on MinIO. -->