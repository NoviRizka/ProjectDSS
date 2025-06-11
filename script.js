document.addEventListener('DOMContentLoaded', function() {
  // Modal functionality
  const modal = document.getElementById('modalAdd');
  const btnAdd = document.getElementById('btnAdd');
  const span = document.querySelector('.close');
  const formAdd = document.getElementById('formAdd');

  btnAdd.addEventListener('click', () => modal.style.display = 'block');
  span.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // Add new row
  formAdd.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('inputName').value;
    const jarak = document.getElementById('inputJarak').value;
    const biaya = document.getElementById('inputBiaya').value;
    const waktu = document.getElementById('inputWaktu').value;
    const transportasi = document.getElementById('inputTransportasi').value;
    const fasilitas = document.getElementById('inputFasilitas').value;

    const table = document.querySelector('#dataTable tbody');
    const newRow = table.insertRow();
    
    newRow.innerHTML = `
      <td>${name}</td>
      <td>${jarak}</td>
      <td>${biaya}</td>
      <td>${waktu}</td>
      <td>${transportasi}</td>
      <td>${fasilitas}</td>
      <td><button class="btn-delete"><i class="fas fa-trash"></i></button></td>
    `;

    // Add delete event to new row
    newRow.querySelector('.btn-delete').addEventListener('click', function() {
      table.removeChild(newRow);
    });

    // Reset form and close modal
    formAdd.reset();
    modal.style.display = 'none';
  });

  // Add delete events to existing rows
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const row = this.closest('tr');
      row.parentNode.removeChild(row);
    });
  });

  // Calculate TOPSIS
  document.getElementById('btnCalculate').addEventListener('click', calculateTOPSIS);
});

function calculateTOPSIS() {
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Menghitung...</p>';

  // Ambil bobot kriteria
  const weights = [
    parseFloat(document.getElementById('weightJarak').value),
    parseFloat(document.getElementById('weightBiaya').value),
    parseFloat(document.getElementById('weightWaktu').value),
    parseFloat(document.getElementById('weightTransportasi').value),
    parseFloat(document.getElementById('weightFasilitas').value)
  ];

  // Validasi bobot
  if (weights.some(w => isNaN(w) || w < 0)) {
    resultContainer.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Bobot tidak valid!</p>';
    return;
  }

  // Ambil data alternatif
  const table = document.querySelector('#dataTable tbody');
  const rows = table.querySelectorAll('tr');
  
  if (rows.length === 0) {
    resultContainer.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Tidak ada data alternatif!</p>';
    return;
  }

  const matrix = [];
  const names = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    names.push(cells[0].textContent);
    matrix.push([
      parseFloat(cells[1].textContent), // Jarak
      parseFloat(cells[2].textContent), // Biaya
      parseFloat(cells[3].textContent), // Waktu
      parseFloat(cells[4].textContent), // Transportasi
      parseFloat(cells[5].textContent)  // Fasilitas
    ]);
  });

  // 1. Hitung Sum of Squares dan Akarnya (√∑x²)
  const cols = matrix[0].length;
  const sumSquares = Array(cols).fill(0);
  
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < matrix.length; i++) {
      sumSquares[j] += matrix[i][j] ** 2;
    }
  }
  
  const sqrtSumSquares = sumSquares.map(Math.sqrt);

  // 2. Matriks Ternormalisasi (R)
  const normMatrix = matrix.map(row =>
    row.map((val, j) => val / sqrtSumSquares[j])
  );

  // 3. Normalisasi bobot
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  const normWeights = weights.map(w => w / sumWeights);

  // 4. Matriks Terbobot (V)
  const weightedMatrix = normMatrix.map(row =>
    row.map((val, j) => val * normWeights[j])
  );

  // 5. Solusi Ideal (A⁺ dan A⁻)
  const benefit = [false, false, true, true, true]; // Kriteria benefit/cost
  const idealPlus = [], idealMin = [];
  
  for (let j = 0; j < cols; j++) {
    const col = weightedMatrix.map(r => r[j]);
    idealPlus[j] = benefit[j] ? Math.max(...col) : Math.min(...col);
    idealMin[j] = benefit[j] ? Math.min(...col) : Math.max(...col);
  }

  // 6. Jarak ke Solusi Ideal (D⁺ dan D⁻)
  const Dplus = weightedMatrix.map(row =>
    Math.sqrt(row.reduce((acc, val, j) => acc + (val - idealPlus[j]) ** 2, 0))
  );
  
  const Dmin = weightedMatrix.map(row =>
    Math.sqrt(row.reduce((acc, val, j) => acc + (val - idealMin[j]) ** 2, 0))
  );

  // 7. Skor Akhir
  const scores = Dmin.map((dmin, i) => dmin / (dmin + Dplus[i]));
  const result = names.map((name, i) => ({
    name, score: scores[i], Dplus: Dplus[i], Dmin: Dmin[i], rank: 0
  })).sort((a, b) => b.score - a.score);
  
  result.forEach((r, i) => r.rank = i + 1);

  // Tampilkan Hasil Lengkap
  displayResults(result, {
    sumSquares,
    sqrtSumSquares,
    normMatrix,
    normWeights,
    weightedMatrix,
    idealPlus,
    idealMin,
    Dplus,
    Dmin
  });
}

