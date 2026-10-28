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
