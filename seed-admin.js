require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const username = 'admin';
        const plainPassword = 'admin123'; // Password asli Anda

        // Hashing password menggunakan bcrypt (Standar Keamanan Siber)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        // Masukkan ke database Supabase
        await db.query('DELETE FROM admin WHERE username = $1', [username]);
        await db.query(
            'INSERT INTO admin (username, password) VALUES ($1, $2)',
            [username, hashedPassword]
        );

        console.log("SUKSES: Akun admin berhasil dibuat dengan enkripsi hash bcrypt yang aman!");
        process.exit(0);
    } catch (err) {
        console.error("Gagal membuat admin:", err);
        process.exit(1);
    }
}

createAdmin();