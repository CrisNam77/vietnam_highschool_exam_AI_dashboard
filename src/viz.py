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
    """Vẽ heatmap tỷ lệ % thí sinh KHÔNG dự thi từng môn, theo năm và chương trình."""
    miss = (
        df[SUBJECT_COLS].isna()
        .groupby([df["nam"], df["chuong_trinh"]])
        .mean()
        .mul(100)
    )
    n_ct = df.groupby("nam")["chuong_trinh"].nunique()
    miss.index = [
        f"{nam}" if n_ct[nam] == 1 else f"{nam} · CT{ct}"
        for nam, ct in miss.index
    ]

    fig, ax = plt.subplots(figsize=(13, 5))
    sns.heatmap(
        miss.rename(columns=SUBJECT_VI),
        annot=True, fmt=".1f", cmap="YlOrRd",
        vmin=0, vmax=100,                       
        linewidths=0.5, linecolor="white",
        cbar_kws={"label": "% không dự thi"},
        ax=ax,
    )
    ax.set_title("Tỷ lệ thí sinh không dự thi theo môn",
                 fontsize=13, pad=12)
    ax.set_xlabel("Môn thi")
    ax.set_ylabel("Năm")
    plt.setp(ax.get_xticklabels(), rotation=40, ha="right")
    plt.setp(ax.get_yticklabels(), rotation=0)
    fig.tight_layout()
    return ax

def plot_so_mon_dist(df):
    """Vẽ phân bố số môn thi (%) theo từng chương trình."""
    dist = (
        df.groupby("chuong_trinh")["so_mon"]
        .value_counts(normalize=True)
        .mul(100)
        .rename("ti_le")
        .reset_index()
    )
    dist["chuong_trinh"] = dist["chuong_trinh"].map({"2006": "CT2006", "2018": "CT2018"})

    fig, ax = plt.subplots(figsize=(9, 5))
    sns.barplot(data=dist, x="so_mon", y="ti_le", hue="chuong_trinh",
                palette="Set2", ax=ax)
    ax.set_title("Phân bố số môn dự thi theo chương trình", fontsize=13, pad=10)
    ax.set_xlabel("Số môn dự thi")
    ax.set_ylabel("Tỉ lệ thí sinh trong chương trình (%)")
    ax.legend(title="Chương trình")
    for c in ax.containers:
        ax.bar_label(c, fmt="%.1f", fontsize=8, padding=2)
    fig.tight_layout()
    return ax

