# Quick Deploy — Orlenbd on Hestia (Ubuntu VPS)

Assumes: VPS running Ubuntu 22.04, Hestia CP installed, domain already pointed to server.

---

## 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2
```

---

## 2. Install PostgreSQL & Create Database

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create the database and user:

```bash
sudo -u postgres psql << 'EOF'
CREATE USER orlenbd_user WITH PASSWORD 'StrongPass123';
CREATE DATABASE orlenbd_db OWNER orlenbd_user;
GRANT ALL PRIVILEGES ON DATABASE orlenbd_db TO orlenbd_user;
\q
EOF
```

---

## 3. Upload Project & Install Dependencies

```bash
cd /home/admin/web/yourdomain.com/public_html

# Upload files here via Git or SFTP, then:
npm install
```

---

## 4. Create `.env` File

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://orlenbd_user:StrongPass123@127.0.0.1:5432/orlenbd_db
SESSION_SECRET=replace-with-long-random-string
PORT=5025
PUBLIC_SITE_URL=https://yourdomain.com
VITE_PUBLIC_SITE_URL=https://yourdomain.com
SECURE_COOKIES=true
ORLENBD_UPLOADS_DIR=./uploads
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com
PLATFORM_ADMIN_PASSWORD=AdminPass123
EOF
```

---

## 5. Run Database Migration

```bash
npm run db:push
```

---

## 6. Build & Start

```bash
npm run build
mkdir -p uploads
pm2 start dist/index.js --name orlenbd
pm2 save && pm2 startup
```

---

## 7. Nginx Reverse Proxy (in Hestia)

In Hestia → Web → your domain → **Edit** → set proxy template to **node** and proxy port to **5025**.

Or manually add to your Nginx config:

```nginx
location / {
    proxy_pass http://127.0.0.1:5025;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

```bash
nginx -t && systemctl reload nginx
```

---

## Done ✅

Visit `https://yourdomain.com/admin` and log in with your admin credentials.

---

## Update App Later

```bash
git pull
npm install
npm run build
pm2 restart orlenbd
```
