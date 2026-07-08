"""Streamlit entrypoint for the Vietnam highschool exam dashboard."""

import streamlit as st


st.set_page_config(
    page_title="Vietnam THPT Exam AI Dashboard",
    page_icon="📊",
    layout="wide",
)

st.title("Phân tích và Trực quan hóa Điểm thi Tốt nghiệp THPT Việt Nam")
st.subheader("Dashboard Streamlit tích hợp AI Assistant")

st.write(
    "Ứng dụng phục vụ phân tích dữ liệu điểm thi tốt nghiệp THPT Việt Nam "
    "giai đoạn 2022-2025. Đây là boilerplate ban đầu; dữ liệu và logic phân "
    "tích chi tiết sẽ được triển khai trong các bước tiếp theo."
)

st.info("Chọn một trang phân tích ở sidebar để bắt đầu.")

st.caption(
    "Entry point này không đọc dữ liệu nặng. Dữ liệu sau xử lý dự kiến nằm tại "
    "`data/processed/final_data.csv`."
)
