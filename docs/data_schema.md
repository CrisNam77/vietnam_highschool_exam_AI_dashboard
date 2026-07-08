# Data Schema

Schema dự kiến cho `data/processed/final_data.csv`. Danh sách này sẽ được xác nhận lại sau khi dữ liệu cuối cùng hoàn thiện.

| Column | Description |
|---|---|
| `sbd` | Số báo danh |
| `nam` | Năm dự thi |
| `ma_tinh` | Mã tỉnh/thành phố |
| `ten_tinh` | Tên tỉnh/thành phố |
| `vung_mien` | Vùng miền |
| `toan` | Điểm Toán |
| `van` | Điểm Ngữ văn |
| `ngoai_ngu` | Điểm Ngoại ngữ |
| `ly` | Điểm Vật lý |
| `hoa` | Điểm Hóa học |
| `sinh` | Điểm Sinh học |
| `su` | Điểm Lịch sử |
| `dia` | Điểm Địa lý |
| `gdcd` | Điểm Giáo dục công dân |
| `diem_tb` | Điểm trung bình |
| `so_mon` | Số môn có điểm |
| `A00` | Tổng điểm tổ hợp A00 |
| `A01` | Tổng điểm tổ hợp A01 |
| `B00` | Tổng điểm tổ hợp B00 |
| `C00` | Tổng điểm tổ hợp C00 |
| `D01` | Tổng điểm tổ hợp D01 |

Ghi chú: repo hiện có pipeline cũ dùng một số tên canonical khác như `ngu_van`, `vat_li`, `hoa_hoc`, `lich_su`, `dia_li`, `diem_khoi_a00`. Cần thống nhất tên cột trước khi triển khai dashboard thật.
