# Báo cáo chất lượng dữ liệu: Điểm thi tốt nghiệp THPT 2022–2025

## 1. Nguồn dữ liệu và phạm vi

Bộ dữ liệu phục vụ phân tích được tổng hợp từ sáu tệp gốc, trải dài bốn kỳ thi tốt nghiệp THPT từ năm 2022 đến năm 2025. Ba năm 2022, 2023 và 2024 được cung cấp dưới dạng tệp CSV, trong khi dữ liệu năm 2025 nằm ở hai tệp Excel tương ứng với hai chương trình giáo dục khác nhau. Riêng nhóm thí sinh chương trình 2018 năm 2025 bị công cụ xuất dữ liệu chia thành hai trang tính, do đó được hợp nhất trở lại trong quá trình xử lý.

| # | Tệp gốc | Định dạng | Năm | Chương trình | Số dòng thô |
|---|---------|-----------|-----|--------------|-------------|
| 1 | `diem_thi_thpt_2022.csv` | CSV | 2022 | 2006 | 995.441 |
| 2 | `diem_thi_thpt_2023.csv` | CSV | 2023 | 2006 | 1.022.060 |
| 3 | `diem_thi_thpt_2024.csv` | CSV | 2024 | 2006 | 1.061.605 |
| 4 | `20250715-ketquathi-ct2006.xlsx` (Sheet1) | XLSX | 2025 | 2006 | 22.090 |
| 5 | `20250715-ketquathi-ct2018a.xlsx` (Sheet1) | XLSX | 2025 | 2018 | 1.000.000 |
| 6 | `20250715-ketquathi-ct2018a_2.xlsx` (Sheet2) | XLSX | 2025 | 2018 | 131.136 |

## 2. Đơn vị phân tích và khóa định danh

Mỗi dòng trong dữ liệu tương ứng với một thí sinh trong một kỳ thi. Khóa định danh duy nhất là tổ hợp ba trường `nam`, `chuong_trinh` và `sbd`. Việc đưa thêm `chuong_trinh` vào khóa là cần thiết, bởi số báo danh có thể được dùng lại giữa các năm cũng như giữa hai chương trình của năm 2025. Sau khi xử lý, dữ liệu không tồn tại bản ghi nào trùng khóa.

## 3. Từ điển dữ liệu

Tệp kết quả `final_data.csv` được tổ chức theo định dạng wide, mỗi thí sinh một dòng. Các trường được mô tả chi tiết dưới đây.

### 3.1. Nhóm trường định danh và metadata

| Trường | Kiểu | Ý nghĩa | Miền giá trị |
|--------|------|---------|--------------|
| `nam` | số nguyên | Năm dự thi | 2022, 2023, 2024, 2025 |
| `chuong_trinh` | danh mục | Chương trình giáo dục của đề thi | `2006`, `2018` |
| `sbd` | chuỗi 8 ký tự | Số báo danh, giữ nguyên số 0 ở đầu | tám chữ số |
| `ma_tinh` | chuỗi 2 ký tự | Mã hội đồng thi, lấy từ hai chữ số đầu của số báo danh | `01` đến `64`, không có `20` |
| `ten_tinh` | danh mục | Tên tỉnh hoặc thành phố, suy ra từ mã tỉnh | xem mục 4.3 |
| `vung_mien` | danh mục | Vùng kinh tế xã hội (sáu vùng) | xem mục 4.3 |
| `vung_3` | danh mục | Miền địa lý, gộp từ sáu vùng | Bắc, Trung, Nam |
| `ma_ngoai_ngu` | danh mục | Mã thứ tiếng của môn Ngoại ngữ | `N1` đến `N7`, hoặc `NA` |

### 3.2. Nhóm trường điểm môn

Mười ba trường điểm đều có kiểu số thực, lưu hai chữ số thập phân, với khoảng giá trị hợp lệ từ 0 đến 10. Một quy ước quan trọng cần ghi nhớ khi sử dụng dữ liệu là giá trị rỗng (NaN) mang ý nghĩa thí sinh không dự thi môn đó, hoàn toàn khác với điểm 0.

