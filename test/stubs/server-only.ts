// Modul "server-only" hanya berupa penanda yang dimengerti bundler Next; ia
// tidak ada sebagai paket nyata di node_modules. Unit test yang memuat modul
// server perlu penggantinya, dan modul kosong sudah cukup — penjagaan aslinya
// tetap berlaku saat aplikasi dibangun.
export {};
