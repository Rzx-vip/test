# Igneel RestAPI — Dark Creator Auth

Starter full-stack untuk login/register dengan MongoDB Atlas, Express, password hashing, HTTP-only auth cookie, particle background, dan naga 15-segment yang mengikuti kursor.

## 1. Yang perlu kamu install

- Node.js 20+
- Akun MongoDB Atlas

## 2. Setup MongoDB Atlas

1. Masuk ke MongoDB Atlas.
2. Buat project baru, misalnya `Igneel RestAPI`.
3. Buat database deployment/cluster.
4. Buat **Database User** untuk aplikasi. Ini berbeda dari akun login Atlas.
5. Buka **Network Access / IP Access List** dan tambahkan IP dari environment tempat Node.js berjalan. Untuk local development, kamu bisa menambahkan IP publik komputer saat setup. Jangan asal membuka akses luas untuk production.
6. Pilih **Connect → Drivers**, pilih Node.js, lalu salin connection string MongoDB.

### Apakah perlu API Key?

Untuk aplikasi login ini **tidak perlu Atlas Administration API Key**. Yang dibutuhkan server hanya:

- MongoDB connection string (`MONGODB_URI`)
- username/password Database User di dalam connection string
- `JWT_SECRET` buatan sendiri untuk menandatangani cookie session/token

Jangan pernah menaruh connection string, database password, atau Atlas API key di `login.html`.

## 3. Buat file .env

Salin `.env.example` menjadi `.env`, lalu isi:

```env
MONGODB_URI=mongodb+srv://DB_USER:DB_PASSWORD@YOUR_CLUSTER.mongodb.net/igneel_restapi?retryWrites=true&w=majority
JWT_SECRET=ganti-dengan-rahasia-random-panjang-minimal-32-karakter
PORT=3000
NODE_ENV=development
MONGODB_DB_NAME=igneel_restapi
```

### Contoh JWT_SECRET aman

Jalankan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Salin hasilnya ke `JWT_SECRET`.

## 4. Install dependency

```bash
npm install
```

## 5. Jalankan

Development:

```bash
npm run dev
```

Atau biasa:

```bash
npm start
```

Buka:

`http://localhost:3000/login.html`

## 6. Alur aplikasi

### Register

`login.html` → `POST /api/auth/register` → validasi → password di-hash dengan bcrypt → MongoDB → response sukses → form register berganti ke login → username/email dan password langsung diisikan ke form login di memori tab saat itu.

### Login

`login.html` → `POST /api/auth/login` → cari username/email → bcrypt compare → server memberi cookie `igneel_auth` (`HttpOnly`, `SameSite=Strict`) → tampil alert sukses + sambutan → redirect ke `/dashboard.html`.

### Dashboard

`dashboard.html` memanggil `GET /api/auth/me`. Bila cookie valid, user ditampilkan. Bila sesi tidak valid, otomatis kembali ke `/login.html`.

## 7. Struktur folder

```text
igneel-restapi/
├── public/
│   ├── login.html        # HTML + CSS + JS jadi satu
│   └── dashboard.html
├── .env.example
├── package.json
├── server.js
└── README.md
```

## 8. Catatan security penting

- Password tidak disimpan plaintext.
- Cookie auth dibuat `HttpOnly` agar tidak bisa dibaca JavaScript.
- Production otomatis memakai `Secure` jika `NODE_ENV=production`.
- Endpoint register/login dibatasi dengan rate limiter.
- Helmet dipasang untuk security headers.
- Connection string database hanya berada di server `.env`.
- Untuk production, gunakan HTTPS, batasi IP/network MongoDB, dan simpan secret di secret manager/environment variable.
