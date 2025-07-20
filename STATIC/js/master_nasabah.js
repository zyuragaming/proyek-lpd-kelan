document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("nasabah-table-body");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    let allNasabahData = [];

    const modal = document.getElementById("modal-tambah-nasabah");
    const addBtn = document.getElementById("add-btn");
    const closeModalBtn = document.getElementById("modal-close-btn");
    const formTambah = document.getElementById("form-tambah-nasabah-master");
    const getCoordsBtn = document.getElementById("get-coords-btn");

    function populateTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Tidak ada data ditemukan.</td></tr>';
            return;
        }
        data.forEach(nasabah => {
            tableBody.innerHTML += `
                <tr>
                    <td>${nasabah.id_nasabah}</td>
                    <td>${nasabah.nik || 'N/A'}</td>
                    <td>${nasabah.nama_nasabah}</td>
                    <td>${nasabah.alamat_nasabah}</td>
                    <td>${nasabah.no_tlpn_nasabah || 'N/A'}</td>
                    <td>${nasabah.langitude}</td>
                    <td>${nasabah.longitude}</td>
                    <td>
                        <button class="btn-edit" data-id="${nasabah.id_nasabah}">✏️</button>
                    </td>
                </tr>
            `;
        });
    }

    function fetchAllNasabah() {
        fetch('/api/nasabah/all')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error("Error fetching data:", data.error);
                    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Gagal memuat data.</td></tr>';
                    return;
                }
                allNasabahData = data;
                populateTable(allNasabahData);
            })
            .catch(error => {
                console.error("Fetch error:", error);
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Gagal terhubung ke server.</td></tr>';
            });
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            populateTable(allNasabahData);
            return;
        }
        const filteredData = allNasabahData.filter(nasabah => 
            nasabah.id_nasabah.toString().includes(searchTerm) ||
            nasabah.nama_nasabah.toLowerCase().includes(searchTerm)
        );
        populateTable(filteredData);
    }

    searchBtn.addEventListener("click", handleSearch);
    searchInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") handleSearch();
    });

    addBtn.addEventListener("click", () => {
        const idNasabahInput = modal.querySelector("#id_nasabah");
        idNasabahInput.value = "Memuat ID...";
        formTambah.reset(); // Kosongkan form sebelum dibuka

        fetch('/api/nasabah/next-id')
            .then(response => response.json())
            .then(data => {
                if (data.next_id) {
                    idNasabahInput.value = data.next_id;
                } else {
                    idNasabahInput.value = "Error";
                    alert("Gagal mendapatkan ID Nasabah otomatis.");
                }
                modal.classList.remove("hidden");
            })
            .catch(error => {
                console.error("Error fetching next ID:", error);
                idNasabahInput.value = "Error";
                alert("Gagal terhubung ke server untuk mendapatkan ID.");
            });
    });

    closeModalBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    getCoordsBtn.addEventListener("click", () => {
        if (navigator.geolocation) {
            getCoordsBtn.textContent = '...';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    modal.querySelector('#langitude').value = position.coords.latitude;
                    modal.querySelector('#longitude').value = position.coords.longitude;
                    getCoordsBtn.textContent = '📍';
                },
                (error) => {
                    alert("Gagal mendapatkan lokasi.");
                    getCoordsBtn.textContent = '📍';
                }
            );
        } else {
            alert("Geolocation tidak didukung oleh browser ini.");
        }
    });

    formTambah.addEventListener("submit", (event) => {
        event.preventDefault();
        const nasabahBaru = {
            id_nasabah: modal.querySelector("#id_nasabah").value,
            nik: modal.querySelector("#nik").value,
            nama_nasabah: modal.querySelector("#nama_nasabah").value,
            no_tlpn_nasabah: modal.querySelector("#no_tlpn_nasabah").value,
            alamat_nasabah: modal.querySelector("#alamat_nasabah").value,
            langitude: modal.querySelector("#langitude").value,
            longitude: modal.querySelector("#longitude").value
        };

        fetch('/api/nasabah/tambah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nasabahBaru),
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
            if (data.status === "sukses") {
                modal.classList.add("hidden");
                fetchAllNasabah();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat mengirim data.');
        });
    });

    fetchAllNasabah();
});
