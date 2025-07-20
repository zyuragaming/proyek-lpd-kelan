document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const errorMessage = document.getElementById("error-message");

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username, password: password }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "sukses") {
                    // Jika login berhasil, arahkan ke halaman dashboard
                    window.location.href = "/";
                } else {
                    // Jika gagal, tampilkan pesan error
                    errorMessage.textContent = data.message || "Terjadi kesalahan.";
                    errorMessage.style.display = "block";
                }
            })
            .catch(error => {
                console.error('Error:', error);
                errorMessage.textContent = "Tidak dapat terhubung ke server.";
                errorMessage.style.display = "block";
            });
        });
    }
});