| Trường | Môn | Chương trình |
|--------|-----|--------------|
| `toan` | Toán | 2006 và 2018 |
| `ngu_van` | Ngữ văn | 2006 và 2018 |
| `ngoai_ngu` | Ngoại ngữ | 2006 và 2018 |
| `vat_li` | Vật lí | 2006 và 2018 |
| `hoa_hoc` | Hóa học | 2006 và 2018 |
| `sinh_hoc` | Sinh học | 2006 và 2018 |
| `lich_su` | Lịch sử | 2006 và 2018 |
| `dia_li` | Địa lí | 2006 và 2018 |
| `gdcd` | Giáo dục công dân | chỉ 2006 |
| `tin_hoc` | Tin học | chỉ 2018 |
| `cong_nghe_cn` | Công nghệ công nghiệp | chỉ 2018 |
| `cong_nghe_nn` | Công nghệ nông nghiệp | chỉ 2018 |
| `gd_ktpl` | Giáo dục kinh tế và pháp luật | chỉ 2018 |

Những môn không thuộc chương trình của dòng dữ liệu sẽ luôn có giá trị rỗng. Chẳng hạn, mọi thí sinh chương trình 2018 đều rỗng ở trường `gdcd`, và mọi thí sinh chương trình 2006 đều rỗng ở các trường môn mới như `tin_hoc`.

### 3.3. Nhóm trường dẫn xuất

| Trường | Kiểu | Ý nghĩa | Cách tính |
|--------|------|---------|-----------|
| `so_mon` | số nguyên | Số môn thí sinh có điểm | đếm số trường điểm không rỗng |
| `ban` | danh mục | Ban dự thi, chỉ áp dụng cho chương trình 2006 | KHTN, KHXH hoặc Khác; rỗng với chương trình 2018 |
| `diem_khoi_a00` | số thực | Tổng điểm khối A00 | Toán + Vật lí + Hóa học |
| `diem_khoi_a01` | số thực | Tổng điểm khối A01 | Toán + Vật lí + Ngoại ngữ (tiếng Anh) |
| `diem_khoi_b00` | số thực | Tổng điểm khối B00 | Toán + Hóa học + Sinh học |
| `diem_khoi_c00` | số thực | Tổng điểm khối C00 | Ngữ văn + Lịch sử + Địa lí |
| `diem_khoi_d01` | số thực | Tổng điểm khối D01 | Toán + Ngữ văn + Ngoại ngữ (tiếng Anh) |

Mỗi trường điểm khối chỉ có giá trị khi thí sinh dự thi đủ ba môn thành phần; nếu thiếu bất kỳ môn nào, giá trị khối sẽ là rỗng. Hai khối A01 và D01 chỉ tính điểm Ngoại ngữ khi đó là tiếng Anh, theo quy ước được nêu ở mục 5.

## 4. Danh mục giá trị

### 4.1. Năm và chương trình

Trường `nam` nhận một trong bốn giá trị từ 2022 đến 2025. Trường `chuong_trinh` phân biệt hai hệ đề thi: giá trị `2006` áp dụng cho các kỳ thi 2022, 2023, 2024 và nhóm thí sinh tự do thi theo đề cũ năm 2025; giá trị `2018` dành riêng cho nhóm thí sinh thi theo chương trình giáo dục phổ thông mới năm 2025.

### 4.2. Mã ngoại ngữ

Môn Ngoại ngữ bao gồm nhiều thứ tiếng, được phân biệt qua trường `ma_ngoai_ngu` như sau:

| Mã | Thứ tiếng |
|----|-----------|
| N1 | Tiếng Anh |
| N2 | Tiếng Nga |
| N3 | Tiếng Pháp |
| N4 | Tiếng Trung Quốc |
| N5 | Tiếng Đức |
| N6 | Tiếng Nhật |
| N7 | Tiếng Hàn |
| NA | Không dự thi Ngoại ngữ |