def plot_score_hist_grid(df, year=None, chuong_trinh=None):
    """Vẽ histogram phổ điểm các môn có dữ liệu, bins 0-10 bước 0.25."""
    data = df
    if year is not None:
        data = data[data["nam"] == year]
    if chuong_trinh is not None:
        data = data[data["chuong_trinh"] == chuong_trinh]

    cols = [c for c in SUBJECT_COLS if data[c].notna().any()]
    bins = np.arange(0, 10.26, 0.25)

    ncols = 4
    nrows = int(np.ceil(len(cols) / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(16, 3.2 * nrows))
    axes = np.atleast_1d(axes).flatten()

    for i, col in enumerate(cols):
        ax = axes[i]
        ax.hist(data[col].dropna().values, bins=bins, color="skyblue", edgecolor="none")
        ax.set_title(SUBJECT_VI[col], fontsize=11)
        ax.set_xlabel("Điểm")
        ax.set_xlim(0, 10)
        ax.set_ylabel("Tần suất" if i % ncols == 0 else "")
        ax.ticklabel_format(axis="y", style="plain")

    for j in range(len(cols), len(axes)):
        axes[j].axis("off")

    parts = []
    if year is not None:
        parts.append(f"năm {year}")
    if chuong_trinh is not None:
        parts.append(f"CT{chuong_trinh}")
    suffix = (" " + " · ".join(parts)) if parts else " toàn bộ"
    fig.suptitle(f"Phổ điểm các môn thi{suffix}", fontsize=16)
    fig.tight_layout(rect=[0, 0, 1, 0.97])
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


def plot_fail_rate_by_subject(df):
    """Tỷ lệ điểm liệt (<1) theo môn, gộp mọi năm/chương trình, chỉ tính trên thí sinh dự thi."""
    nhom = df["nam"].astype(str)
    mask = df["nam"] == 2025
    nhom = nhom.where(~mask, "2025·CT" + df["chuong_trinh"].astype(str))

    taken = df.groupby(nhom)[SUBJECT_COLS].count()
    failed = df[SUBJECT_COLS].lt(1).groupby(nhom).sum()
    rate = (failed / taken * 100)

    long = (
        rate.rename(columns=SUBJECT_VI)
        .reset_index(names="nhom")
        .melt(id_vars="nhom", var_name="mon", value_name="ti_le")
        .dropna(subset=["ti_le"])
    )
    order = [SUBJECT_VI[c] for c in SUBJECT_COLS if SUBJECT_VI[c] in long["mon"].values]
    hue_order = ["2022", "2023", "2024", "2025·CT2006", "2025·CT2018"]

    fig, ax = plt.subplots(figsize=(15, 6))
    sns.barplot(data=long, x="mon", y="ti_le", hue="nhom",
                order=order, hue_order=hue_order, palette="Set2", ax=ax)
    ax.set_title("Tỷ lệ điểm liệt (dưới 1 điểm) theo môn, theo năm và chương trình",
                 fontsize=13, pad=10)
    ax.set_xlabel("Môn thi")
    ax.set_ylabel("Tỷ lệ điểm liệt (%)")
    ax.legend(title="Năm · CT", bbox_to_anchor=(1.01, 1), loc="upper left")
    plt.setp(ax.get_xticklabels(), rotation=40, ha="right")
    fig.tight_layout()
    return ax


def plot_trend_2022_2024(df, stat="mean"):
    """Xu hướng điểm (mean/median) 2022-2024 theo từng môn (lưới nhỏ); 2025 vẽ điểm rời, tách CT2006/CT2018."""
    from matplotlib.lines import Line2D
    agg = "mean" if stat == "mean" else "median"

    old = getattr(df[df["nam"] <= 2024].groupby("nam")[SUBJECT_COLS], agg)().reindex([2022, 2023, 2024])
    s06 = getattr(df[(df["nam"] == 2025) & (df["chuong_trinh"] == "2006")][SUBJECT_COLS], agg)()
    s18 = getattr(df[(df["nam"] == 2025) & (df["chuong_trinh"] == "2018")][SUBJECT_COLS], agg)()

    cols = [c for c in SUBJECT_COLS if old[c].notna().any()]
    ncols = 3
    nrows = int(np.ceil(len(cols) / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(15, 4 * nrows), sharey=True)
    axes = np.atleast_1d(axes).flatten()

    c_line, c_06, c_18 = "#3b6fb0", "#e07b39", "#2a9d6f"
    for i, col in enumerate(cols):
        ax = axes[i]
        ax.plot([0, 1, 2], old[col].values, marker="o", color=c_line)
        if pd.notna(s06.get(col)):
            ax.scatter(3.0, s06[col], marker="^", s=80, color=c_06, zorder=3)
        if pd.notna(s18.get(col)):
            ax.scatter(3.4, s18[col], marker="X", s=80, color=c_18, zorder=3)
        ax.axvline(2.6, ls="--", lw=0.8, color="grey", alpha=0.6)
        ax.set_title(SUBJECT_VI[col], fontsize=11)
        ax.set_xticks([0, 1, 2, 3.0, 3.4])
        ax.set_xticklabels(["2022", "2023", "2024", "25·06", "25·18"], fontsize=8)
        ax.set_xlim(-0.3, 3.7)

    for j in range(len(cols), len(axes)):
        axes[j].axis("off")

    legend_handles = [
        Line2D([0], [0], color=c_line, marker="o", label="2022–2024"),
        Line2D([0], [0], color=c_06, marker="^", ls="", label="2025 · CT2006"),
        Line2D([0], [0], color=c_18, marker="X", ls="", label="2025 · CT2018"),
    ]
    fig.legend(handles=legend_handles, loc="upper right", ncol=3, fontsize=10)
    stat_vi = "trung bình" if stat == "mean" else "trung vị"
    fig.suptitle(f"Xu hướng điểm {stat_vi} theo môn", fontsize=15)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    return fig

def plot_province_rank(df, subject, top=10, min_n=100):
    """Top/bottom tỉnh theo điểm trung bình một môn (loại tỉnh có quá ít thí sinh)."""
    data = df[df["ma_ngoai_ngu"] == "N1"] if subject == "ngoai_ngu" else df

    g = data.groupby("ten_tinh")[subject].agg(["mean", "count"])
    g = g[g["count"] >= min_n]["mean"].sort_values(ascending=False)
    if g.empty:
        fig, ax = plt.subplots()
        return fig

    top_df = g.head(top)[::-1]
    bot_df = g.tail(top)
    xmax = g.max() * 1.05

    fig, axes = plt.subplots(1, 2, figsize=(15, 6), sharex=True)
    for ax, d, color, title in [
        (axes[0], top_df, "teal", f"Top {top} tỉnh điểm cao nhất"),
        (axes[1], bot_df, "coral", f"Bottom {top} tỉnh điểm thấp nhất"),
    ]:
        ax.barh(d.index, d.values, color=color)
        ax.set_title(title)
        ax.set_xlabel("Điểm trung bình")
        ax.set_ylabel("")
        ax.set_xlim(0, xmax)
        ax.bar_label(ax.containers[0], fmt="%.2f", padding=3, fontsize=9)

    fig.suptitle(f"Xếp hạng điểm trung bình tỉnh – môn {SUBJECT_VI[subject]}", fontsize=15)
    fig.tight_layout(rect=[0, 0, 1, 0.96])
    return fig



def plot_corr_heatmap(df, min_pairs=1000):
    """Heatmap tương quan giữa các môn, tách riêng CT2006 và CT2018 (che ô quá ít cặp)."""
    fig, axes = plt.subplots(2, 1, figsize=(11, 20))

    for ax, ct, title in [
        (axes[0], "2006", "Chương trình 2006 (2022–2025)"),
        (axes[1], "2018", "Chương trình 2018 (2025)"),
    ]:
        sub = df[df["chuong_trinh"] == ct]
        cols = [c for c in SUBJECT_COLS if sub[c].notna().any()]
        data = sub[cols]

        corr = data.corr()
        valid = data.notna().to_numpy(dtype="int32")
        n_pairs = valid.T @ valid

        tri = np.triu(np.ones(corr.shape, dtype=bool), k=1)
        mask = (n_pairs < min_pairs) | tri

        sns.heatmap(
            corr.rename(columns=SUBJECT_VI, index=SUBJECT_VI),
            mask=mask, annot=True, fmt=".2f", cmap="coolwarm",
            center=0, vmin=-1, vmax=1, square=True,
            linewidths=0.5, linecolor="white",
            cbar_kws={"shrink": 0.8}, annot_kws={"size": 9}, ax=ax,
        )
        ax.set_title(title, fontsize=13, pad=10)
        plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
        plt.setp(ax.get_yticklabels(), rotation=0)

    fig.suptitle("Ma trận tương quan điểm thi giữa các môn", fontsize=15)
    fig.tight_layout(rect=[0, 0, 1, 0.98])
    return fig


REGION6_SHORT = {
    "Trung du và miền núi phía Bắc": "TD&MN phía Bắc",
    "Đồng bằng sông Hồng": "ĐB sông Hồng",
    "Bắc Trung Bộ và Duyên hải miền Trung": "BTB & DH miền Trung",
    "Tây Nguyên": "Tây Nguyên",
    "Đông Nam Bộ": "Đông Nam Bộ",
    "Đồng bằng sông Cửu Long": "ĐB sông Cửu Long",
}


def plot_ban_by_region(df):
    """Tỷ lệ thí sinh chọn ban KHTN/KHXH theo vùng (CT2006), cột chồng %."""
    d = df[df["chuong_trinh"] == "2006"].dropna(subset=["ban"])
    counts = (
        d.groupby(["vung_mien", "ban"]).size().unstack(fill_value=0)
        .reindex(REGION6_ORDER).dropna(how="all")
    )
    pct = counts.div(counts.sum(axis=1), axis=0) * 100

    fig, ax = plt.subplots(figsize=(11, 6))
    pct.plot(kind="bar", stacked=True, ax=ax, color={"KHTN": "#66c2a5", "KHXH": "#bdbdbd"})

    ax.set_title("Tỷ lệ lựa chọn ban theo vùng miền (CT2006)", fontsize=13, pad=10)
    ax.set_ylabel("Tỷ lệ (%)")
    ax.set_xlabel("Vùng miền")
    ax.set_ylim(0, 100)
    ax.set_xticklabels([REGION6_SHORT.get(v, v) for v in pct.index], rotation=0, fontsize=9)
    ax.legend(title="Ban", bbox_to_anchor=(1.01, 1), loc="upper left")

    for c in ax.containers:
        ax.bar_label(c, fmt="%.0f%%", label_type="center", fontsize=8, color="white")

    fig.tight_layout()
    return ax

def plot_ct2018_subject_uptake(df):
    """Tỷ lệ thí sinh CT2018 chọn từng môn tự chọn, tô màu theo nhóm môn."""
    opt = ["vat_li", "hoa_hoc", "sinh_hoc", "lich_su", "dia_li",
           "tin_hoc", "cong_nghe_cn", "cong_nghe_nn", "gd_ktpl"]
    nhom = {
        "vat_li": "Tự nhiên", "hoa_hoc": "Tự nhiên", "sinh_hoc": "Tự nhiên",
        "lich_su": "Xã hội", "dia_li": "Xã hội", "gd_ktpl": "Xã hội",
        "tin_hoc": "Công nghệ - Tin", "cong_nghe_cn": "Công nghệ - Tin",
        "cong_nghe_nn": "Công nghệ - Tin",
    }
    mau = {"Tự nhiên": "#4C72B0", "Xã hội": "#DD8452", "Công nghệ - Tin": "#55A868"}

    d = df[df["chuong_trinh"] == "2018"]
    up = (d[opt].notna().mean() * 100).sort_values(ascending=False)
    colors = [mau[nhom[c]] for c in up.index]

    fig, ax = plt.subplots(figsize=(11, 6))
    bars = ax.bar([SUBJECT_VI[c] for c in up.index], up.values, color=colors)
    ax.bar_label(bars, fmt="%.1f%%", padding=3, fontsize=9)

    ax.set_title("Tỷ lệ chọn môn tự chọn (CT2018)", fontsize=13, pad=10)
    ax.set_ylabel("Tỷ lệ thí sinh chọn (%)")
    ax.set_xlabel("Môn tự chọn")
    ax.set_ylim(0, up.max() * 1.12)
    plt.setp(ax.get_xticklabels(), rotation=40, ha="right")

    handles = [plt.Rectangle((0, 0), 1, 1, color=mau[k]) for k in mau]
    ax.legend(handles, mau.keys(), title="Nhóm môn")
    fig.tight_layout()
    return ax


def create_line_chart(data_frame, x, y, title=None, color=None):
    """Create a Plotly line chart placeholder helper."""
    import plotly.express as px

    return px.line(data_frame, x=x, y=y, color=color, title=title)


def create_bar_chart(data_frame, x, y, title=None, color=None):
    """Create a Plotly bar chart placeholder helper."""
    import plotly.express as px

    return px.bar(data_frame, x=x, y=y, color=color, title=title)


def create_histogram(data_frame, x, title=None, color=None, nbins=None):
    """Create a Plotly histogram placeholder helper."""
    import plotly.express as px

    return px.histogram(data_frame, x=x, color=color, nbins=nbins, title=title)


def create_box_plot(data_frame, x=None, y=None, title=None, color=None):
    """Create a Plotly box plot placeholder helper."""
    import plotly.express as px

    return px.box(data_frame, x=x, y=y, color=color, title=title)


def create_heatmap(z, x=None, y=None, title=None):
    """Create a Plotly heatmap placeholder helper."""
    import plotly.graph_objects as go

    fig = go.Figure(data=go.Heatmap(z=z, x=x, y=y))
    fig.update_layout(title=title)
    return fig
