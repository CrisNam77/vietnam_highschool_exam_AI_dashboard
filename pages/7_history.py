import pandas as pd
import streamlit as st


st.title("7. Lịch sử AI và thực thi")

st.header("Mục tiêu trang")
st.write("Theo dõi lịch sử câu hỏi, code được tạo, trạng thái duyệt và logs thực thi.")

st.subheader("Bộ lọc")
st.info("Placeholder: bộ lọc thời gian, trạng thái và loại output.")

st.subheader("Bảng lịch sử")
history = pd.DataFrame(
    columns=["log_id", "created_at", "question", "status", "expected_output"]
)
st.dataframe(history, use_container_width=True)

st.caption("TODO: kết nối SQLite logging thông qua Logs API.")
