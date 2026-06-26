# Data Quality Report — Điểm thi THPT Việt Nam

## 1. Nguồn dữ liệu & độ phủ

| # | File gốc | Định dạng | Năm | Chương trình | Số dòng thô |
|---|----------|-----------|-----|--------------|-------------|
| 1 | `diem_thi_thpt_2022.csv` | CSV | 2022 | 2006 | 995,441 |
| 2 | `diem_thi_thpt_2023.csv` | CSV | 2023 | 2006 | 1,022,060 |
| 3 | `diem_thi_thpt_2024.csv` | CSV | 2024 | 2006 | 1,061,605 |
| 4 | `20250715-ketquathi-ct2006.xlsx` (Sheet1) | XLSX | 2025 | 2006 | 22,090 |
| 5 | `20250715-ketquathi-ct2018a.xlsx` (Sheet1) | XLSX | 2025 | 2018 | 1,000,000 |
| 6 | `20250715-ketquathi-ct2018a_2.xlsx` (Sheet2) | XLSX | 2025 | 2018 | 131,136 |


## 2. Khóa & đơn vị dòng (grain)

- **Đơn vị dòng:** 1 dòng = 1 thí sinh trong 1 kỳ thi.
- **Khóa duy nhất:** `(nam, chuong_trinh, sbd)`.
- **0 bản ghi trùng khóa** (đã kiểm tra, không loại).

## 3. Data Dictionary

### 3.1. Cột định danh & metadata

| Cột | Kiểu logic | Ý nghĩa | Giá trị / khoảng |
|-----|-----------|---------|------------------|
| `nam` | số nguyên | Năm dự thi | 2022, 2023, 2024, 2025 |
| `chuong_trinh` | danh mục (chuỗi) | Chương trình GDPT của đề thi | `"2006"`, `"2018"` |
| `sbd` | chuỗi, 8 ký tự | Số báo danh, **giữ số 0 đầu** | `"00000000"`–`"99999999"` (8 chữ số) |
| `ma_tinh` | chuỗi, 2 ký tự | Mã hội đồng thi = `sbd[:2]` = **nơi dự thi** | `"01"`–`"64"` (không có `"20"`) |
| `ten_tinh` | danh mục | Tên tỉnh/thành theo `ma_tinh` | xem §4.3 |
| `vung_mien` | danh mục | Vùng kinh tế–xã hội (6 vùng) | xem §4.4 |
| `vung_3` | danh mục | Miền (gộp từ 6 vùng) | `Bắc`, `Trung`, `Nam` |
| `ma_ngoai_ngu` | danh mục | Mã thứ tiếng của môn Ngoại ngữ | `N1`–`N7`, hoặc `"NA"` (không thi NN) |

### 3.2. Cột điểm môn (13 cột)

Kiểu: **số thực**, lưu 2 chữ số thập phân, khoảng hợp lệ **[0, 10]**. **Ô trống (NaN) = thí sinh KHÔNG thi môn đó** (không phải 0 điểm).

| Cột | Môn | Có ở chương trình |
|-----|-----|-------------------|
| `toan` | Toán | 2006 + 2018 |
| `ngu_van` | Ngữ văn | 2006 + 2018 |
| `ngoai_ngu` | Ngoại ngữ (thứ tiếng theo `ma_ngoai_ngu`) | 2006 + 2018 |
| `vat_li` | Vật lí | 2006 + 2018 |
| `hoa_hoc` | Hóa học | 2006 + 2018 |
| `sinh_hoc` | Sinh học | 2006 + 2018 |
| `lich_su` | Lịch sử | 2006 + 2018 |
| `dia_li` | Địa lí | 2006 + 2018 |
| `gdcd` | Giáo dục công dân | **chỉ 2006** |
| `tin_hoc` | Tin học | **chỉ 2018** |
| `cong_nghe_cn` | Công nghệ công nghiệp | **chỉ 2018** |
| `cong_nghe_nn` | Công nghệ nông nghiệp | **chỉ 2018** |
| `gd_ktpl` | Giáo dục kinh tế và pháp luật | **chỉ 2018** |

