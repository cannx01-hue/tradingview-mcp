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

---

# Ve_QM_QB_OB_GAP — Quá mua / Quá bán + Gap + Order Block (Pine v6)

Vẽ 4 loại vùng trên cùng một biểu đồ:

> File: [`Ve_QM_QB_OB_GAP.pine`](./Ve_QM_QB_OB_GAP.pine)

## Tính năng

- **Quá mua / Quá bán (RSI)**: khi RSI vượt ngưỡng quá mua (mặc định 70) hoặc rơi dưới ngưỡng quá bán (30), đánh dấu **vùng giá** suốt giai đoạn đó bằng box viền chấm (đỏ = quá mua, xanh = quá bán).
- **Gap**: phát hiện khoảng trống giá giữa 2 nến (`low > high[1]` = gap tăng/hỗ trợ; `high < low[1]` = gap giảm/kháng cự). Box **kéo dài sang phải** đến khi giá lấp đầy gap (chạm mép xa) thì dừng lại và chuyển xám.
- **Order Block (OB)**: sau một **cú đẩy mạnh** (biên độ qua N nến ≥ ngưỡng %), lấy **nến đối nghịch gần nhất** làm OB — nến giảm cuối trước cú đẩy tăng = OB tăng (demand); nến tăng cuối trước cú đẩy giảm = OB giảm (supply). Box kéo dài sang phải đến khi giá quay lại **chạm mép gần** thì dừng.
- **Cảnh báo**: nền nhấp nháy + `alert()` + `alertcondition()` khi giá **lấp một gap** hoặc **chạm một OB**.

## Tham số (Inputs)

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|------|---------|----------|---------|
| Quá mua/bán (RSI) | Chu kỳ RSI | 14 | Độ dài RSI |
| | Ngưỡng quá mua / quá bán | 70 / 30 | Mức kích hoạt vùng |
| | Màu vùng quá mua / quá bán | đỏ / lime | Phân biệt loại |
| Gap | Kích thước gap tối thiểu (%) | 0.15 | Bỏ qua gap quá nhỏ |
| | Màu gap tăng / giảm | aqua / fuchsia | Hỗ trợ / kháng cự |
| Order Block | Số nến đo cú đẩy | 5 | Cửa sổ đo biên độ |
| | Biên độ cú đẩy tối thiểu (%) | 0.5 | Ngưỡng coi là "đẩy mạnh" |
| | Màu OB tăng / giảm | teal / maroon | Demand / supply |
| Hiển thị | Hiện nhãn loại vùng | true | Bật/tắt chữ trong box |
| | Độ mờ nền vùng | 82 | 0 = đặc, 100 = trong suốt |
| Cảnh báo | Bật cảnh báo | true | Lấp gap / chạm OB |

## Thiết lập Alert

1. **Create Alert** → ô **Condition** chọn **`Ve_QM_QB_OB_GAP`** → chọn **`Lấp gap hoặc chạm OB`**.
2. Tab **Notifications** → bật **Play sound** → **Create**.

> Mẹo chỉnh độ nhạy OB theo từng mã: tăng **Biên độ cú đẩy tối thiểu (%)** nếu có quá nhiều OB; giảm nếu quá ít. Mã biến động mạnh (crypto/futures) thường cần ngưỡng cao hơn cổ phiếu.

---

# CanNX TC V3 — Trend Confluence cải tiến (indicator + strategy)

Bản nâng cấp của `CanNX - mInvest Trend Confluence V2`, vào lệnh **hợp lưu đa khung** chất lượng cao hơn cho XAUUSD.

> File: [`CanNX_TC_V3.pine`](./CanNX_TC_V3.pine) (indicator/alert) · [`CanNX_TC_V3_Strategy.pine`](./CanNX_TC_V3_Strategy.pine) (backtest)

## Cải tiến so với V2

- **Thuận trend đa khung**: bắt buộc cùng chiều EMA khung **H4** (tùy chọn **Daily**) qua `request.security` (không repaint).
- **ADX có hướng**: ngoài độ lớn ADX còn yêu cầu **+DI/−DI thuận hướng** lệnh.
- **Lọc RSI động lượng**: tránh mua vùng quá mua / bán vùng quá bán.
- **Bắt buộc hồi về EMA nhanh** (mua đáy / bán đỉnh trong xu hướng) — đòn bẩy chất lượng lớn nhất.
- **Engulfing chặt** (thân hiện tại > thân trước).
- Tất cả bộ lọc **bật/tắt được**; kèm bản `strategy()` để đo win rate.

## Kết quả backtest (XAUUSD H1, ~2024–2026)

| Cấu hình | Win rate | Profit Factor | Max DD |
|----------|----------|---------------|--------|
| Như V2 (RR1.8, 2 chiều) | 33% | 0.76 | 2.18% |
| **Tối ưu (mặc định V3)**: chỉ Mua, RR 1.2, pullback 0.3 | **~50%** | **~1.1–1.18** | **~0.34%** |

Default đã đặt sẵn theo cấu hình tối ưu: `RR = 1.2`, `pullback = 0.3×ATR`, **hướng = Chỉ Mua**.

> ⚠️ **Lưu ý quan trọng**: kết quả tối ưu trên giai đoạn **vàng tăng giá mạnh** nên *long-only* là tốt nhất — đây là **phụ thuộc thị trường (regime)**, không phải quy luật vĩnh viễn. Nếu vàng chuyển sang giảm/sideways, hãy đổi **Hướng giao dịch** sang "Cả hai" hoặc "Chỉ Bán" và backtest lại. Backtest không bảo đảm kết quả tương lai; luôn quản lý vốn.

### Sweep mở rộng (thoát lệnh, khung, 2 chiều)

- **Thoát lệnh thông minh** (đã thêm vào strategy, bật/tắt được):
  - **Breakeven** (dời SL về hoà vốn khi lời ≥ 1R): hơi tăng PF (1.08→1.10) và giảm rủi ro → **bật mặc định**.
  - **Trailing ATR**: *hại* khi TP gần (PF rớt < 1 vì bị cắt sớm) — chỉ hợp khi để TP xa / thả winner chạy, nhưng khi đó win rate tụt còn ~43%.
- **Khung thời gian** (long-only, RR1.2): M30 cho PF cao nhất (~1.16, 101 lệnh), H1 cho win rate cao nhất (~53%, 120 lệnh); M15 mẫu quá nhỏ; H4 ~ tương đương.
- **2 chiều + lọc regime Daily**: lệnh Bán vẫn kéo PF < 1 (0.85) trong giai đoạn vàng tăng → giữ long-only cho tới khi thị trường thực sự chuyển bearish.
- **Ranh giới win/lãi**: RR 1.0 cho win cao nhất (~54.5%) nhưng PF < 1 (lỗ); **RR 1.2 là mức win cao nhất mà vẫn có lãi**.

**Cấu hình khuyến nghị (mặc định):** H1 · long-only · RR 1.2 · pullback 0.3×ATR · breakeven ON → **win ~52–53%, PF ~1.1, max DD ~0.4%**.
