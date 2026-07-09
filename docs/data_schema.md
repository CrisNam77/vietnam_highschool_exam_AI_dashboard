# Data Schema

Schema chính thức cho `data/processed/final_data.csv` dựa trên `src/clean_data.py` và `reports/data_quality_report.md`.

Không dùng alias cũ như `van`, `ly`, `hoa`, `su`, `dia`, `A00` trong docs chính. Nếu UI cần tên thân thiện, phải mapping rõ từ alias sang cột canonical.

## Metadata Columns

| Column | Description |
|---|---|
| `nam` | Năm dự thi: từ 2022 đến 2026 |
| `chuong_trinh` | Chương trình giáo dục: `2006` hoặc `2018` |
| `sbd` | Số báo danh, chuỗi 8 ký tự |
| `ma_tinh` | Mã tỉnh/thành phố, lấy từ hai chữ số đầu của `sbd` |
| `ten_tinh` | Tên tỉnh/thành phố |
| `vung_mien` | Vùng kinh tế xã hội, gồm 6 vùng |
| `vung_3` | Miền địa lý rút gọn: Bắc, Trung, Nam |
| `ma_ngoai_ngu` | Mã môn ngoại ngữ: `N1` đến `N7`, hoặc `NA` nếu không thi ngoại ngữ |

## Subject Score Columns

Các cột điểm môn có giá trị từ 0 đến 10. Giá trị thiếu nghĩa là thí sinh không dự thi môn đó, không phải điểm 0.

| Column | Subject | Applies To |
|---|---|---|
| `toan` | Toán | 2006 và 2018 |
| `ngu_van` | Ngữ văn | 2006 và 2018 |
| `ngoai_ngu` | Ngoại ngữ | 2006 và 2018 |
| `vat_li` | Vật lí | 2006 và 2018 |
| `hoa_hoc` | Hóa học | 2006 và 2018 |
| `sinh_hoc` | Sinh học | 2006 và 2018 |
| `lich_su` | Lịch sử | 2006 và 2018 |
| `dia_li` | Địa lí | 2006 và 2018 |
| `gdcd` | Giáo dục công dân | Chỉ chương trình 2006 |
| `tin_hoc` | Tin học | Chỉ chương trình 2018 |
| `cong_nghe_cn` | Công nghệ công nghiệp | Chỉ chương trình 2018 |
| `cong_nghe_nn` | Công nghệ nông nghiệp | Chỉ chương trình 2018 |
| `gd_ktpl` | Giáo dục kinh tế và pháp luật | Chỉ chương trình 2018 |

## Derived Columns

| Column | Description |
|---|---|
| `so_mon` | Số môn thí sinh có điểm |
| `ban` | Ban dự thi cho chương trình 2006: `KHTN`, `KHXH`, `Khác`; rỗng với chương trình 2018 |
| `diem_anh` | Điểm tiếng Anh dùng cho các tổ hợp có ngoại ngữ tiếng Anh |
| `diem_khoi_a00` | Tổng điểm A00 = Toán + Vật lí + Hóa học |
| `diem_khoi_a01` | Tổng điểm A01 = Toán + Vật lí + Tiếng Anh |
| `diem_khoi_b00` | Tổng điểm B00 = Toán + Hóa học + Sinh học |
| `diem_khoi_c00` | Tổng điểm C00 = Ngữ văn + Lịch sử + Địa lí |
| `diem_khoi_d01` | Tổng điểm D01 = Toán + Ngữ văn + Tiếng Anh |

## Missing Score Principles

- Không xóa toàn bộ dòng chỉ vì thiếu điểm một vài môn.
- Thí sinh chỉ thi một số môn theo chương trình/tổ hợp.
- Khi tính trung bình môn, chỉ tính trên thí sinh có điểm hợp lệ của môn đó.
- Khi tính tổ hợp, chỉ tính khi đủ các môn thành phần.
- Giá trị thiếu không được thay bằng 0 trong phân tích điểm.

## Canonical Name Mapping

Nếu cần hiển thị alias thân thiện trong UI hoặc prompt, dùng mapping rõ ràng:

| Friendly Alias | Canonical Column |
|---|---|
| Văn | `ngu_van` |
| Lý / Vật lý | `vat_li` |
| Hóa | `hoa_hoc` |
| Sử | `lich_su` |
| Địa | `dia_li` |
| A00 | `diem_khoi_a00` |
| A01 | `diem_khoi_a01` |
| B00 | `diem_khoi_b00` |
| C00 | `diem_khoi_c00` |
| D01 | `diem_khoi_d01` |
