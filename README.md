# 🎁 Wedding Gift List · Juve & Tata

Web sederhana daftar kado pernikahan. Tamu mengisi nama, lalu memilih "bubble" jenis barang. Kado yang sudah dipilih akan menampilkan nama pemberinya, sehingga kado tidak dobel.

- Halaman tamu: https://gift-wedding-juve-tata.github.io/
- Halaman admin: https://gift-wedding-juve-tata.github.io/admin/

## Data
Sumber data ada di [`data/gifts.csv`](data/gifts.csv) (`id,kategori,nama,ikon,pemberi,waktu`).
Pilihan tamu & perubahan dari admin disimpan langsung ke file ini lewat GitHub API (setiap pilihan = 1 commit).

## Menyambungkan penyimpanan (sekali saja)
1. Buat **fine-grained token** di https://github.com/settings/personal-access-tokens/new
   - Repository access: hanya `gift-wedding-juve-tata.github.io`
   - Permissions → Contents: **Read and write**
2. Buka `/admin/` → tab **Pengaturan** → tempel token → Simpan.

## Coba di komputer
```bash
npx http-server -p 5173 -c-1
```
Tanpa token, di `localhost` web berjalan dalam mode demo (data disimpan di browser).

## Fitur tambahan
- **Ucapan & doa**: tamu bisa menulis ucapan saat memilih kado (kolom `ucapan` di CSV), tampil di bagian bawah halaman tamu.
- **Link khusus tamu**: `https://gift-wedding-juve-tata.github.io/?nama=Burhan` mengisi nama otomatis. Buat massal + kirim WhatsApp dari Admin → **Link Tamu**.
- **Hitung mundur acara**: atur di Admin → **Pengaturan → Info acara** (disimpan di `data/settings.json`).
- **Riwayat & pulihkan**: Admin → **Riwayat** menampilkan semua perubahan data dan bisa mengembalikan ke versi sebelumnya.
- Web hanya mengecek perubahan data tiap 30 detik memakai ETag, sehingga hemat kuota API GitHub.

Saat diuji di komputer sendiri, buka `http://localhost:5173/?demo` supaya data asli tidak ikut berubah.
