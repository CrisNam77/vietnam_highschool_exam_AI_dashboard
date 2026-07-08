import streamlit as st


st.title("6. AI Assistant")

st.header("Mục tiêu trang")
st.write(
    "Tạo gợi ý phân tích và code Pandas/Plotly theo flow duyệt thủ công: "
    "AI sinh code, người dùng xem và phê duyệt, backend mới chạy local."
)

question = st.text_area(
    "Câu hỏi phân tích",
    placeholder="Ví dụ: So sánh điểm trung bình môn Toán giữa các vùng năm 2024.",
)

if st.button("Tạo code"):
    st.session_state["ai_explanation"] = (
        "Đây là phần giải thích giả lập. Backend AI thật sẽ được tích hợp sau."
    )
    st.session_state["ai_code"] = (
        "summary = df.groupby('vung_mien')['toan'].mean().reset_index()\n"
        "summary = summary.sort_values('toan', ascending=False)\n"
        "summary"
    )

st.subheader("Giải thích AI")
st.info(st.session_state.get("ai_explanation", "Chưa có giải thích."))

st.subheader("Code chờ duyệt")
code = st.session_state.get("ai_code", "# Code do AI tạo sẽ hiển thị tại đây.")
st.code(code, language="python")

col_reject, col_approve = st.columns(2)
with col_reject:
    if st.button("Từ chối"):
        st.warning("Code đã bị từ chối. Chưa có thao tác thực thi nào được gọi.")
with col_approve:
    if st.button("Phê duyệt và chạy"):
        st.info(
            "Skeleton UI: chưa gọi Execution API. Execution thật sẽ được triển khai "
            "sau với validator và sandbox local."
        )

st.subheader("Kết quả và logs")
st.info("Placeholder: kết quả bảng/biểu đồ và logs thực thi sẽ hiển thị tại đây.")

st.caption("TODO: kết nối FastAPI AI/Execution theo flow duyệt thủ công.")