> Cột môn không thuộc chương trình của dòng đó luôn = NaN (ví dụ `gdcd` ở mọi dòng 2018, `tin_hoc` ở mọi dòng 2006).

### 3.3. Biến dẫn xuất

| Cột | Kiểu | Ý nghĩa | Công thức |
|-----|------|---------|-----------|
| `so_mon` | số nguyên | Số môn có điểm | đếm số ô không NaN trong 13 cột điểm (≥ 1) |
| `ban` | danh mục | Ban dự thi (chỉ CT2006) | `KHTN` / `KHXH` / `Khác`; NaN với CT2018 (xem §5.6) |
| `diem_khoi_a00` | số thực | Tổng khối A00 | `toan + vat_li + hoa_hoc` |
| `diem_khoi_a01` | số thực | Tổng khối A01 | `toan + vat_li + ngoai_ngu*` |
| `diem_khoi_b00` | số thực | Tổng khối B00 | `toan + hoa_hoc + sinh_hoc` |
| `diem_khoi_c00` | số thực | Tổng khối C00 | `ngu_van + lich_su + dia_li` |
| `diem_khoi_d01` | số thực | Tổng khối D01 | `toan + ngu_van + ngoai_ngu*` |

`ngoai_ngu*` = điểm Ngoại ngữ **chỉ khi là tiếng Anh** (xem §5.7). Mọi cột khối = **NaN nếu thiếu bất kỳ môn thành phần** nào.


## 4. Giá trị danh mục đóng băng

### 4.1. `nam`
`2022`, `2023`, `2024`, `2025`.

### 4.2. `chuong_trinh`
- `"2006"` — chương trình GDPT 2006 (đề cũ): 2022, 2023, 2024, và nhóm thí sinh thi đề cũ năm 2025 (`ct2006`).
- `"2018"` — chương trình GDPT 2018 (đề mới): nhóm `ct2018a` năm 2025.

### 4.3. `ma_ngoai_ngu`
| Mã | Thứ tiếng |
|----|-----------|
| `N1` | Tiếng Anh |
| `N2` | Tiếng Nga |
| `N3` | Tiếng Pháp |
| `N4` | Tiếng Trung Quốc |
| `N5` | Tiếng Đức |
| `N6` | Tiếng Nhật |
| `N7` | Tiếng Hàn |
| `NA` | Không thi môn Ngoại ngữ |

> Ánh xạ `N4`–`N7` nên đối chiếu lại với quy ước chính thức của Bộ GD&ĐT trước khi công bố. `ma_ngoai_ngu` thiếu được ghi là **chuỗi `"NA"`** (không để trống); khi đọc lại bằng `pd.read_csv` mặc định, `"NA"` sẽ tự thành NaN — muốn giữ nguyên chuỗi thì đọc với `keep_default_na=False`. **Năm 2022 không có cột mã ngoại ngữ trong dữ liệu gốc** → toàn bộ dòng 2022 có `ma_ngoai_ngu = "NA"`.

### 4.4. `ten_tinh` & `vung_mien` (63 mã, KHÔNG có mã `20`)

Mã `ma_tinh` = mã **hội đồng thi truyền thống (trước sáp nhập tỉnh 2025)**. Bảng theo 6 vùng kinh tế–xã hội:

**Trung du và miền núi phía Bắc** — `vung_3 = Bắc`
05 Hà Giang · 06 Cao Bằng · 07 Lai Châu · 08 Lào Cai · 09 Tuyên Quang · 10 Lạng Sơn · 11 Bắc Kạn · 12 Thái Nguyên · 13 Yên Bái · 14 Sơn La · 15 Phú Thọ · 18 Bắc Giang · 23 Hòa Bình · 62 Điện Biên

**Đồng bằng sông Hồng** — `vung_3 = Bắc`
01 Hà Nội · 03 Hải Phòng · 16 Vĩnh Phúc · 17 Quảng Ninh · 19 Bắc Ninh · 21 Hải Dương · 22 Hưng Yên · 24 Hà Nam · 25 Nam Định · 26 Thái Bình · 27 Ninh Bình

