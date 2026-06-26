import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

SUBJECT_COLS = [
    "toan", "ngu_van", "ngoai_ngu", "vat_li", "hoa_hoc", "sinh_hoc", 
    "lich_su", "dia_li", "gdcd", "tin_hoc", "cong_nghe_cn", "cong_nghe_nn", "gd_ktpl"
]

SUBJECT_VI = {
    "toan": "Toán",
    "ngu_van": "Ngữ văn",
    "ngoai_ngu": "Ngoại ngữ",
    "vat_li": "Vật lí",
    "hoa_hoc": "Hóa học",
    "sinh_hoc": "Sinh học",
    "lich_su": "Lịch sử",
    "dia_li": "Địa lí",
    "gdcd": "GDCD",
    "tin_hoc": "Tin học",
    "cong_nghe_cn": "CN Công nghiệp",
    "cong_nghe_nn": "CN Nông nghiệp",
    "gd_ktpl": "GD KT&PL"
}

REGION6_ORDER = [
    "Trung du và miền núi phía Bắc",
    "Đồng bằng sông Hồng",
    "Bắc Trung Bộ và Duyên hải miền Trung",
    "Tây Nguyên",
    "Đông Nam Bộ",
    "Đồng bằng sông Cửu Long"
]

YEAR_ORDER = [2022, 2023, 2024, 2025]

def load_data(path):
    df = pd.read_csv(
        path,
        dtype={
            "sbd": str, "ma_tinh": str, "ma_ngoai_ngu": str,
            "chuong_trinh": str, "ban": str,
        },
    )
    # "NA" trong CSV bị đọc thành NaN -> khôi phục thành chuỗi "NA" (không thi NN)
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].fillna("NA")
    # 13 cột điểm: ô trống -> NaN (không thi), ép float32 cho nhẹ + tính toán đúng
    df[SUBJECT_COLS] = df[SUBJECT_COLS].astype("float32")
    return df

def plot_missing_heatmap(df):
    """Vẽ heatmap thể hiện tỷ lệ % thiếu điểm của từng môn theo năm."""
    fig, ax = plt.subplots(figsize=(12, 6))
    missing_pct = df.groupby("nam")[SUBJECT_COLS].apply(lambda x: x.isna().mean() * 100)
    sns.heatmap(missing_pct.rename(columns=SUBJECT_VI), annot=True, fmt=".1f", cmap="YlOrRd", ax=ax)
    ax.set_title("Tỷ lệ % thiếu điểm môn thi theo năm")
    ax.set_ylabel("Năm")
    fig.tight_layout()
    return ax

def plot_so_mon_dist(df):
    """Vẽ phân bố số lượng môn thi (so_mon) tách theo chương trình."""
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.countplot(data=df, x="so_mon", hue="chuong_trinh", ax=ax, palette="Set2")
    ax.set_title("Phân bố số lượng môn thi")
    ax.set_xlabel("Số môn")
    ax.set_ylabel("Số lượng thí sinh")
    fig.tight_layout()
    return ax

def plot_score_hist_grid(df, year=None):
    """Vẽ histogram phổ điểm của 13 môn trên lưới subplot, bins 0-10 bước 0.25."""
    data = df if year is None else df[df["nam"] == year]
    fig, axes = plt.subplots(4, 4, figsize=(16, 12))
    axes = axes.flatten()
    bins = np.arange(0, 10.26, 0.25)
    for i, col in enumerate(SUBJECT_COLS):
        ax = axes[i]
        sns.histplot(data=data, x=col, bins=bins, color="skyblue", ax=ax)
        ax.set_title(SUBJECT_VI[col])
        ax.set_xlabel("Điểm")
        ax.set_ylabel("Tần suất")
    for j in range(len(SUBJECT_COLS), len(axes)):
        axes[j].axis("off")
    title_suffix = f" năm {year}" if year else " qua các năm"
    fig.suptitle(f"Phổ điểm các môn thi{title_suffix}", fontsize=16)
    fig.tight_layout()
    return fig

