import { Utils } from "./Utils.js";

// ===============================
// RIWAYAT FUNCTIONS (Logika Grouping V2)
// ===============================
export class HistoryManager {
  constructor(app) {
    this.app = app;
  }

  init() {
    // Listener untuk Tab
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));

        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        document.getElementById(tabId).classList.add("active");

        if (tabId === "target-history") {
          this.renderTargetRiwayat();
        } else if (tabId === "utama-history") {
          this.renderUtamaRiwayat();
        } else if (tabId === "semua-history") {
          this.renderSemuaRiwayat();
        }
      });
    });

    // Listener untuk <select> di tab Target
    document
      .getElementById("target-riwayat-selector")
      ?.addEventListener("change", (e) => {
        this.showTargetRiwayat(e.target.value);
      });
  }

  // Dipanggil saat pindah ke hal. Riwayat
  renderRiwayat() {
    this.app.targets.populateTargetSelects(); // Isi <select> dulu

    // Reset ke tab 'Semua'
    document
      .querySelector(".tab-btn[data-tab='semua-history']")
      ?.classList.add("active");
    document.getElementById("semua-history")?.classList.add("active");
    document
      .querySelector(".tab-btn[data-tab='utama-history']")
      ?.classList.remove("active");
    document.getElementById("utama-history")?.classList.remove("active");
    document
      .querySelector(".tab-btn[data-tab='target-history']")
      ?.classList.remove("active");
    document.getElementById("target-history")?.classList.remove("active");

    this.renderSemuaRiwayat();
  }

  // UI Item Riwayat
  createRiwayatElement([tanggal, tipe, jumlah, catatan]) {
    const isNabung = tipe === "nabung";
    const tgl = new Date(tanggal);
    const tglFormatted = tgl
      .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      .replace(".", ":");
    const subText = `${isNabung ? "Nabung" : "Keluar"} - ${tglFormatted}`;

    const iconBg = isNabung ? "bg-green-600" : "bg-red-600";
    const icon = isNabung ? "+" : "-";
    const amountClass = isNabung ? "text-green-400" : "text-red-400";
    const amountSign = isNabung ? "+" : "-";

    return `
          <div class="bg-gray-700 rounded-lg p-4 flex items-center space-x-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center">
                  <span class="font-bold text-3xl text-white transform -translate-y-[2px]">${icon}</span>
              </div>
              <div class="flex-grow overflow-hidden mr-2">
                  <p class="font-medium text-white truncate">${catatan}</p>
                  <p class="text-sm text-gray-400">${subText}</p>
              </div>
              <p class="font-semibold text-lg ${amountClass} whitespace-nowrap">
                  ${amountSign}${Utils.formatRupiah(jumlah)}
              </p>
          </div>
      `;
  }

  // Helper Render
  renderGroupedHistory(containerId, transactions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (transactions.length === 0) {
      container.innerHTML =
        '<p class="text-gray-400 text-center py-4">Belum ada riwayat transaksi.</p>';
      return;
    }

    const grouped = transactions.reduce((acc, tx) => {
      const dateKey = Utils.getGroupDate(tx[0]);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(tx);
      return acc;
    }, {});

    const sortedDateKeys = Object.keys(grouped).sort((a, b) => {
      // Ambil tanggal ISO dari transaksi pertama di grup itu untuk sorting
      const dateA = new Date(grouped[a][0][0]);
      const dateB = new Date(grouped[b][0][0]);
      return dateB - dateA; // Sortir dari terbaru ke terlama
    });

    let html = "";
    for (const dateKey of sortedDateKeys) {
      html += `<div class="mb-5">`;
      html += `<h4 class="text-sm font-semibold text-gray-300 mb-3 ml-1">${dateKey}</h4>`;
      html += `<div class="space-y-3">`;

      // Urutkan transaksi di dalam grup berdasarkan waktu
      const sortedTxs = grouped[dateKey].sort(
        (a, b) => new Date(b[0]) - new Date(a[0])
      );

      html += sortedTxs.map(this.createRiwayatElement).join("");
      html += `</div></div>`;
    }

    container.innerHTML = html;
  }

  // Fungsi Render 'Semua'
  renderSemuaRiwayat() {
    const user = this.app.state.currentUser;
    let allTransactions = [...user.riwayat];

    Object.keys(user.targets).forEach((targetName) => {
      const target = user.targets[targetName];
      const targetTxs = target.riwayat.map((tx) => {
        let [tanggal, tipe, jumlah, catatan] = tx;
        // Modifikasi catatan untuk kejelasan
        if (catatan.startsWith("Transfer dari target:")) {
          // Biarkan apa adanya, tapi ini seharusnya tidak ada di riwayat target
        } else if (tipe === "nabung") {
          catatan = `${catatan} (Target: ${targetName})`;
        } else {
          catatan = `${catatan} (Target: ${targetName})`;
        }
        return [tanggal, tipe, jumlah, catatan];
      });
      // Filter transaksi "Transfer" agar tidak duplikat
      const filteredTxs = targetTxs.filter(
        (tx) => !tx[3].startsWith("Transfer dari target:")
      );
      allTransactions.push(...filteredTxs);
    });

    allTransactions.sort((a, b) => new Date(b[0]) - new Date(a[0]));
    this.renderGroupedHistory("semua-riwayat", allTransactions);
  }

  // Fungsi Render 'Utama'
  renderUtamaRiwayat() {
    this.renderGroupedHistory(
      "utama-riwayat",
      this.app.state.currentUser.riwayat
    );
  }

  // Fungsi Render 'Target'
  renderTargetRiwayat() {
    // this.app.targets.populateTargetSelects(); // (Sudah dipanggil di renderRiwayat)
    const select = document.getElementById("target-riwayat-selector");
    if (select.options.length > 0 && select.options[0].value) {
      this.showTargetRiwayat(select.value); // Tampilkan riwayat untuk target pertama
    } else {
      document.getElementById("target-riwayat").innerHTML =
        '<p class="text-gray-400 text-center py-4">Belum ada target.</p>';
    }
  }

  showTargetRiwayat(targetName) {
    const user = this.app.state.currentUser;
    const target = user.targets[targetName];
    const transactions = target && target.riwayat ? target.riwayat : [];
    // Filter transaksi "Transfer"
    const filteredTxs = transactions.filter(
      (tx) => !tx[3].startsWith("Transfer dari target:")
    );
    this.renderGroupedHistory("target-riwayat", filteredTxs);
  }
}
