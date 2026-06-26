import argparse
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ==============================================================================
# ĐỊNH NGHĨA CÁC HẰNG SỐ (CONSTANTS)
# ==============================================================================

# Bảng mã tỉnh (63 tỉnh/thành phố, không có mã 20)
PROVINCE = {
    "01": "THÀNH PHỐ HÀ NỘI",
    "02": "THÀNH PHỐ HỒ CHÍ MINH",
    "03": "THÀNH PHỐ HẢI PHÒNG",
    "04": "THÀNH PHỐ ĐÀ NẴNG",
    "05": "TỈNH HÀ GIANG",
    "06": "TỈNH CAO BẰNG",
    "07": "TỈNH LAI CHÂU",
    "08": "TỈNH LÀO CAI",
    "09": "TỈNH TUYÊN QUANG",
    "10": "TỈNH LẠNG SƠN",
    "11": "TỈNH BẮC KẠN",
    "12": "TỈNH THÁI NGUYÊN",
    "13": "TỈNH YÊN BÁI",
    "14": "TỈNH SƠN LA",
    "15": "TỈNH PHÚ THỌ",
    "16": "TỈNH VĨNH PHÚC",
    "17": "TỈNH QUẢNG NINH",
    "18": "TỈNH BẮC GIANG",
    "19": "TỈNH BẮC NINH",
    "21": "TỈNH HẢI DƯƠNG",
    "22": "TỈNH HƯNG YÊN",
    "23": "TỈNH HÒA BÌNH",
    "24": "TỈNH HÀ NAM",
    "25": "TỈNH NAM ĐỊNH",
    "26": "TỈNH THÁI BÌNH",
    "27": "TỈNH NINH BÌNH",
    "28": "TỈNH THANH HÓA",
    "29": "TỈNH NGHỆ AN",
    "30": "TỈNH HÀ TĨNH",
    "31": "TỈNH QUẢNG BÌNH",
    "32": "TỈNH QUẢNG TRỊ",
    "33": "TỈNH THỪA THIÊN - HUẾ",
    "34": "TỈNH QUẢNG NAM",
    "35": "TỈNH QUẢNG NGÃI",
    "36": "TỈNH KON TUM",
    "37": "TỈNH BÌNH ĐỊNH",
    "38": "TỈNH GIA LAI",
    "39": "TỈNH PHÚ YÊN",
    "40": "TỈNH ĐẮK LẮK",
    "41": "TỈNH KHÁNH HÒA",
    "42": "TỈNH LÂM ĐỒNG",
    "43": "TỈNH BÌNH PHƯỚC",
    "44": "TỈNH BÌNH DƯƠNG",
    "45": "TỈNH NINH THUẬN",
    "46": "TỈNH TÂY NINH",
    "47": "TỈNH BÌNH THUẬN",
    "48": "TỈNH ĐỒNG NAI",
    "49": "TỈNH LONG AN",
    "50": "TỈNH ĐỒNG THÁP",
    "51": "TỈNH AN GIANG",
    "52": "TỈNH BÀ RỊA – VŨNG TÀU",
    "53": "TỈNH TIỀN GIANG",
    "54": "TỈNH KIÊN GIANG",
    "55": "THÀNH PHỐ CẦN THƠ",
    "56": "TỈNH BẾN TRE",
    "57": "TỈNH VĨNH LONG",
    "58": "TỈNH TRÀ VINH",
    "59": "TỈNH SÓC TRĂNG",
    "60": "TỈNH BẠC LIÊU",
    "61": "TỈNH CÀ MAU",
    "62": "TỈNH ĐIỆN BIÊN",
    "63": "TỈNH ĐĂK NÔNG",
    "64": "TỈNH HẬU GIANG"
}

