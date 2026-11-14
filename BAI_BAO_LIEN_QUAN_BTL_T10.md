# Các bài báo liên quan đến BTL-T10 và kết quả đạt được

Ngày tổng hợp: 24/10/2026.

**Đề tài:** So sánh có công bằng không? Ngân sách tìm siêu tham số và thứ hạng baseline.

Tài liệu tổng hợp 7 bài phục vụ việc chạy GRU4Rec, NARM, SASRec và so sánh cấu hình mặc định với cấu hình được tìm kiếm bằng ngân sách bằng nhau. Các số liệu dưới đây là **kết quả do tác giả công bố**, không phải kết quả thực nghiệm của nhóm.

## 1. So sánh baseline và khả năng tái lập

**Bài báo:** *Are We Really Making Much Progress? A Worrying Analysis of Recent Neural Recommendation Approaches*.

**Tác giả:** Maurizio Ferrari Dacrema, Paolo Cremonesi, Dietmar Jannach. **Công bố:** RecSys 2019.

**Mục tiêu:** Kiểm tra khả năng tái lập và chất lượng baseline trong nghiên cứu gợi ý neural.

**Kết quả:** Khảo sát 18 thuật toán; chỉ tái lập được 7 với nỗ lực hợp lý. Trong số đó, 6 thường bị các phương pháp đơn giản vượt qua. Phương pháp còn lại không nhất quán vượt được mô hình xếp hạng tuyến tính non-neural đã tinh chỉnh tốt.

**Liên hệ BTL-T10:** Làm cơ sở cho động lực nghiên cứu: baseline được tuning kém có thể làm sai lệch kết luận. Bài này không trực tiếp xác định thứ hạng ba mô hình trên Diginetica của nhóm.