def summary_score_by_subject_year(df):
    """Tạo bảng thống kê các chỉ số (mean, median, std, %<1, %>=8, %=10) theo môn và năm."""
    records = []
    for year in df["nam"].dropna().unique():
        df_year = df[df["nam"] == year]
        for col in SUBJECT_COLS:
            s = df_year[col].dropna()
            if len(s) == 0:
                continue
            records.append({
                "Năm": int(year),
                "Môn": SUBJECT_VI[col],
                "Số lượng thí sinh": len(s),
                "Mean": s.mean(),
                "Median": s.median(),
                "Std": s.std(),
                "% < 1 (Điểm liệt)": (s < 1).mean() * 100,
                "% >= 8 (Khá giỏi)": (s >= 8).mean() * 100,
                "% = 10 (Tuyệt đối)": (s == 10).mean() * 100
            })
    return pd.DataFrame(records).sort_values(["Năm", "Môn"]).reset_index(drop=True)

def plot_subject_median_rank(df, year):
    """Vẽ biểu đồ cột xếp hạng trung vị (median) của các môn học trong một năm."""
    fig, ax = plt.subplots(figsize=(10, 6))
    df_year = df[df["nam"] == year]
    medians = df_year[SUBJECT_COLS].median().rename(SUBJECT_VI).sort_values()
    medians.dropna().plot(kind="barh", color="mediumseagreen", ax=ax)
    ax.set_title(f"Xếp hạng điểm trung vị các môn năm {year}")
    ax.set_xlabel("Điểm trung vị")
    fig.tight_layout()
    return ax

def plot_fail_rate_by_subject(df, year):
    """Vẽ biểu đồ cột tỷ lệ % điểm liệt (<1) của các môn học trong một năm."""
    fig, ax = plt.subplots(figsize=(10, 6))
    df_year = df[df["nam"] == year]
    fail_rates = (df_year[SUBJECT_COLS] < 1).mean().rename(SUBJECT_VI).sort_values(ascending=False) * 100
    fail_rates.dropna().plot(kind="bar", color="salmon", ax=ax)
    ax.set_title(f"Tỷ lệ điểm liệt (< 1) các môn năm {year}")
    ax.set_ylabel("Tỷ lệ (%)")
    plt.xticks(rotation=45, ha="right")
    fig.tight_layout()
    return ax

def plot_score_hist_single(df, subject, year=None):
    """Vẽ histogram phổ điểm của riêng 1 môn học."""
    fig, ax = plt.subplots(figsize=(8, 5))
    data = df if year is None else df[df["nam"] == year]
    bins = np.arange(0, 10.26, 0.25)
    sns.histplot(data=data, x=subject, bins=bins, color="royalblue", ax=ax)
    title_suffix = f" năm {year}" if year else " qua các năm"
    ax.set_title(f"Phổ điểm môn {SUBJECT_VI[subject]}{title_suffix}")
    ax.set_xlabel("Điểm")
    ax.set_ylabel("Tần suất")
    fig.tight_layout()
    return ax

