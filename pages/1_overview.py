import streamlit as st


st.title("1. Tổng quan")

st.header("Mục tiêu trang")
st.write("Tóm tắt quy mô dữ liệu, số thí sinh, số năm, số tỉnh và các KPI chính.")

st.subheader("Bộ lọc")
st.info("Placeholder: bộ lọc năm, vùng miền, tỉnh/thành phố và chương trình.")

st.subheader("KPI và biểu đồ")
st.info("Placeholder: KPI tổng quan, xu hướng số lượng thí sinh và điểm trung bình.")

st.caption("TODO: kết nối `data/processed/final_data.csv` và tính KPI tổng quan.")
