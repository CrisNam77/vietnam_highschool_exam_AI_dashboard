import pandas as pd
import os
import sys

def main():
    csv_path = "data/processed/final_data.csv"
    parquet_path = "data/processed/final_data.parquet"
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        sys.exit(1)
        
    print(f"Reading {csv_path}...")
    df = pd.read_csv(
        csv_path,
        dtype={
            "sbd": str, "ma_tinh": str, "ma_ngoai_ngu": str,
            "chuong_trinh": str, "ban": str,
        }
    )
    
    csv_size = os.path.getsize(csv_path) / (1024*1024)
    csv_ram = df.memory_usage(deep=True).sum() / (1024*1024*1024)
    
    print(f"Before:")
    print(f"- File size: {csv_size:.2f} MB")
    print(f"- RAM usage: {csv_ram:.3f} GB")
    
    # Convert to category
    cat_cols = ["chuong_trinh", "ten_tinh", "vung_mien", "vung_3", "ma_ngoai_ngu", "ban"]
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].astype("category")
            
    print(f"Writing to {parquet_path}...")
    # Make sure output dir exists
    os.makedirs(os.path.dirname(parquet_path), exist_ok=True)
    df.to_parquet(parquet_path, engine="pyarrow")
    
    parquet_size = os.path.getsize(parquet_path) / (1024*1024)
    parquet_ram = df.memory_usage(deep=True).sum() / (1024*1024*1024)
    
    print(f"After:")
    print(f"- File size: {parquet_size:.2f} MB")
    print(f"- RAM usage: {parquet_ram:.3f} GB")
    print("Done!")

if __name__ == "__main__":
    main()