Cần lưu ý rằng ánh xạ các mã từ N4 đến N7 nên được đối chiếu lại với quy ước chính thức của Bộ Giáo dục và Đào tạo trước khi công bố. Trường hợp thí sinh không dự thi Ngoại ngữ được ghi nhận bằng chuỗi `NA` thay vì để trống; khi đọc lại tệp kết quả bằng pandas với cấu hình mặc định, chuỗi này sẽ tự động chuyển thành giá trị rỗng. Riêng năm 2022, dữ liệu gốc không có cột mã ngoại ngữ, nên toàn bộ thí sinh năm này mang giá trị `NA`.

### 4.3. Phân vùng địa lý

Mã tỉnh trong dữ liệu là mã hội đồng thi theo hệ thống trước khi sáp nhập đơn vị hành chính năm 2025, gồm 63 mã và không có mã 20. Các tỉnh được phân về sáu vùng kinh tế xã hội, sau đó gộp tiếp thành ba miền Bắc, Trung, Nam.

Trung du và miền núi phía Bắc (thuộc miền Bắc) gồm các mã 05 Hà Giang, 06 Cao Bằng, 07 Lai Châu, 08 Lào Cai, 09 Tuyên Quang, 10 Lạng Sơn, 11 Bắc Kạn, 12 Thái Nguyên, 13 Yên Bái, 14 Sơn La, 15 Phú Thọ, 18 Bắc Giang, 23 Hòa Bình và 62 Điện Biên.

Đồng bằng sông Hồng (thuộc miền Bắc) gồm 01 Hà Nội, 03 Hải Phòng, 16 Vĩnh Phúc, 17 Quảng Ninh, 19 Bắc Ninh, 21 Hải Dương, 22 Hưng Yên, 24 Hà Nam, 25 Nam Định, 26 Thái Bình và 27 Ninh Bình.

Bắc Trung Bộ và Duyên hải miền Trung (thuộc miền Trung) gồm 04 Đà Nẵng, 28 Thanh Hóa, 29 Nghệ An, 30 Hà Tĩnh, 31 Quảng Bình, 32 Quảng Trị, 33 Thừa Thiên Huế, 34 Quảng Nam, 35 Quảng Ngãi, 37 Bình Định, 39 Phú Yên, 41 Khánh Hòa, 45 Ninh Thuận và 47 Bình Thuận.

Tây Nguyên (thuộc miền Trung) gồm 36 Kon Tum, 38 Gia Lai, 40 Đắk Lắk, 42 Lâm Đồng và 63 Đắk Nông.

Đông Nam Bộ (thuộc miền Nam) gồm 02 Thành phố Hồ Chí Minh, 43 Bình Phước, 44 Bình Dương, 46 Tây Ninh, 48 Đồng Nai và 52 Bà Rịa Vũng Tàu.

Đồng bằng sông Cửu Long (thuộc miền Nam) gồm 49 Long An, 50 Đồng Tháp, 51 An Giang, 53 Tiền Giang, 54 Kiên Giang, 55 Cần Thơ, 56 Bến Tre, 57 Vĩnh Long, 58 Trà Vinh, 59 Sóc Trăng, 60 Bạc Liêu, 61 Cà Mau và 64 Hậu Giang.

### 4.4. Ban dự thi

Trường `ban` chỉ áp dụng cho thí sinh chương trình 2006 và nhận một trong ba giá trị KHTN, KHXH hoặc Khác. Thí sinh chương trình 2018 luôn có giá trị rỗng ở trường này.

## 5. Quy trình xử lý dữ liệu

Quy trình làm sạch và hợp nhất được thiết kế để bảo toàn tối đa thông tin gốc, hạn chế tối thiểu việc can thiệp vào giá trị điểm, và đảm bảo nhất quán giữa các năm có cấu trúc khác nhau.

