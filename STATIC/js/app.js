// Menjadikan fungsi ini global agar bisa dipanggil oleh Google Maps
window.initMap = function() {
    console.log("Fungsi initMap() untuk Dashboard berhasil dijalankan!");

    const lokasiAwal = { lat: -8.775, lng: 115.172 };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: lokasiAwal,
    });

    // Ambil semua data nasabah untuk ditampilkan di dashboard
    fetch('/api/nasabah')
        .then(response => response.json())
        .then(data => {
            console.log("Data dashboard berhasil diambil:", data);
            data.forEach(nasabah => {
                const markerPosition = {
                    lat: parseFloat(nasabah.langitude),
                    lng: parseFloat(nasabah.longitude)
                };
                const marker = new google.maps.Marker({
                    position: markerPosition,
                    map: map,
                    title: nasabah.nama_nasabah
                });
                const infoWindow = new google.maps.InfoWindow({
                    content: `<strong>${nasabah.nama_nasabah}</strong><br>${nasabah.alamat_nasabah}`
                });
                marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });
            });
        })
        .catch(error => {
            console.error("Gagal terhubung ke server:", error);
        });
};

// Semua logika lain yang tidak berhubungan dengan peta
document.addEventListener("DOMContentLoaded", () => {
    
    // Logika Form Tambah Nasabah
    const form = document.getElementById("form-tambah-nasabah");
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const nasabahBaru = {
                nama_nasabah: document.getElementById("nama_nasabah").value,
                alamat_nasabah: document.getElementById("alamat_nasabah").value,
                langitude: document.getElementById("langitude").value,
                longitude: document.getElementById("longitude").value
            };
            fetch('/api/nasabah/tambah', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nasabahBaru),
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                if(data.status === "sukses") { location.reload(); }
            })
            .catch(error => { console.error('Error:', error); alert('Terjadi kesalahan saat mengirim data.'); });
        });
    }

    // Logika Dropdown Menu
    const pemetaanMenu = document.getElementById("pemetaan-menu");
    if (pemetaanMenu) {
        pemetaanMenu.addEventListener("click", (event) => {
            event.preventDefault(); 
            const dropdownContainer = pemetaanMenu.closest('.nav-item-dropdown');
            if (dropdownContainer) { dropdownContainer.classList.toggle("open"); }
        });
    }

    // Logika Geolocation
    const getCoordsBtn = document.getElementById("get-coords-btn");
    if (getCoordsBtn) {
        getCoordsBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
                getCoordsBtn.textContent = '...'; 
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        document.getElementById('langitude').value = position.coords.latitude;
                        document.getElementById('longitude').value = position.coords.longitude;
                        getCoordsBtn.textContent = '📍'; 
                    },
                    (error) => {
                        let errorMessage = "Terjadi kesalahan.";
                        switch(error.code) {
                            case error.PERMISSION_DENIED: errorMessage = "Anda tidak mengizinkan akses lokasi."; break;
                            case error.POSITION_UNAVAILABLE: errorMessage = "Informasi lokasi tidak tersedia."; break;
                            case error.TIMEOUT: errorMessage = "Waktu permintaan lokasi habis."; break;
                        }
                        alert(errorMessage);
                        getCoordsBtn.textContent = '📍'; 
                    }
                );
            } else { alert("Geolocation tidak didukung browser ini."); }
        });
    }
    
    // Logika Toggle Sidebar
    const toggleBtn = document.getElementById("sidebar-toggle-btn");
    const appContainer = document.querySelector(".app-container");
    if (toggleBtn && appContainer) {
        toggleBtn.addEventListener("click", () => {
            appContainer.classList.toggle("sidebar-collapsed");
        });
    }
});