def plot_trend_2022_2024(df, stat="mean"):
    """Vẽ biểu đồ xu hướng (mean/median) 2022-2024 dạng đường, và 2025 dạng scatter tách rời CT."""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Dữ liệu 2022-2024
    df_old = df[df["nam"] <= 2024]
    if stat == "mean":
        agg_old = df_old.groupby("nam")[SUBJECT_COLS].mean()
    else:
        agg_old = df_old.groupby("nam")[SUBJECT_COLS].median()
        
    for col in SUBJECT_COLS:
        ax.plot(agg_old.index, agg_old[col], marker='o', label=SUBJECT_VI[col])
        
    # Dữ liệu 2025
    df_2025_06 = df[(df["nam"] == 2025) & (df["chuong_trinh"] == "2006")]
    df_2025_18 = df[(df["nam"] == 2025) & (df["chuong_trinh"] == "2018")]
    
    if stat == "mean":
        agg_06 = df_2025_06[SUBJECT_COLS].mean()
        agg_18 = df_2025_18[SUBJECT_COLS].mean()
    else:
        agg_06 = df_2025_06[SUBJECT_COLS].median()
        agg_18 = df_2025_18[SUBJECT_COLS].median()
        
    for col in SUBJECT_COLS:
        color = ax.lines[SUBJECT_COLS.index(col)].get_color()
        if not np.isnan(agg_06.get(col, np.nan)):
            ax.scatter([2025], [agg_06[col]], marker='^', color=color)
        if not np.isnan(agg_18.get(col, np.nan)):
            ax.scatter([2025.1], [agg_18[col]], marker='X', color=color)
            
    ax.set_xticks([2022, 2023, 2024, 2025, 2025.1])
    ax.set_xticklabels(["2022", "2023", "2024", "2025 (CT2006)", "2025 (CT2018)"], rotation=15)
    ax.set_title(f"Xu hướng điểm {stat} qua các năm (Lưu ý: 2025 không nối tuyến)")
    ax.set_ylabel(f"Điểm {stat}")
    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    fig.tight_layout()
    return ax

def plot_province_rank(df, subject, top=10):
    """Vẽ biểu đồ cột ngang top và bottom các tỉnh theo điểm trung bình môn học."""
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    
    data = df
    if subject == "ngoai_ngu":
        data = df[df["ma_ngoai_ngu"] == "N1"]
        
    mean_scores = data.groupby("ten_tinh")[subject].mean().dropna().sort_values(ascending=False)
    
    if len(mean_scores) == 0:
        return fig
        
    mean_scores.head(top)[::-1].plot(kind="barh", color="teal", ax=axes[0])
    axes[0].set_title(f"Top {top} tỉnh có điểm trung bình cao nhất")
    axes[0].set_xlabel("Điểm trung bình")
    
    mean_scores.tail(top).plot(kind="barh", color="coral", ax=axes[1])
    axes[1].set_title(f"Bottom {top} tỉnh có điểm trung bình thấp nhất")
    axes[1].set_xlabel("Điểm trung bình")
    
    fig.suptitle(f"Xếp hạng điểm trung bình tỉnh môn {SUBJECT_VI[subject]}", fontsize=16)
    fig.tight_layout()
    return fig

def plot_region_box(df, subjects):
    """Vẽ boxplot phân bố điểm của một/nhiều môn theo 6 vùng kinh tế - xã hội."""
    fig, ax = plt.subplots(figsize=(12, 6))
    if isinstance(subjects, str):
        subjects = [subjects]
        
    data = df.melt(id_vars=["vung_mien", "ma_ngoai_ngu"], value_vars=subjects, var_name="Môn", value_name="Điểm")
    data = data.dropna(subset=["Điểm"])
    
    # Lọc tiếng Anh nếu có môn ngoại ngữ
    if "ngoai_ngu" in subjects:
        data = data[~((data["Môn"] == "ngoai_ngu") & (data["ma_ngoai_ngu"] != "N1"))]
        
    data["Môn"] = data["Môn"].map(SUBJECT_VI)
    
    sns.boxplot(data=data, x="vung_mien", y="Điểm", hue="Môn", order=REGION6_ORDER, ax=ax)
    ax.set_title("Phân bố điểm theo vùng kinh tế - xã hội")
    ax.set_xlabel("Vùng miền")
    plt.xticks(rotation=45, ha="right")
    fig.tight_layout()
    return ax

def plot_fail_rate_by_province(df, subject, top=10):
    """Vẽ biểu đồ cột ngang top các tỉnh có tỷ lệ điểm liệt cao nhất."""
    fig, ax = plt.subplots(figsize=(8, 6))
    data = df
    if subject == "ngoai_ngu":
        data = df[df["ma_ngoai_ngu"] == "N1"]
        
    prov_data = data.groupby("ten_tinh")[subject]
    fail_rates = (prov_data.apply(lambda x: (x < 1).mean()) * 100).dropna().sort_values(ascending=False)
    
    if len(fail_rates) == 0:
        return ax
        
    fail_rates.head(top)[::-1].plot(kind="barh", color="crimson", ax=ax)
    ax.set_title(f"Top {top} tỉnh tỷ lệ điểm liệt cao nhất môn {SUBJECT_VI[subject]}")
    ax.set_xlabel("Tỷ lệ %")
    fig.tight_layout()
    return ax