**Bắc Trung Bộ và Duyên hải miền Trung** — `vung_3 = Trung`
04 Đà Nẵng · 28 Thanh Hóa · 29 Nghệ An · 30 Hà Tĩnh · 31 Quảng Bình · 32 Quảng Trị · 33 Thừa Thiên - Huế · 34 Quảng Nam · 35 Quảng Ngãi · 37 Bình Định · 39 Phú Yên · 41 Khánh Hòa · 45 Ninh Thuận · 47 Bình Thuận

**Tây Nguyên** — `vung_3 = Trung`
36 Kon Tum · 38 Gia Lai · 40 Đắk Lắk · 42 Lâm Đồng · 63 Đăk Nông

**Đông Nam Bộ** — `vung_3 = Nam`
02 TP. Hồ Chí Minh · 43 Bình Phước · 44 Bình Dương · 46 Tây Ninh · 48 Đồng Nai · 52 Bà Rịa – Vũng Tàu

**Đồng bằng sông Cửu Long** — `vung_3 = Nam`
49 Long An · 50 Đồng Tháp · 51 An Giang · 53 Tiền Giang · 54 Kiên Giang · 55 Cần Thơ · 56 Bến Tre · 57 Vĩnh Long · 58 Trà Vinh · 59 Sóc Trăng · 60 Bạc Liêu · 61 Cà Mau · 64 Hậu Giang

### 4.5. `vung_3`
`Bắc` = (Trung du & MN phía Bắc) + (ĐB sông Hồng); `Trung` = (Bắc Trung Bộ & DH miền Trung) + (Tây Nguyên); `Nam` = (Đông Nam Bộ) + (ĐB sông Cửu Long).

### 4.6. `ban`
`KHTN`, `KHXH`, `Khác` (chỉ CT2006); NaN với CT2018.


## 5. Quy tắc xử lý dữ liệu (đóng băng)

1. **Đổi tên cột về chuẩn (canonical).** 3 file CSV vốn đã đúng tên chuẩn; 3 file XLSX đổi tên theo bảng RENAME trong `clean_data.py`. Cột `STT` của file XLSX bị bỏ.
2. **SBD:** ép chuỗi, bỏ đuôi `.0` nếu có, giữ chỉ chữ số, `zfill(8)` (khôi phục số 0 đầu nếu Excel lỡ lưu dạng số). Dòng có SBD ≠ 8 chữ số bị loại + đếm.
3. **`ma_tinh` = `sbd[:2]`**; map sang `ten_tinh`, `vung_mien`, `vung_3` bằng từ điển cứng 63 tỉnh. Mã tỉnh không có trong danh mục (gồm `"20"`) → loại + đếm.
4. **Điểm:** ép số thực; ô trống → NaN. **0 và 10 là giá trị HỢP LỆ** (0 = điểm liệt thật). Giá trị ngoài `[0, 10]` → NaN + đếm.
   - **Không** làm tròn theo bước 0.25 (CT2018 có điểm như 7.35, 6.35).
   - **Không** cắt outlier bằng IQR.
   - **NaN không bao giờ được thay bằng 0.** Mọi thống kê trung bình môn phải tính trên tập thí sinh **có dự thi** môn đó.
5. **`ma_ngoai_ngu`:** chuẩn hóa hoa, khoảng trắng; rỗng → `"NA"`.
6. **`ban`** (chỉ CT2006): so số môn có điểm giữa nhóm KHTN `{vat_li, hoa_hoc, sinh_hoc}` và KHXH `{lich_su, dia_li, gdcd}`. Bên nào nhiều hơn → ban đó; bằng nhau và > 0 → `Khác`; cả hai = 0 → NaN. CT2018 → NaN (đề mới phá vỡ nhị phân KHTN/KHXH).
7. **Điểm khối:** chỉ tính khi đủ cả 3 môn thành phần (phép cộng để NaN tự lan). Khối A01/D01 dùng điểm Ngoại ngữ **chỉ khi là tiếng Anh** (`ma_ngoai_ngu == "N1"`). **Ngoại lệ năm 2022:** do gốc thiếu mã ngoại ngữ, coi toàn bộ điểm Ngoại ngữ 2022 là tiếng Anh (giả định có chủ đích, ghi nhận tại đây).
8. **Loại dòng `so_mon == 0`** (đăng ký nhưng trống toàn bộ điểm) + đếm.
9. **Không khử trùng** trên khóa `(nam, chuong_trinh, sbd)` — chỉ đếm và báo cáo.
10. **Xuất:** `final_data.csv` (wide), số thực ghi 2 chữ số thập phân, NaN → ô trống.

