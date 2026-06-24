# Ve_HT_KC — Indicator Hỗ trợ / Kháng cự tự động (Pine v6)

Tự động phát hiện và vẽ các **vùng hỗ trợ (HT) / kháng cự (KC)** trên TradingView, đa khung thời gian, kèm nhãn giá và **cảnh báo beep + nhấp nháy** khi giá sắp chạm vùng.

> File: [`Ve_HT_KC.pine`](./Ve_HT_KC.pine)

## Tính năng

- **Phát hiện tự động**: tìm các điểm pivot (đỉnh/đáy), gộp các mức gần nhau thành "cụm" và đo độ mạnh bằng **số lần chạm**.
- **Đa khung (MTF)**: vẽ vùng của khung hiện tại **và** khung lớn hơn (mặc định H4) qua `request.security`.
- **Lọc thông minh**: chỉ giữ **N vùng mạnh nhất & gần giá nhất** mỗi phía (theo điểm = số chạm + độ gần giá), trong phạm vi ±% quanh giá → tránh rối chart.
- **Phân cấp hiển thị**: vùng càng nhiều lần chạm → màu càng đậm, viền dày, có ⭐.
- **Nhãn giá**: mỗi vùng có nhãn `KC H1 4211.52–4228.01 (17 chạm) ⭐` neo ở mép trái (luôn đọc được đủ giá + số chạm).
- **Cảnh báo**: khi giá vào trong khoảng đặt trước (mặc định 5 giá) của một vùng → **nền nhấp nháy + nhãn ⚠ chớp tắt**, và phát `alert()` để TradingView kêu beep.

## Cài đặt

1. Mở **Pine Editor** trong TradingView.
2. Xoá nội dung mẫu, dán toàn bộ nội dung [`Ve_HT_KC.pine`](./Ve_HT_KC.pine).
3. Bấm **Save**, rồi **Add to chart**.

## Tham số (Inputs)

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|------|---------|----------|---------|
| Phát hiện pivot | Số nến trái / phải | 5 / 5 | Độ rộng cửa sổ xác định pivot |
| | Số lần chạm tối thiểu | 3 | Bỏ qua các mức yếu |
| Vùng | Bề rộng vùng tối thiểu (%) | 0.10 | Bề dày tối thiểu của box |
| | Gộp cụm khi cách dưới (%) | 0.25 | Ngưỡng gộp các mức gần nhau |
| | Chỉ vẽ vùng trong ±% giá | 6.0 | Tập trung quanh giá hiện tại |
| | Số vùng tối đa mỗi phía | 3 | Giới hạn mật độ mỗi khung |
| Đa khung (MTF) | Bật vùng khung H4 | true | Vẽ thêm vùng khung lớn |
| | Khung lớn | 240 (H4) | Khung MTF |
| Hiển thị | Màu KC/HT (TF & H4) | cam/teal, đỏ/xanh | Phân biệt loại & khung |
| | Ngưỡng 'mạnh' | 5 | Số chạm để tô đậm + ⭐ |
| | Hiện nhãn giá | true | Bật/tắt nhãn |
| | Đẩy nhãn vào từ mép trái | 3 | Vị trí ngang của nhãn |
| Cảnh báo | Bật cảnh báo + nhấp nháy | true | Bật toàn bộ tính năng cảnh báo |
| | Báo khi giá cách vùng | 5.0 | Khoảng cách (theo giá) để kích hoạt |
| | Màu nhấp nháy | vàng | Màu nền/nhãn cảnh báo |

## Thiết lập Alert (tiếng beep)

Phần **nhấp nháy** chạy tự động. Để có thêm **beep + popup**:

1. **Create Alert** (bảng Alerts ⏰ hoặc nút Alert).
2. Ô **Condition** bên trái → chọn **`Ve_HT_KC`** → ô bên phải chọn **`Giá gần vùng HT/KC`**.
3. Tab **Notifications** → bật **Play sound** (chọn beep) → **Create**.

> Mẹo: chọn tần suất **"Once Per Bar Close"** nếu không muốn báo quá thường xuyên khi giá đi ngang sát vùng.

## Ghi chú

- Indicator chỉ dùng dữ liệu của TradingView Desktop đang chạy trên máy bạn; không gửi dữ liệu ra ngoài.
- Vùng được neo theo giá + thời gian nên hiển thị nhất quán trên mọi khung.
