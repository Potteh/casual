# CasualDisaster Twitch landing page

Static homepage plus an optional server-side Twitch API service for live status, title, category, viewer count and avatar.

## Setup on Ubuntu VPS

Node.js 20+ is required. Create a Twitch developer application at https://dev.twitch.tv/console/apps and get a Client ID and Client Secret. Never commit credentials to Git.

```bash
cd /var/www/casualdisaster.me
sudo git pull origin main
sudo install -m 600 /dev/null /etc/casualdisaster-twitch.env
sudo nano /etc/casualdisaster-twitch.env
```

Put these lines in the env file:

```ini
TWITCH_CLIENT_ID=YOUR_CLIENT_ID
TWITCH_CLIENT_SECRET=YOUR_CLIENT_SECRET
PORT=3200
```

Create a systemd service at `/etc/systemd/system/casualdisaster-twitch.service`:

```ini
[Unit]
Description=CasualDisaster Twitch API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/casualdisaster.me
EnvironmentFile=/etc/casualdisaster-twitch.env
ExecStart=/usr/bin/node /var/www/casualdisaster.me/server.js
Restart=on-failure
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now casualdisaster-twitch
```

In the **existing HTTPS server block** for `casualdisaster.me` in `/etc/nginx/sites-available/pixelhaven`, add this location without removing the Pixel Haven, SportsMania, or Project1 routes:

```nginx
location = /api/twitch/status {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_read_timeout 10s;
}
```

Check and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -s https://casualdisaster.me/api/twitch/status
```

The frontend refreshes every 60 seconds. If the API is unavailable it displays a status-unavailable message. Secrets remain server-side.