**Nguồn:** [Bài báo và PDF](https://arxiv.org/abs/1907.06902).

## 2. Cơ sở lựa chọn random search

**Bài báo:** *Random Search for Hyper-Parameter Optimization*.

**Tác giả:** James Bergstra, Yoshua Bengio. **Công bố:** JMLR, tập 13, trang 281–305, 2012.

**Mục tiêu:** So sánh random search với grid search và tìm kiếm thủ công.

**Kết quả:** Random search có thể tìm cấu hình tốt tương đương hoặc tốt hơn grid search với ít thời gian hơn. Trong thí nghiệm deep belief networks trên không gian 32 chiều, kết quả ngang bằng về thống kê trên 4/7 bộ dữ liệu và tốt hơn trên 1/7 bộ so với cách tìm kiếm kết hợp thủ công và grid search.

**Liên hệ BTL-T10:** Cơ sở chọn random search khi ngân sách hạn chế. Đây không phải bằng chứng rằng 12 cấu hình luôn đủ hoặc random search luôn tốt hơn trên Diginetica.

**Nguồn:** [JMLR, có PDF miễn phí](https://jmlr.org/papers/v13/bergstra12a.html).

## 3. Đánh giá thực nghiệm gợi ý theo phiên

**Bài báo:** *Empirical Analysis of Session-Based Recommendation Algorithms: A Comparison of Neural and Non-Neural Approaches*.

**Tác giả:** Malte Ludewig, Noemi Mauro, Sara Latifi, Dietmar Jannach. **Công bố:** UMUAI, tập 31, trang 149–181, 2021; đăng trực tuyến năm 2020.

**Kết quả:** So sánh 12 thuật toán, gồm 6 phương pháp neural, trên 8 bộ dữ liệu. Các phương pháp láng giềng đơn giản thường cạnh tranh tốt hoặc tốt hơn phương pháp phức tạp. Công bố framework `session-rec`.

**Thiết kế đáng chú ý:** Tối ưu theo validation MRR@20; thường dùng 100 lượt random search, NARM và CSRM dùng 50; có ngoại lệ vì chi phí tính toán.

**Liên hệ BTL-T10:** Tham khảo benchmark và tuning; cần ghi rõ bài này không áp dụng số lượt thử bằng nhau tuyệt đối cho mọi mô hình.

**Nguồn:** [Bản tạp chí](https://link.springer.com/article/10.1007/s11257-020-09277-1), mục 3.1–3.2 và Abstract; [arXiv](https://arxiv.org/abs/1910.12781).

## 4. GRU4Rec

**Bài báo:** *Session-based Recommendations with Recurrent Neural Networks*.

**Tác giả:** Balázs Hidasi, Alexandros Karatzoglou, Linas Baltrunas, Domonkos Tikk. **Công bố:** ICLR 2016; preprint 2015.

**Phương pháp:** Dùng GRU học chuỗi tương tác trong phiên.

**Kết quả trên RSC15, Bảng 1 và 3:**

| Phương pháp | Recall@20 | MRR@20 |
|---|---:|---:|
| Item-KNN | 0.5065 | 0.2048 |
| GRU, TOP1, 1.000 hidden units | 0.6206 | 0.2693 |

Theo bảng công bố, cấu hình TOP1 này tăng tương đối 22,53% Recall@20 và 31,49% MRR@20 so với Item-KNN.

**Liên hệ BTL-T10:** Bài gốc đã tìm siêu tham số trên validation; số trên không phải kết quả mặc định RecBole và không thuộc Diginetica.

**Nguồn:** [Toàn văn, mục 4.2–4.3](https://arxiv.org/html/1511.06939v4), [PDF](https://arxiv.org/pdf/1511.06939).

## 5. NARM

**Bài báo:** *Neural Attentive Session-based Recommendation*.

**Tác giả:** Jing Li và cộng sự. **Công bố:** CIKM 2017.

**Phương pháp:** Kết hợp GRU và attention để biểu diễn hành vi tuần tự cùng mục đích chính của phiên.

**Kết quả trên Diginetica, Bảng 3; đơn vị phần trăm:**

| Phương pháp | Recall@20 (%) | MRR@20 (%) |
|---|---:|---:|
| GRU-Rec | 43.82 | 15.46 |
| Improved GRU-Rec | 57.95 | 24.93 |
| NARM | 62.58 | 27.35 |

So với Improved GRU-Rec, NARM tăng khoảng 7,98% Recall@20 và 9,70% MRR@20 theo mức tăng tương đối tác giả báo cáo. Trên Yoochoose 1/64, MRR@20 của NARM lại thấp hơn Improved GRU-Rec (28,76% so với 29,00%).

**Liên hệ BTL-T10:** Có số tham khảo trên Diginetica, nhưng không mặc định áp dụng được cho split và cấu hình RecBole của nhóm.

**Nguồn:** [Toàn văn, Bảng 3 và mục 4.5](https://arxiv.org/html/1711.04725), [PDF](https://arxiv.org/pdf/1711.04725).

## 6. SASRec

**Bài báo:** *Self-Attentive Sequential Recommendation*.

**Tác giả:** Wang-Cheng Kang, Julian McAuley. **Năm:** 2018.

**Phương pháp:** Dùng self-attention học các tương tác quan trọng cho dự đoán tiếp theo.

**Kết quả SASRec, Bảng III:**

| Dữ liệu | Hit@10 | NDCG@10 |
|---|---:|---:|
| Beauty | 0.4854 | 0.3219 |
| Games | 0.7410 | 0.5360 |
| Steam | 0.8729 | 0.6306 |
| MovieLens-1M | 0.8245 | 0.5905 |

Tác giả báo cáo mức tăng trung bình 6,9% Hit Rate và 9,6% NDCG so với baseline mạnh nhất.

**Giới hạn đối chiếu:** Bài gốc xếp hạng item đích cùng 100 item âm lấy mẫu; không phải full ranking. Đây là dữ liệu chuỗi người dùng, không phải thí nghiệm Diginetica của BTL. Những bộ dữ liệu trên chỉ phục vụ đọc hiểu bài gốc.

**Nguồn:** [Toàn văn, Bảng III và mục IV-D–IV-E](https://arxiv.org/html/1808.09781), [PDF](https://arxiv.org/pdf/1808.09781).

## 7. RecBole

**Bài báo:** *RecBole: Towards a Unified, Comprehensive and Efficient Framework for Recommendation Algorithms*.

**Tác giả:** Wayne Xin Zhao và cộng sự. **Năm:** 2021; preprint đầu tiên năm 2020.

**Mục tiêu:** Thống nhất cách triển khai và đánh giá thuật toán gợi ý.

**Kết quả/đóng góp:** Phiên bản được mô tả trong bài triển khai 73 mô hình trên 28 bộ dữ liệu benchmark, dùng PyTorch. Framework có định dạng dữ liệu thống nhất, đánh giá chuẩn hóa, hỗ trợ GPU, tự động tuning và tiếp tục từ checkpoint.

**Liên hệ BTL-T10:** Là công cụ chạy ba baseline trong cùng hệ thống. Con số 73 mô hình/28 dữ liệu thuộc bài gốc, không phải thống kê phiên bản hiện tại. Bài framework không cung cấp một điểm HR/MRR duy nhất đại diện cho mọi mô hình.

**Nguồn:** [Bài báo và PDF](https://arxiv.org/abs/2011.01731), [dự án](https://recbole.io/).

## 8. Cách sử dụng trong báo cáo BTL-T10

| Phần báo cáo | Tài liệu phù hợp | Nội dung sử dụng |
|---|---|---|
| Đặt vấn đề | Bài 1 | Baseline yếu và khó tái lập làm giảm độ tin cậy |
| Phương pháp tìm siêu tham số | Bài 2 | Lý do chọn random search |
| Giao thức đánh giá | Bài 3 | Validation, đánh giá theo phiên và kiểm soát thí nghiệm |
| Cơ sở mô hình | Bài 4, 5, 6 | GRU4Rec, NARM, SASRec |
| Công cụ thực nghiệm | Bài 7 | Framework RecBole |

### Những điểm nhóm cần tự đo

Đây là đề xuất triển khai cho BTL, không phải kết quả đã có của nhóm:

1. Chạy default của cả ba mô hình trên cùng split Diginetica, cùng seed và cùng cách đánh giá.
2. Ghi phiên bản RecBole và lưu cấu hình thực tế. “Default RecBole” có thể khác cấu hình tác giả bài gốc.
3. Chạy với giới hạn chung tối đa 30 epoch và early stopping patience 5 như kế hoạch sơ bộ; đây là ngân sách do nhóm đặt, không phải mặc định của tất cả bài báo.
4. Chọn checkpoint và siêu tham số theo validation; báo cáo test, không dùng test để tuning.
5. Khi random search, chốt cùng số cấu hình cho mỗi mô hình, đồng thời ghi thời gian GPU vì cùng số lượt thử không đồng nghĩa cùng chi phí.
6. So sánh default với tuned; vẽ đường cong điểm validation tốt nhất sau 1, 3, 6, 12 cấu hình. Đo thứ hạng mô hình có thay đổi hay không.

### Quy tắc đọc số liệu

- Không ghép điểm của ba bài gốc thành bảng xếp hạng chung: dữ liệu, tiền xử lý, split, loss và ứng viên khác nhau.
- 62,58% tương đương 0,6258; phải thống nhất đơn vị trong bảng.
- Mức tăng tương đối = `(điểm mới - điểm cũ) / điểm cũ × 100%`; khác với chênh lệch điểm phần trăm.
- Recall@K trùng HR@K khi mỗi mẫu có một item đích; không suy rộng sang giao thức có nhiều item liên quan.
- Khi chưa chạy thực nghiệm, chưa thể kết luận mô hình nào tốt nhất trong BTL-T10.

## 9. Danh mục tham khảo rút gọn

[1] M. F. Dacrema, P. Cremonesi, and D. Jannach, “Are We Really Making Much Progress? A Worrying Analysis of Recent Neural Recommendation Approaches,” RecSys, 2019. https://arxiv.org/abs/1907.06902

[2] J. Bergstra and Y. Bengio, “Random Search for Hyper-Parameter Optimization,” JMLR, vol. 13, pp. 281–305, 2012. https://jmlr.org/papers/v13/bergstra12a.html

[3] M. Ludewig, N. Mauro, S. Latifi, and D. Jannach, “Empirical analysis of session-based recommendation algorithms,” UMUAI, vol. 31, pp. 149–181, 2021. https://doi.org/10.1007/s11257-020-09277-1

[4] B. Hidasi, A. Karatzoglou, L. Baltrunas, and D. Tikk, “Session-based Recommendations with Recurrent Neural Networks,” ICLR, 2016. https://arxiv.org/abs/1511.06939

[5] J. Li et al., “Neural Attentive Session-based Recommendation,” CIKM, 2017. https://doi.org/10.1145/3132847.3132926

[6] W.-C. Kang and J. McAuley, “Self-Attentive Sequential Recommendation,” 2018. https://arxiv.org/abs/1808.09781

[7] W. X. Zhao et al., “RecBole: Towards a Unified, Comprehensive and Efficient Framework for Recommendation Algorithms,” 2021. https://arxiv.org/abs/2011.01731