def plot_corr_heatmap(df):
    """Vẽ heatmap tương quan giữa các môn học (pairwise complete)."""
    fig, ax = plt.subplots(figsize=(10, 8))
    corr = df[SUBJECT_COLS].corr()
    sns.heatmap(corr.rename(columns=SUBJECT_VI, index=SUBJECT_VI), annot=True, fmt=".2f", cmap="coolwarm", center=0, vmin=-1, vmax=1, ax=ax)
    ax.set_title("Ma trận tương quan điểm thi các môn")
    fig.tight_layout()
    return ax

def plot_subject_scatter(df, x, y, sample=50000):
    """Vẽ scatter plot giữa 2 môn học, lấy ngẫu nhiên một mẫu con để tối ưu."""
    fig, ax = plt.subplots(figsize=(8, 6))
    data = df.dropna(subset=[x, y])
    if len(data) > sample:
        data = data.sample(sample, random_state=42)
        
    sns.scatterplot(data=data, x=x, y=y, alpha=0.1, color="purple", ax=ax)
    ax.set_title(f"Tương quan {SUBJECT_VI[x]} và {SUBJECT_VI[y]} (Mẫu: {len(data)})")
    ax.set_xlabel(SUBJECT_VI[x])
    ax.set_ylabel(SUBJECT_VI[y])
    fig.tight_layout()
    return ax

def plot_ban_by_region(df):
    """Vẽ biểu đồ cột chồng tỷ lệ thí sinh chọn ban KHTN/KHXH theo vùng (CT2006)."""
    fig, ax = plt.subplots(figsize=(10, 6))
    df_2006 = df[df["chuong_trinh"] == "2006"].dropna(subset=["ban"])
    if len(df_2006) == 0:
        return ax
        
    ban_counts = df_2006.groupby(["vung_mien", "ban"]).size().unstack(fill_value=0)
    # Reorder by REGION6_ORDER
    ban_counts = ban_counts.reindex(REGION6_ORDER).dropna()
    
    if len(ban_counts) > 0:
        ban_pct = ban_counts.div(ban_counts.sum(axis=1), axis=0) * 100
        ban_pct.plot(kind="bar", stacked=True, ax=ax, colormap="Set2")
        
    ax.set_title("Tỷ lệ lựa chọn ban theo vùng miền (CT2006)")
    ax.set_ylabel("Tỷ lệ %")
    ax.set_xlabel("Vùng miền")
    plt.xticks(rotation=45, ha="right")
    ax.legend(title="Ban")
    fig.tight_layout()
    return ax

def plot_ct2018_subject_uptake(df):
    """Vẽ biểu đồ cột tỷ lệ % thí sinh chọn thi các môn tự chọn (CT2018)."""
    fig, ax = plt.subplots(figsize=(10, 6))
    df_2018 = df[df["chuong_trinh"] == "2018"]
    if len(df_2018) == 0:
        return ax
        
    opt_subjects = ["vat_li", "hoa_hoc", "sinh_hoc", "lich_su", "dia_li", "tin_hoc", "cong_nghe_cn", "cong_nghe_nn", "gd_ktpl"]
    uptake = df_2018[opt_subjects].notna().mean().rename(SUBJECT_VI).sort_values(ascending=False) * 100
    
    uptake.plot(kind="bar", color="dodgerblue", ax=ax)
    ax.set_title("Tỷ lệ chọn môn tự chọn (CT2018)")
    ax.set_ylabel("Tỷ lệ %")
    plt.xticks(rotation=45, ha="right")
    fig.tight_layout()
    return ax
