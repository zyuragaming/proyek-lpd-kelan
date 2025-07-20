# app.py

# Impor library yang kita butuhkan
from flask import Flask, jsonify, render_template, request, session, redirect, url_for
import mysql.connector
from mysql.connector import Error
from datetime import datetime
from functools import wraps

# --- Bagian Konfigurasi ---
# Membuat instance aplikasi Flask
app = Flask(__name__)
app.secret_key = 'kunci_rahasia_anda_yang_sangat_aman'
# Detail koneksi ke database MySQL Anda
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'db_pemetaan_lpdkelan'
}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Bagian Routing (Alamat URL untuk Halaman) ---

# Rute untuk halaman utama (Dashboard)
# Rute untuk halaman login

@app.route("/login")
def login():
    # Jika pengguna sudah login, langsung arahkan ke dashboard
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template("login.html")

# Rute untuk logout
@app.route("/logout")
def logout():
    session.clear() # Hapus semua data sesi
    return redirect(url_for('login'))

# Rute untuk halaman utama (Dashboard), sekarang dilindungi
@app.route("/")
@login_required
def index():
    return render_template("index.html")

# Rute untuk halaman Pemetaan Per Wilayah
@app.route("/pemetaan/wilayah")
@login_required
def pemetaan_wilayah():
    return render_template("pemetaan_wilayah.html")

# Rute untuk halaman Pemetaan Per Wilayah
@app.route("/master-nasabah")
@login_required
def master_nasabah():
    return render_template("master_nasabah.html")

@app.route("/api/login", methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        # Ambil data user berdasarkan username dari tabel tb_user
        cursor.execute("SELECT * FROM tb_user WHERE username = %s", (username,))
        user = cursor.fetchone()

        # Periksa apakah user ada dan password cocok
        if user and user['password'] == password:
            # Simpan info user ke dalam sesi browser
            session['user_id'] = user['id_user']
            session['username'] = user['username']
            session['jabatan'] = user['jabatan']
            return jsonify({"status": "sukses"})
        else:
            return jsonify({"status": "gagal", "message": "Username atau password salah."}), 401
            
    except Exception as e:
        print(f"Error di api_login: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
# API untuk mengambil SEMUA data nasabah (untuk peta di dashboard)
@app.route("/api/nasabah/all")
@login_required
def get_all_nasabah():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        # Ambil semua kolom yang relevan dari tb_nasabah
        cursor.execute("SELECT id_nasabah, nik, nama_nasabah, alamat_nasabah, no_tlpn_nasabah, langitude, longitude FROM tb_nasabah")
        rows = cursor.fetchall()
        return jsonify(rows)
    except Exception as e:
        print(f"Error di get_all_nasabah: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# ===== API BARU UNTUK MEMBUAT ID OTOMATIS =====
@app.route("/api/nasabah/next-id")
@login_required
def get_next_nasabah_id():
    try:
        now = datetime.now()
        prefix = now.strftime("%y%m")
        like_pattern = f"{prefix}%"
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = "SELECT MAX(id_nasabah) FROM tb_nasabah WHERE CAST(id_nasabah AS CHAR) LIKE %s"
        cursor.execute(query, (like_pattern,))
        result = cursor.fetchone()
        last_id = result[0] if result and result[0] is not None else None
        
        if last_id:
            last_sequence = int(str(last_id)[4:])
            new_sequence = last_sequence + 1
        else:
            new_sequence = 1
            
        new_id = int(f"{prefix}{new_sequence:04d}")
        return jsonify({"next_id": new_id})
    except Exception as e:
        print(f"Error di get_next_nasabah_id: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route("/api/nasabah/tambah", methods=['POST'])
@login_required
def tambah_nasabah():
    data = request.json
    try:
        if 'id_nasabah' not in data or not data['id_nasabah']:
            return jsonify({"error": "ID Nasabah tidak boleh kosong"}), 400

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = """INSERT INTO tb_nasabah (id_nasabah, nik, nama_nasabah, alamat_nasabah, no_tlpn_nasabah, langitude, longitude) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        values = (
            data['id_nasabah'], data.get('nik'), data['nama_nasabah'], 
            data['alamat_nasabah'], data.get('no_tlpn_nasabah'), 
            data['langitude'], data['longitude']
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({"status": "sukses", "message": "Data nasabah berhasil ditambahkan"}), 201
    except Exception as e:
        print(f"Error di tambah_nasabah: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# API untuk FILTER di halaman Pemetaan Wilayah
@app.route("/api/pemetaan/wilayah", methods=['POST'])
@login_required
def api_pemetaan_wilayah():
    try:
        data = request.json
        kategori = data.get('kategori')
        
        if kategori == 'tabungan':
            query = """
                SELECT 
                    n.id_nasabah, n.nama_nasabah, n.alamat_nasabah, n.langitude, n.longitude,
                    tw.wilayah_tabungan, tw.tempekan_tabungan,
                    (SELECT tp.no_rek FROM tb_produk_tabungan tp WHERE tp.id_nasabah = n.id_nasabah LIMIT 1) AS no_rek
                FROM tb_nasabah AS n
                JOIN tb_wilayah_tabungan AS tw ON n.id_nasabah = tw.id_nasabah
            """
        elif kategori == 'pinjaman':
            query = """
                SELECT 
                    n.id_nasabah, n.nama_nasabah, n.alamat_nasabah, n.langitude, n.longitude,
                    kw.wilayah_pinjaman, kw.tempekan_pinjaman,
                    (SELECT kp.no_pinjaman FROM tb_produk_pinjaman kp WHERE kp.id_nasabah = n.id_nasabah LIMIT 1) AS no_kredit
                FROM tb_nasabah AS n
                JOIN tb_wilayah_pinjaman AS kw ON n.id_nasabah = kw.id_nasabah
            """
        else:
            return jsonify({"error": "Kategori tidak valid"}), 400

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        hasil = cursor.fetchall()
        return jsonify(hasil)
    except Exception as e:
        print(f"Error di API pemetaan wilayah: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# API untuk MENAMBAH data wilayah dari modal (pop-up)
@app.route("/api/wilayah/tabungan/tambah", methods=['POST'])
@login_required
def tambah_wilayah_tabungan():
    try:
        data = request.json
        id_nasabah = data.get('id_nasabah')
        wilayah = data.get('wilayah')
        tempekan = data.get('tempekan')

        if not id_nasabah or not wilayah:
            return jsonify({"error": "ID Nasabah dan wilayah wajib diisi"}), 400

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = """
            INSERT INTO tb_wilayah_tabungan (id_nasabah, wilayah_tabungan, tempekan_tabungan)
            VALUES (%s, %s, %s)
        """
        values = (id_nasabah, wilayah, tempekan)
        cursor.execute(query, values)
        conn.commit()
        return jsonify({"status": "sukses", "message": "Data wilayah berhasil ditambahkan"}), 201
    except Exception as e:
        print(f"Error saat tambah wilayah: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# API untuk MENCARI nama nasabah berdasarkan ID
@app.route("/api/nasabah/search/<int:nasabah_id>")
@login_required
def search_nasabah_by_id(nasabah_id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT nama_nasabah FROM tb_nasabah WHERE id_nasabah = %s", (nasabah_id,))
        nasabah = cursor.fetchone()
        
        if nasabah:
            return jsonify(nasabah)
        else:
            return jsonify({"error": "Nasabah tidak ditemukan"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# --- Bagian untuk Menjalankan Server ---
if __name__ == '__main__':
    app.run(debug=True)