Trước hết, tên cột của ba tệp Excel được chuẩn hóa về cùng bộ tên với ba tệp CSV, đồng thời loại bỏ cột số thứ tự không cần thiết. Số báo danh được ép về dạng chuỗi, làm sạch phần thập phân thừa nếu Excel lưu nhầm dưới dạng số, sau đó bổ sung số 0 ở đầu để đảm bảo đủ tám chữ số. Những dòng có số báo danh không hợp lệ sẽ bị loại và ghi nhận số lượng.

Mã tỉnh được trích từ hai chữ số đầu của số báo danh, rồi ánh xạ sang tên tỉnh, vùng kinh tế xã hội và miền địa lý dựa trên bảng tra cứu cố định gồm 63 tỉnh. Các mã tỉnh không nằm trong danh mục, bao gồm cả mã 20 không tồn tại, sẽ bị loại và ghi nhận.

Đối với điểm số, dữ liệu được ép về kiểu số thực, ô trống chuyển thành giá trị rỗng. Hai mốc 0 và 10 được giữ nguyên vì đây là các giá trị hợp lệ, trong đó điểm 0 phản ánh điểm liệt thực tế. Các giá trị nằm ngoài khoảng từ 0 đến 10 được chuyển thành rỗng và ghi nhận số lượng. Quá trình xử lý tuyệt đối không làm tròn điểm theo bước 0,25, bởi chương trình 2018 xuất hiện những mức điểm lẻ như 7,35 hay 6,35; cũng không loại điểm ngoại lai theo phương pháp tứ phân vị, và không thay thế giá trị rỗng bằng 0. Theo đó, mọi thống kê trung bình môn về sau đều phải được tính trên tập thí sinh thực sự dự thi môn đó.

Trường mã ngoại ngữ được chuẩn hóa về chữ hoa, loại bỏ khoảng trắng thừa, và quy các giá trị rỗng về chuỗi `NA`. Trường ban dự thi được xác định cho thí sinh chương trình 2006 bằng cách so sánh số môn có điểm giữa nhóm tự nhiên gồm Vật lí, Hóa học, Sinh học và nhóm xã hội gồm Lịch sử, Địa lí, Giáo dục công dân; bên nào nhiều môn hơn sẽ quyết định ban, trường hợp bằng nhau và cùng lớn hơn 0 được xếp vào nhóm Khác. Thí sinh chương trình 2018 không được gán ban, do cấu trúc đề mới đã phá vỡ cách phân chia tự nhiên và xã hội truyền thống.

Điểm các khối thi được tính bằng tổng điểm ba môn thành phần và chỉ có giá trị khi thí sinh dự thi đầy đủ. Hai khối A01 và D01 chỉ sử dụng điểm Ngoại ngữ khi thí sinh thi tiếng Anh. Riêng năm 2022, do dữ liệu gốc không có mã ngoại ngữ, toàn bộ điểm Ngoại ngữ được quy ước là tiếng Anh; đây là một giả định có chủ đích và được ghi nhận rõ để người sử dụng lưu ý khi đọc kết quả khối của riêng năm này.

Cuối cùng, những dòng không có điểm ở bất kỳ môn nào, tương ứng với thí sinh đăng ký nhưng vắng thi toàn bộ, sẽ bị loại khỏi dữ liệu và ghi nhận. Quy trình không thực hiện khử trùng trên khóa định danh mà chỉ đếm và báo cáo số bản ghi trùng. Dữ liệu sau xử lý được xuất ra tệp `final_data.csv` ở định dạng wide, với điểm số ghi hai chữ số thập phân và giá trị rỗng để trống.

## 6. Thống kê chất lượng

Sau khi xử lý, tổng số 4.232.332 dòng dữ liệu thô được rút gọn còn 4.227.695 dòng. Toàn bộ 4.637 dòng bị loại đều thuộc nhóm thí sinh vắng thi toàn bộ. Dữ liệu cho thấy chất lượng đầu vào rất tốt: không có số báo danh sai định dạng, không có mã tỉnh lạ, không có điểm nằm ngoài khoảng hợp lệ, và không có bản ghi trùng khóa.

