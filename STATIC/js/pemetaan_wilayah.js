// Variabel global untuk menyimpan peta, data, dan marker
let map; 
let allMarkers = []; // Menyimpan semua objek marker
let fullDataset = []; // Menyimpan semua data dari server

// Objek untuk memetakan nama wilayah ke warna
const warnaWilayah = {
    "Kelan Abian": "#E74C3C",    // Merah
    "Kelan Desa": "#3498DB",     // Biru
    "Desa Adat Kelan": "#2ECC71", // Hijau
    "Krama Tamiu": "#F1C40F",    // Kuning
    "Tamiu": "#9B59B6",          // Ungu
    "default": "#7F8C8D"         // Abu-abu untuk lainnya
};

// Fungsi untuk inisialisasi peta
function initMap() {
    const lokasiAwal = { lat: -8.754135938429648, lng: 115.17592742883532 };
    map = new google.maps.Map(document.getElementById("map-wilayah"), {
        zoom: 16,
        center: lokasiAwal,
    });
}

// Fungsi untuk membersihkan semua marker dari peta
function clearMarkers() {
    allMarkers.forEach(marker => marker.setMap(null));
    allMarkers = [];
}

// Fungsi untuk menambahkan marker ke peta dengan warna
function addMarkerToMap(data) {
    if (!data.langitude || !data.longitude) return;

    const wilayah = data.wilayah_tabungan || data.wilayah_pinjaman;
    const warna = warnaWilayah[wilayah] || warnaWilayah.default;
    const marker = new google.maps.Marker({
        position: { lat: parseFloat(data.langitude), lng: parseFloat(data.longitude) },
        map: map,
        title: data.nama_nasabah,
        // Membuat ikon SVG kustom berbentuk lingkaran dengan warna yang sesuai
        icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: warna, // Warna pin diisi sesuai wilayah
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "#FFFFFF", // Warna garis tepi pin
            anchor: new google.maps.Point(12, 24),
            scale: 1.5
        }
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `<strong>${data.nama_nasabah}</strong><br>${data.alamat_nasabah || ''}`
    });
    marker.addListener("click", () => infoWindow.open(map, marker));    
    // Simpan data wilayah di dalam marker untuk filtering
    marker.wilayah = wilayah; 
    allMarkers.push(marker);
}

// Fungsi untuk membuat legenda
function buildLegend(data) {
    const legendContainer = document.getElementById('map-legend');
    legendContainer.innerHTML = '<h4>Keterangan</h4>'; // Reset isi legenda
    
    const daftarWilayahUnik = [...new Set(data.map(item => item.wilayah_tabungan || item.wilayah_pinjaman))];
    
    daftarWilayahUnik.forEach(wilayah => {
        const warna = warnaWilayah[wilayah] || warnaWilayah.default;
        legendContainer.innerHTML += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${warna};"></span>
                ${wilayah}
            </div>
        `;
    });
}

// Fungsi untuk memfilter tampilan (peta dan tabel) berdasarkan wilayah yang dipilih
function filterTampilanByWilayah(wilayahDipilih) {
    const tabelBody = document.getElementById("tabel-hasil-wilayah");
    tabelBody.innerHTML = ''; // Kosongkan tabel

    clearMarkers(); // Hapus marker lama sebelum menampilkan yang baru

    const dataTersaring = (wilayahDipilih === 'semua')
        ? fullDataset
        : fullDataset.filter(d => (d.wilayah_tabungan || d.wilayah_pinjaman) === wilayahDipilih);

    dataTersaring.forEach(d => {
        addMarkerToMap(d); // Tambahkan marker yang sudah difilter
        tabelBody.innerHTML += `
            <tr>
                <td>${d.id_nasabah}</td>
                <td>${d.nama_nasabah}</td>
                <td>${d.wilayah_tabungan || d.wilayah_pinjaman}</td>
                <td>${d.tempekan_tabungan || d.tempekan_pinjaman || '-'}</td>
                <td><a href="#">Detail</a></td>
            </tr>
        `;
    });
}

// Event listener utama
document.addEventListener("DOMContentLoaded", () => {
    const filterForm = document.getElementById("filter-form-wilayah");
    const hasilContainer = document.getElementById("hasil-pencarian");
    const filterWilayahDropdown = document.getElementById("filter-wilayah");
    const btnCariWilayah = document.getElementById("btn-cari-wilayah");

    initMap();

    // Logika untuk form filter "Cari"
    if (filterForm) {
        filterForm.addEventListener("submit", (event) => {
            event.preventDefault(); 
            const kategori = document.getElementById("kategori-nasabah").value;
            if (!kategori) {
                alert("Harap pilih kategori nasabah terlebih dahulu.");
                return;
            }

            fetch('/api/pemetaan/wilayah', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kategori: kategori })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(`Error: ${data.error}`);
                    return;
                }
                
                hasilContainer.classList.remove("hidden");
                fullDataset = data; 

                buildLegend(data);
                
                const daftarWilayahUnik = [...new Set(data.map(item => item.wilayah_tabungan || item.wilayah_pinjaman))];
                filterWilayahDropdown.innerHTML = '<option value="semua">Tampilkan Semua Wilayah</option>';
                daftarWilayahUnik.forEach(wilayah => {
                    filterWilayahDropdown.innerHTML += `<option value="${wilayah}">${wilayah}</option>`;
                });
                
                filterTampilanByWilayah('semua');
            })
            .catch(error => console.error('Error:', error));
        });
    }

    // Event listener untuk tombol "Cari Wilayah"
    if (btnCariWilayah) {
        btnCariWilayah.addEventListener("click", () => {
            const wilayahDipilih = filterWilayahDropdown.value;
            filterTampilanByWilayah(wilayahDipilih);
        });
    }
    // Logika untuk Modal (Pop-up)
    const modal = document.getElementById("modal-wilayah");
    const btnBukaModal = document.getElementById("btn-tambah-wilayah");
    const btnTutupModal = document.getElementById("modal-close-btn");
    const formWilayah = document.getElementById("form-tambah-wilayah");
    const idNasabahInput = document.getElementById("id_nasabah_lookup");
    const namaNasabahDisplay = document.getElementById("nama_nasabah_display");

    if (btnBukaModal) {
        btnBukaModal.addEventListener("click", () => {
            modal.classList.remove("hidden");
        });
    }

    if (btnTutupModal) {
        btnTutupModal.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    }

    if (idNasabahInput) {
        idNasabahInput.addEventListener("blur", () => {
            const nasabahId = idNasabahInput.value;
            if (!nasabahId) {
                namaNasabahDisplay.value = '';
                return;
            }
            namaNasabahDisplay.value = 'Mencari...';
            fetch(`/api/nasabah/search/${nasabahId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Nasabah tidak ditemukan');
                    return response.json();
                })
                .then(data => {
                    namaNasabahDisplay.value = data.nama_nasabah || 'Nasabah tidak ditemukan';
                })
                .catch(error => {
                    console.error('Error:', error);
                    namaNasabahDisplay.value = 'Gagal mencari nasabah';
                });
        });
    }

    if (formWilayah) {
        formWilayah.addEventListener("submit", (event) => {
            event.preventDefault();
            
            const dataWilayah = {
                id_nasabah: document.getElementById("id_nasabah_lookup").value,
                wilayah: document.getElementById("wilayah_tabungan").value,
                tempekan: document.getElementById("tempekan_tabungan").value
            };

            fetch('/api/wilayah/tabungan/tambah', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataWilayah)
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || data.error);
                if (data.status === 'sukses') {
                    modal.classList.add("hidden");
                    filterForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
});