## 6. Thống kê chất lượng (lần chạy freeze)

**Tổng quan:** 4,232,332 dòng thô → **4,227,695 dòng** đầu ra (loại 4,637).

| Hạng mục | Số dòng/ô |
|----------|-----------|
| SBD lỗi (≠ 8 chữ số) | 0 |
| Mã tỉnh lạ (ngoài danh mục) | 0 |
| `so_mon == 0` (đã loại) | 4,637 |
| Ô điểm ngoài [0,10] → NaN | 0 |
| Bản ghi trùng khóa (chỉ đếm) | 0 |

**Phân bố sau xử lý:**

| Năm | Chương trình | Số dòng | Loại do `so_mon==0` |
|-----|--------------|---------|---------------------|
| 2022 | 2006 | 995,435 | 6 |
| 2023 | 2006 | 1,017,584 | 4,476 |
| 2024 | 2006 | 1,061,604 | 1 |
| 2025 | 2006 | 22,088 | 2 |
| 2025 | 2018 | 1,130,984 | 152 |
| **Tổng** | | **4,227,695** | **4,637** |

> Dữ liệu sạch bất thường theo hướng tốt: 0 SBD lỗi, 0 mã tỉnh lạ, 0 điểm ngoài khoảng. Năm 2023 có nhiều dòng `so_mon==0` hơn hẳn (4,476) — nhiều khả năng là thí sinh đăng ký nhưng vắng toàn bộ; cần nhắc trong báo cáo nhưng không phải lỗi dữ liệu.


## 7. Cảnh báo & giới hạn diễn giải

1. **2025 (CT2018) là năm bản lề, KHÔNG cùng thước đo với 2022–2024.** Đề khác, cấu trúc môn khác (bỏ GDCD; thêm Tin học, Công nghệ, GD kinh tế & pháp luật; ngoại ngữ tự chọn). **Không nối thẳng đường "xu hướng điểm trung bình môn" từ 2024 sang 2025.** Nên giới hạn so sánh xu hướng trong 2022–2024 và phân tích 2025 riêng.
2. **`ma_tinh` là NƠI DỰ THI (hội đồng thi), không chắc là nơi thường trú/học.** Mọi kết luận "chênh lệch vùng miền" phải phát biểu là *theo địa điểm dự thi*.
3. **Mã tỉnh là hệ trước sáp nhập tỉnh 2025** (63 hội đồng, không có mã 20). Không khớp với danh sách 34 tỉnh sau sáp nhập — giữ nguyên hệ cũ để nhất quán xuyên suốt 4 năm.
4. **Cột Ngoại ngữ trộn nhiều thứ tiếng** (N1–N7). Khi so sánh tỉnh/vùng theo môn Ngoại ngữ nên lọc về tiếng Anh (`ma_ngoai_ngu == "N1"`), nếu không sẽ so nhầm.
5. **Năm 2022 thiếu mã ngoại ngữ** → khối A01/D01 năm 2022 dựa trên giả định "toàn bộ là tiếng Anh" (§5.7). Khi đọc khối của riêng 2022 cần nhớ giả định này.
6. **Tỉ lệ thiếu cao ở nhiều cột là BÌNH THƯỜNG, do cơ chế chọn môn** (ví dụ phần lớn thí sinh không thi Sinh học → `sinh_hoc` thiếu ~90%). Thiếu ≠ chất lượng kém; thiếu = không chọn môn.
7. **Giới hạn nội tại của dữ liệu:** chỉ có điểm + SBD. **Không có** giới tính, trường, dân tộc, học lực, hoàn cảnh KT-XH. Mọi câu hỏi về "bất bình đẳng giáo dục" chỉ dừng ở mức **tương quan địa lý thô**, không suy ra nguyên nhân.