function displayResults(result, calculations) {
  const resultContainer = document.getElementById('resultContainer');
  
  let html = `
    <div class="step-card">
      <h3 class="step-title"><i class="fas fa-chart-line"></i> Hasil Ranking</h3>
      <table class="rank-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Nama Wisata</th>
            <th>Skor Preferensi</th>
            <th>D+</th>
            <th>D-</th>
          </tr>
        </thead>
        <tbody>
          ${result.map(r => `
            <tr class="${r.rank === 1 ? 'highlight' : ''}">
              <td>${r.rank}</td>
              <td>${r.name}</td>
              <td>${r.score.toFixed(4)}</td>
              <td>${r.Dplus.toFixed(4)}</td>
              <td>${r.Dmin.toFixed(4)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="conclusion">
        <p><strong>Kesimpulan:</strong> Berdasarkan perhitungan TOPSIS, <strong>${result[0].name}</strong> adalah alternatif terbaik dengan nilai preferensi <strong>${result[0].score.toFixed(4)}</strong>.</p>
      </div>
    </div>
    
    <div class="chart-container">
      <canvas id="resultChart"></canvas>
    </div>
    
    <div class="step-card">
      <h3 class="step-title"><i class="fas fa-calculator"></i> Detail Perhitungan</h3>
      
      <div class="step">
        <h4>1. Jumlah Kuadrat dan Akar (√∑x²)</h4>
        <table class="detail-table">
          <tr>
            <th>Kriteria</th>
            <th>Jarak</th>
            <th>Biaya</th>
            <th>Waktu</th>
            <th>Transportasi</th>
            <th>Fasilitas</th>
          </tr>
          <tr>
            <td><strong>∑x²</strong></td>
            ${calculations.sumSquares.map(s => `<td>${s.toFixed(4)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>√∑x²</strong></td>
            ${calculations.sqrtSumSquares.map(s => `<td>${s.toFixed(4)}</td>`).join('')}
          </tr>
        </table>
      </div>
      
      <div class="step">
        <h4>2. Matriks Ternormalisasi (R)</h4>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Alternatif</th>
              <th>Jarak</th>
              <th>Biaya</th>
              <th>Waktu</th>
              <th>Transportasi</th>
              <th>Fasilitas</th>
            </tr>
          </thead>
          <tbody>
            ${calculations.normMatrix.map((row, i) => `
              <tr>
                <td>${result.find(r => r.name === result[i].name).name}</td>
                ${row.map(v => `<td>${v.toFixed(4)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="step">
        <h4>3. Bobot Ternormalisasi</h4>
        <table class="detail-table">
          <tr>
            <th>Kriteria</th>
            <th>Jarak</th>
            <th>Biaya</th>
            <th>Waktu</th>
            <th>Transportasi</th>
            <th>Fasilitas</th>
          </tr>
          <tr>
            <td><strong>Bobot</strong></td>
            ${calculations.normWeights.map(w => `<td>${w.toFixed(4)}</td>`).join('')}
          </tr>
        </table>
      </div>
      
      <div class="step">
        <h4>4. Matriks Terbobot (V)</h4>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Alternatif</th>
              <th>Jarak</th>
              <th>Biaya</th>
              <th>Waktu</th>
              <th>Transportasi</th>
              <th>Fasilitas</th>
            </tr>
          </thead>
          <tbody>
            ${calculations.weightedMatrix.map((row, i) => `
              <tr>
                <td>${result.find(r => r.name === result[i].name).name}</td>
                ${row.map(v => `<td>${v.toFixed(4)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="step">
        <h4>5. Solusi Ideal</h4>
        <table class="detail-table">
          <tr>
            <th>Kriteria</th>
            <th>Jarak</th>
            <th>Biaya</th>
            <th>Waktu</th>
            <th>Transportasi</th>
            <th>Fasilitas</th>
          </tr>
          <tr>
            <td><strong>A⁺ (Positif)</strong></td>
            ${calculations.idealPlus.map(v => `<td>${v.toFixed(4)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>A⁻ (Negatif)</strong></td>
            ${calculations.idealMin.map(v => `<td>${v.toFixed(4)}</td>`).join('')}
          </tr>
        </table>
      </div>
      
      <div class="step">
        <h4>6. Jarak ke Solusi Ideal</h4>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Alternatif</th>
              <th>D⁺ (Positif)</th>
              <th>D⁻ (Negatif)</th>
            </tr>
          </thead>
          <tbody>
            ${result.map(r => `
              <tr>
                <td>${r.name}</td>
                <td>${r.Dplus.toFixed(4)}</td>
                <td>${r.Dmin.toFixed(4)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  resultContainer.innerHTML = html;
  
  // Render chart
  renderChart(result);
}

function renderChart(result) {
  const ctx = document.getElementById('resultChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: result.map(r => r.name),
      datasets: [
        {
          label: 'Skor Preferensi',
          data: result.map(r => r.score),
          backgroundColor: result.map((r, i) => 
            i === 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(52, 152, 219, 0.7)'
          ),
          borderColor: result.map((r, i) => 
            i === 0 ? 'rgba(46, 204, 113, 1)' : 'rgba(52, 152, 219, 1)'
          ),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          title: {
            display: true,
            text: 'Skor Preferensi'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Alternatif Wisata'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Skor: ${context.raw.toFixed(4)}`;
            }
          }
        }
      }
    }
  });
}