# 6 vùng miền
REGION6 = {
    "Trung du và miền núi phía Bắc": ["05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "18", "23", "62"],
    "Đồng bằng sông Hồng": ["01", "03", "16", "17", "19", "21", "22", "24", "25", "26", "27"],
    "Bắc Trung Bộ và Duyên hải miền Trung": ["04", "28", "29", "30", "31", "32", "33", "34", "35", "37", "39", "41", "45", "47"],
    "Tây Nguyên": ["36", "38", "40", "42", "63"],
    "Đông Nam Bộ": ["02", "43", "44", "46", "48", "52"],
    "Đồng bằng sông Cửu Long": ["49", "50", "51", "53", "54", "55", "56", "57", "58", "59", "60", "61", "64"]
}

# 3 vùng (Bắc, Trung, Nam)
REGION3 = {
    "Bắc": REGION6["Trung du và miền núi phía Bắc"] + REGION6["Đồng bằng sông Hồng"],
    "Trung": REGION6["Bắc Trung Bộ và Duyên hải miền Trung"] + REGION6["Tây Nguyên"],
    "Nam": REGION6["Đông Nam Bộ"] + REGION6["Đồng bằng sông Cửu Long"]
}

# Dictionary ánh xạ mã tỉnh sang vùng (phục vụ lookup nhanh)
MAP_REGION6 = {code: region for region, codes in REGION6.items() for code in codes}
MAP_REGION3 = {code: region for region, codes in REGION3.items() for code in codes}

# Danh sách 13 cột điểm chuẩn (canonical)
SCORE_COLS = [
    "toan", "ngu_van", "ngoai_ngu", "vat_li", "hoa_hoc", "sinh_hoc", 
    "lich_su", "dia_li", "gdcd", "tin_hoc", "cong_nghe_cn", "cong_nghe_nn", "gd_ktpl"
]

# Bảng đổi tên cột từ file gốc sang chuẩn
RENAME_2006 = {
    "SOBAODANH": "sbd", "Toán": "toan", "Văn": "ngu_van", "Lí": "vat_li", 
    "Hóa": "hoa_hoc", "Sinh": "sinh_hoc", "Sử": "lich_su", "Địa": "dia_li", 
    "Giáo dục công dân": "gdcd", "Ngoại ngữ": "ngoai_ngu", 
    "Mã môn ngoại ngữ": "ma_ngoai_ngu"
}

RENAME_2018 = {
    "SOBAODANH": "sbd", "Toán": "toan", "Văn": "ngu_van", "Lí": "vat_li", 
    "Hóa": "hoa_hoc", "Sinh": "sinh_hoc", "Sử": "lich_su", "Địa": "dia_li", 
    "Ngoại ngữ": "ngoai_ngu", "Mã môn ngoại ngữ": "ma_ngoai_ngu", 
    "Tin học": "tin_hoc", "Công nghệ công nghiệp": "cong_nghe_cn", 
    "Công nghệ nông nghiệp": "cong_nghe_nn", "Giáo dục kinh tế và pháp luật": "gd_ktpl"
}

# ==============================================================================
# HÀM XỬ LÝ CHÍNH
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="Script làm sạch và gộp dữ liệu điểm thi THPT.")
    parser.add_argument("--raw", type=str, default="data/raw", help="Đường dẫn thư mục chứa dữ liệu thô")
    parser.add_argument("--out", type=str, default="data/processed", help="Đường dẫn thư mục chứa dữ liệu đầu ra")
    args = parser.parse_args()

    raw_dir = Path(args.raw)
    out_dir = Path(args.out)
    
    # Tạo thư mục đầu ra nếu chưa có
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[*] Bắt đầu đọc dữ liệu từ thư mục {raw_dir}...")
    
    stats_raw = {}
    dfs = []
    
    # ---------------------------------------------------------
    # BƯỚC 1 & 2: Đọc dữ liệu
    # ---------------------------------------------------------
    
    # Nguồn 1: diem_thi_thpt_2022.csv
    file1 = raw_dir / "diem_thi_thpt_2022.csv"
    if file1.exists():
        df1 = pd.read_csv(file1, dtype=str, keep_default_na=False, na_values=[])
        df1["nam"] = 2022
        df1["chuong_trinh"] = "2006"
        df1["ma_ngoai_ngu"] = "NA" # Năm 2022 không có mã ngoại ngữ
        stats_raw["diem_thi_thpt_2022.csv"] = len(df1)
        dfs.append(df1)
        print(f" - Đã đọc {file1.name}: {len(df1)} dòng")

    # Nguồn 2: diem_thi_thpt_2023.csv
    file2 = raw_dir / "diem_thi_thpt_2023.csv"
    if file2.exists():
        df2 = pd.read_csv(file2, dtype=str, keep_default_na=False, na_values=[])
        df2["nam"] = 2023
        df2["chuong_trinh"] = "2006"
        stats_raw["diem_thi_thpt_2023.csv"] = len(df2)
        dfs.append(df2)
        print(f" - Đã đọc {file2.name}: {len(df2)} dòng")

    # Nguồn 3: diem_thi_thpt_2024.csv
    file3 = raw_dir / "diem_thi_thpt_2024.csv"
    if file3.exists():
        df3 = pd.read_csv(file3, dtype=str, keep_default_na=False, na_values=[])
        df3["nam"] = 2024
        df3["chuong_trinh"] = "2006"
        stats_raw["diem_thi_thpt_2024.csv"] = len(df3)
        dfs.append(df3)
        print(f" - Đã đọc {file3.name}: {len(df3)} dòng")

    # Nguồn 4: 20250715-ketquathi-ct2006.xlsx
    file4 = raw_dir / "20250715-ketquathi-ct2006.xlsx"
    if file4.exists():
        df4 = pd.read_excel(file4, sheet_name="Sheet1", dtype=str)
        if "STT" in df4.columns:
            df4 = df4.drop(columns=["STT"])
        df4 = df4.rename(columns=RENAME_2006)
        df4["nam"] = 2025
        df4["chuong_trinh"] = "2006"
        stats_raw["20250715-ketquathi-ct2006.xlsx"] = len(df4)
        dfs.append(df4)
        print(f" - Đã đọc {file4.name}: {len(df4)} dòng")

    # Nguồn 5: 20250715-ketquathi-ct2018a.xlsx
    file5 = raw_dir / "20250715-ketquathi-ct2018a.xlsx"
    if file5.exists():
        df5 = pd.read_excel(file5, sheet_name="Sheet1", dtype=str)
        if "STT" in df5.columns:
            df5 = df5.drop(columns=["STT"])
        df5 = df5.rename(columns=RENAME_2018)
        df5["nam"] = 2025
        df5["chuong_trinh"] = "2018"
        stats_raw["20250715-ketquathi-ct2018a.xlsx"] = len(df5)
        dfs.append(df5)
        print(f" - Đã đọc {file5.name}: {len(df5)} dòng")

    # Nguồn 6: 20250715-ketquathi-ct2018a_2.xlsx
    file6 = raw_dir / "20250715-ketquathi-ct2018a_2.xlsx"
    if file6.exists():
        df6 = pd.read_excel(file6, sheet_name="Sheet2", dtype=str)
        if "STT" in df6.columns:
            df6 = df6.drop(columns=["STT"])
        df6 = df6.rename(columns=RENAME_2018)
        df6["nam"] = 2025
        df6["chuong_trinh"] = "2018"
        stats_raw["20250715-ketquathi-ct2018a_2.xlsx"] = len(df6)
        dfs.append(df6)
        print(f" - Đã đọc {file6.name}: {len(df6)} dòng")

    if not dfs:
        print("Không tìm thấy bất kỳ dữ liệu nào trong thư mục raw. Dừng script.")
        sys.exit(0)

    # ---------------------------------------------------------
    # BƯỚC 3: Gộp dữ liệu
    # ---------------------------------------------------------
    print("[*] Đang gộp dữ liệu...")
    df = pd.concat(dfs, ignore_index=True)
    total_raw_rows = len(df)
    
    # ---------------------------------------------------------
    # BƯỚC 4: Làm sạch SBD
    # ---------------------------------------------------------
    print("[*] Đang xử lý Số báo danh (SBD)...")
    # Ép kiểu chuỗi, thay thế .0 và ký tự không phải số, zfill về 8
    df["sbd"] = df["sbd"].fillna("").astype(str)
    df["sbd"] = df["sbd"].str.replace(r"\.0$", "", regex=True)
    df["sbd"] = df["sbd"].str.replace(r"\D", "", regex=True)
    df["sbd"] = df["sbd"].str.zfill(8)
    
    # Loại bỏ các SBD không đúng 8 chữ số
    invalid_sbd_mask = df["sbd"].str.len() != 8
    dropped_invalid_sbd = int(invalid_sbd_mask.sum())
    df = df[~invalid_sbd_mask].copy()
    
    # ---------------------------------------------------------
    # BƯỚC 5: Mã tỉnh và Vùng miền
    # ---------------------------------------------------------
    print("[*] Đang ánh xạ Tỉnh và Vùng miền...")
    df["ma_tinh"] = df["sbd"].str[:2]
    df["ten_tinh"] = df["ma_tinh"].map(PROVINCE)
    df["vung_mien"] = df["ma_tinh"].map(MAP_REGION6)
    df["vung_3"] = df["ma_tinh"].map(MAP_REGION3)
    
    # Mã tỉnh lạ -> đếm và loại bỏ
    strange_province_mask = df["ten_tinh"].isna()
    dropped_strange_province = int(strange_province_mask.sum())
    df = df[~strange_province_mask].copy()

    # ---------------------------------------------------------
    # BƯỚC 6: Xử lý 13 cột điểm
    # ---------------------------------------------------------
    print("[*] Đang ép kiểu và lọc điểm hợp lệ...")
    out_of_bounds_count = 0
    for col in SCORE_COLS:
        if col in df.columns:
            # Ép float, các chuỗi rỗng và lỗi -> NaN
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")
            # Set NaN đối với điểm nằm ngoài khoảng [0, 10]
            invalid_score_mask = (df[col] < 0) | (df[col] > 10)
            out_of_bounds_count += int(invalid_score_mask.sum())
            df.loc[invalid_score_mask, col] = np.nan
        else:
            df[col] = np.nan

    # ---------------------------------------------------------
    # BƯỚC 7: Làm sạch ma_ngoai_ngu
    # ---------------------------------------------------------
    # Quy ước: thí sinh KHÔNG thi ngoại ngữ -> ma_ngoai_ngu = chuỗi "NA"
    # (không để trống). Lưu ý: khi đọc lại final_data.csv bằng pd.read_csv mặc định,
    # "NA" sẽ tự thành NaN; muốn giữ nguyên chuỗi thì đọc với keep_default_na=False.
    print("[*] Đang chuẩn hóa mã ngoại ngữ...")
    if "ma_ngoai_ngu" in df.columns:
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].astype(str).str.strip().str.upper()
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].replace(["", "NAN", "NONE"], "NA")
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].fillna("NA")
    else:
        df["ma_ngoai_ngu"] = "NA"

    # ---------------------------------------------------------
    # BƯỚC 8: Các biến dẫn xuất
    # ---------------------------------------------------------
    print("[*] Đang tạo các biến dẫn xuất...")
    
    # Tính số môn có điểm
    df["so_mon"] = df[SCORE_COLS].notna().sum(axis=1)
    
    # Tính Ban (chỉ tính với chuong_trinh=="2006")
    khtn_count = df[["vat_li", "hoa_hoc", "sinh_hoc"]].notna().sum(axis=1)
    khxh_count = df[["lich_su", "dia_li", "gdcd"]].notna().sum(axis=1)

    cond_2006 = df["chuong_trinh"] == "2006"
    cond_khtn = cond_2006 & (khtn_count > khxh_count)
    cond_khxh = cond_2006 & (khxh_count > khtn_count)
    cond_khac = cond_2006 & (khtn_count == khxh_count) & (khtn_count > 0)

    df["ban"] = pd.Series(np.nan, index=df.index, dtype=object)
    df.loc[cond_khtn, "ban"] = "KHTN"
    df.loc[cond_khxh, "ban"] = "KHXH"
    df.loc[cond_khac, "ban"] = "Khác"
    
    # Điểm Anh
    # Giả định: năm 2022 coi toàn bộ điểm ngoại ngữ là tiếng Anh (N1)
    df["diem_anh"] = np.where(
        (df["ma_ngoai_ngu"] == "N1") | (df["nam"] == 2022),
        df["ngoai_ngu"],
        np.nan
    )
    
    # Điểm khối
    df["diem_khoi_a00"] = df["toan"] + df["vat_li"] + df["hoa_hoc"]
    df["diem_khoi_a01"] = df["toan"] + df["vat_li"] + df["diem_anh"]
    df["diem_khoi_b00"] = df["toan"] + df["hoa_hoc"] + df["sinh_hoc"]
    df["diem_khoi_c00"] = df["ngu_van"] + df["lich_su"] + df["dia_li"]
    df["diem_khoi_d01"] = df["toan"] + df["ngu_van"] + df["diem_anh"]

    # ---------------------------------------------------------
    # BƯỚC 9: Loại bỏ dòng so_mon == 0
    # ---------------------------------------------------------
    so_mon_zero_mask = df["so_mon"] == 0
    dropped_so_mon_zero = int(so_mon_zero_mask.sum())
    df = df[~so_mon_zero_mask].copy()

    dup_key_count = int(df.duplicated(subset=["nam","chuong_trinh","sbd"], keep=False).sum())

    # ---------------------------------------------------------
    # BƯỚC 10: Xuất dữ liệu
    # ---------------------------------------------------------
    print("[*] Đang lưu dữ liệu...")
    
    WIDE_COLS = [
        "nam", "chuong_trinh", "sbd", "ma_tinh", "ten_tinh", 
        "vung_mien", "vung_3", "ma_ngoai_ngu"
    ] + SCORE_COLS + [
        "so_mon", "ban", "diem_khoi_a00", "diem_khoi_a01", 
        "diem_khoi_b00", "diem_khoi_c00", "diem_khoi_d01"
    ]
    
    # Lưu định dạng WIDE
    df_wide = df[WIDE_COLS]
    wide_path = out_dir / "final_data.csv"
    df_wide.to_csv(wide_path, index=False, float_format="%.2f")
    print(f" - Đã lưu WIDE dataset: {wide_path} ({len(df_wide)} dòng)")

    # ---------------------------------------------------------
    # BƯỚC 12: Ghi thống kê chạy thuật toán
    # ---------------------------------------------------------
    print("[*] Đang sinh báo cáo thống kê...")
    
    stats_md = "# Thống kê chạy xử lý dữ liệu\n\n"
    stats_md += "## 1. Dữ liệu thô\n"
    for f_name, count in stats_raw.items():
        stats_md += f"- **{f_name}**: {count} dòng\n"
    stats_md += f"\n- **Tổng số dòng sau khi gộp**: {total_raw_rows}\n\n"
    
    stats_md += "## 2. Loại dữ liệu\n"
    stats_md += f"- **Số dòng bị loại do SBD lỗi (không đúng 8 chữ số)**: {dropped_invalid_sbd}\n"
    stats_md += f"- **Số dòng bị loại do mã tỉnh lạ (không có trong danh mục)**: {dropped_strange_province}\n"
    stats_md += f"- **Số dòng bị loại do số môn thi = 0**: {dropped_so_mon_zero}\n"
    stats_md += f"- **Số ô điểm bị set về NaN do ngoài khoảng [0, 10]**: {out_of_bounds_count}\n"
    stats_md += f"- **Số bản ghi trùng khóa (nam, chuong_trinh, sbd) — chỉ đếm, KHÔNG loại**: {dup_key_count}\n\n"
    
    stats_md += "## 3. Dữ liệu đầu ra\n"
    stats_md += f"- **Số dòng WIDE (`final_data.csv`)**: {len(df_wide)}\n\n"
    
    stats_md += "## 4. Phân bố theo năm và chương trình\n"
    dist = df_wide.groupby(["nam", "chuong_trinh"]).size().reset_index(name="count")
    for _, row in dist.iterrows():
        stats_md += f"- Năm **{row['nam']}** - Chương trình **{row['chuong_trinh']}**: {row['count']} dòng\n"

    stats_path = out_dir / "clean_run_stats.md"
    with open(stats_path, "w", encoding="utf-8") as f:
        f.write(stats_md)
    print(f" - Đã lưu file báo cáo: {stats_path}")
    print("[*] HOÀN TẤT!")

if __name__ == "__main__":
    main()
