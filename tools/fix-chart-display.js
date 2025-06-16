// Công cụ tạo trang hiển thị biểu đồ doanh số
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  try {
    // Kết nối với database
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'InternLOL123.',
      database: process.env.DB_NAME || 'pizzazzpizza',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Lấy dữ liệu biểu đồ từ DB
    console.log('Đang lấy dữ liệu biểu đồ...');
    const [rows] = await pool.query('SELECT * FROM sales_dashboard_comparisons ORDER BY record_date DESC LIMIT 1');
    
    if (!rows || rows.length === 0) {
      console.error('Không tìm thấy dữ liệu biểu đồ!');
      await pool.end();
      return;
    }

    // Xử lý dữ liệu biểu đồ
    const data = rows[0];

    // Tạo HTML có biểu đồ
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Biểu đồ Doanh số</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .chart-container { height: 400px; margin-bottom: 30px; }
        h1 { color: #333; }
        .chart-card { 
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        .chart-card h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Biểu đồ Doanh số</h1>
        <p>Dữ liệu từ ngày: ${new Date(data.record_date).toLocaleDateString('vi-VN')}</p>

        <div class="chart-card">
            <h2>Monthly Sales Trend Comparison</h2>
            <div class="chart-container">
                <canvas id="monthlySalesChart"></canvas>
            </div>
        </div>

        <div class="chart-card">
            <h2>Weekly Sales Performance (Current Week)</h2>
            <div class="chart-container">
                <canvas id="weeklySalesChart"></canvas>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        // Dữ liệu biểu đồ
        const monthlyCurrentData = ${JSON.stringify(data.chart_monthly_current_mtd_daily_sales_json)};
        const monthlyPreviousData = ${JSON.stringify(data.chart_monthly_previous_full_daily_sales_json)};
        const weeklyCurrentData = ${JSON.stringify(data.chart_weekly_current_week_daily_sales_json)};
        const weeklyPreviousData = ${JSON.stringify(data.chart_weekly_prev_month_sameday_week_daily_sales_json)};

        // Hàm tạo biểu đồ
        document.addEventListener('DOMContentLoaded', function() {
            // Biểu đồ tháng
            const monthlyCtx = document.getElementById('monthlySalesChart').getContext('2d');
            
            // Xử lý dữ liệu tháng
            const dayLabels = Array.from({length: 31}, (_, i) => (i + 1).toString());
            
            const processMonthlyData = (data) => {
                const result = Array(31).fill(0);
                if (data && Array.isArray(data)) {
                    data.forEach(item => {
                        if (item && item.date) {
                            const day = new Date(item.date).getDate();
                            if (day >= 1 && day <= 31) {
                                result[day-1] = Number(item.sales);
                            }
                        }
                    });
                }
                return result;
            };
            
            const currentMonthData = processMonthlyData(monthlyCurrentData);
            const previousMonthData = processMonthlyData(monthlyPreviousData);
            
            new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: dayLabels,
                    datasets: [
                        {
                            label: 'Current Month',
                            data: currentMonthData,
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Previous Month',
                            data: previousMonthData,
                            borderColor: '#6c757d',
                            backgroundColor: 'rgba(108, 117, 125, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            
            // Biểu đồ tuần
            const weeklyCtx = document.getElementById('weeklySalesChart').getContext('2d');
            
            // Xử lý dữ liệu tuần
            const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            
            const processWeeklyData = (data) => {
                const result = Array(7).fill(0);
                if (data && Array.isArray(data)) {
                    data.forEach(item => {
                        if (item && item.dayOfWeek) {
                            const index = weekDays.indexOf(item.dayOfWeek);
                            if (index !== -1) {
                                result[index] = Number(item.sales);
                            }
                        }
                    });
                }
                return result;
            };
            
            const currentWeekData = processWeeklyData(weeklyCurrentData);
            const previousWeekData = processWeeklyData(weeklyPreviousData);
            
            new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: weekDays,
                    datasets: [
                        {
                            label: 'Current Week',
                            data: currentWeekData,
                            backgroundColor: '#28a745',
                            borderColor: '#1e7e34',
                            borderWidth: 1
                        },
                        {
                            label: 'Previous Week',
                            data: previousWeekData,
                            backgroundColor: '#ffc107',
                            borderColor: '#d39e00',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        });
    </script>
</body>
</html>`;

    // Kiểm tra tồn tại thư mục public
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Kiểm tra và tạo thư mục charts nếu chưa tồn tại
    const chartsDir = path.join(publicDir, 'charts');
    if (!fs.existsSync(chartsDir)) {
      fs.mkdirSync(chartsDir, { recursive: true });
    }

    // Lưu tệp HTML
    const filePath = path.join(chartsDir, 'index.html');
    fs.writeFileSync(filePath, html);

    console.log(`Đã tạo trang biểu đồ thành công tại ${filePath}`);
    console.log('Bạn có thể xem biểu đồ tại: http://localhost:3000/charts/index.html');

    await pool.end();
    
  } catch (error) {
    console.error('Lỗi khi tạo trang biểu đồ:', error);
  }
}

main(); 