| Hạng mục | Số lượng |
|----------|----------|
| Số báo danh sai định dạng | 0 |
| Mã tỉnh ngoài danh mục | 0 |
| Dòng vắng thi toàn bộ (đã loại) | 4.637 |
| Ô điểm ngoài khoảng 0 đến 10 | 0 |
| Bản ghi trùng khóa (chỉ đếm) | 0 |

Phân bố dữ liệu sau xử lý theo từng năm và chương trình được trình bày dưới đây.

| Năm | Chương trình | Số dòng | Loại do vắng thi |
|-----|--------------|---------|------------------|
| 2022 | 2006 | 995.435 | 6 |
| 2023 | 2006 | 1.017.584 | 4.476 |
| 2024 | 2006 | 1.061.604 | 1 |
| 2025 | 2006 | 22.088 | 2 |
| 2025 | 2018 | 1.130.984 | 152 |
| Tổng | | 4.227.695 | 4.637 |

Một điểm đáng chú ý là năm 2023 có số dòng vắng thi cao hơn hẳn các năm còn lại, với 4.476 dòng. Đây nhiều khả năng là nhóm thí sinh đăng ký nhưng không tham dự, cần được nhắc đến trong báo cáo phân tích nhưng không phải là lỗi dữ liệu.

## 7. Hạn chế và lưu ý khi diễn giải

Kết quả năm 2025 thuộc chương trình 2018 cần được xem là một năm bản lề và không so sánh trực tiếp về mặt thước đo với giai đoạn 2022 đến 2024. Đề thi, cấu trúc môn và cơ chế chọn môn của chương trình mới đều khác biệt: môn Giáo dục công dân không còn, xuất hiện các môn mới như Tin học, Công nghệ và Giáo dục kinh tế và pháp luật, đồng thời Ngoại ngữ trở thành môn tự chọn. Vì vậy, đường xu hướng điểm trung bình môn nên dừng ở năm 2024, còn năm 2025 được phân tích riêng.

Mã tỉnh trong dữ liệu phản ánh địa điểm dự thi theo hội đồng thi, không nhất thiết trùng với nơi cư trú hay nơi học của thí sinh. Do đó, mọi nhận định về chênh lệch giữa các địa phương cần được phát biểu theo địa điểm dự thi. Hệ mã tỉnh này cũng thuộc giai đoạn trước sáp nhập đơn vị hành chính năm 2025, nên không khớp với danh sách 34 tỉnh thành hiện hành; dữ liệu giữ nguyên hệ mã cũ nhằm bảo đảm tính nhất quán xuyên suốt bốn năm.

Môn Ngoại ngữ bao gồm nhiều thứ tiếng khác nhau, nên khi so sánh giữa các tỉnh hoặc vùng, cần giới hạn ở tiếng Anh để tránh so sánh nhầm giữa các thứ tiếng có mặt bằng điểm khác nhau. Bên cạnh đó, khối A01 và D01 của năm 2022 được tính dựa trên giả định toàn bộ Ngoại ngữ là tiếng Anh, do dữ liệu gốc thiếu mã ngoại ngữ.

Tỷ lệ giá trị rỗng cao ở nhiều môn là điều bình thường và bắt nguồn từ cơ chế chọn môn, chứ không phải dấu hiệu dữ liệu kém chất lượng. Ví dụ, phần lớn thí sinh không chọn thi Sinh học khiến trường điểm môn này rỗng tới khoảng 90 phần trăm. Trong mọi trường hợp, giá trị rỗng cần được hiểu là không dự thi, không phải điểm thấp.

Sau cùng, cần ý thức rõ giới hạn nội tại của bộ dữ liệu. Thông tin sẵn có chỉ gồm điểm số và số báo danh, hoàn toàn không có các yếu tố như giới tính, trường học, dân tộc, học lực hay hoàn cảnh kinh tế xã hội. Vì vậy, những câu hỏi liên quan đến bất bình đẳng giáo dục chỉ có thể dừng ở mức mô tả tương quan theo địa lý, và không nên được diễn giải thành quan hệ nhân quả.
