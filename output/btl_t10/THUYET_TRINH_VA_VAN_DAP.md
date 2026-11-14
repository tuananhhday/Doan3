# Gợi ý thuyết trình và vấn đáp BTL-T10

Tài liệu đọc cùng báo cáo và notebook. Các câu trả lời dưới đây dựa trên thí nghiệm đã hoàn tất.

## Bài toán và cách làm

**Đề tài đánh giá gì?** Tác động của ngân sách tuning đến chất lượng và thứ hạng GRU4Rec, NARM, SASRec; không đề xuất kiến trúc mới.

**Mặc định lấy ở đâu?** Tham số kiến trúc và learning rate tham chiếu RecBole 1.2.1. Epoch tối đa 30, batch, seed và cách đánh giá là các điều kiện chung đã đặt, không phải toàn bộ mặc định gốc.

**Vì sao dùng validation?** Dùng validation để chọn checkpoint và trial, giữ test cho đánh giá cuối. Điểm test baseline đã có ở tuần 1; danh sách 36 trial được đóng băng trước tuning và không chọn lại theo test.

**Ngân sách bằng nhau thế nào?** 12 cấu hình khác nhau/model, không tính baseline và smoke; không có nghĩa cùng thời gian GPU hay FLOPs.

**Vì sao HR@20 có thể gọi là Recall@20?** Mỗi prefix có một target; cả hai là tỉ lệ target nằm trong top-20. Không suy rộng đẳng thức này sang bài toán nhiều target.

**Vì sao khác điểm bài báo?** Split thời gian, train-only core/vocabulary, CE loss và full ranking khác giao thức gốc. Mốc 204.771 phiên/43.097 item không phải thống kê train-core của pipeline này.

**Đã làm cold-start chưa?** Phần chính T10 dùng Diginetica warm. Không tạo I_cold 20%; Cold ghi N/A, OOV bị loại không phải tập cold 20%. Mở rộng cold chỉ sau mốc cuối.

**Một seed có đủ kết luận chắc chắn không?** Chỉ cho quan sát trong lần chạy này; chưa có kiểm định thống kê hay khoảng tin cậy qua nhiều seed.

## Ba câu hỏi bằng số liệu

- GRU4Rec: test MRR@20 0.16852 đến 0.17417; tăng tuyệt đối +0.00565, tương đối +3.35%.
- NARM: test MRR@20 0.17483 đến 0.18074; tăng tuyệt đối +0.00590, tương đối +3.38%.
- SASRec: test MRR@20 0.18416 đến 0.19151; tăng tuyệt đối +0.00735, tương đối +3.99%.

- All-seen: default SASRec > NARM > GRU4Rec; tuned SASRec > NARM > GRU4Rec.
- Warm: default SASRec > NARM > GRU4Rec; tuned SASRec > NARM > GRU4Rec.
- Long-tail: default SASRec > NARM > GRU4Rec; tuned SASRec > NARM > GRU4Rec.

- GRU4Rec: k đầu đạt 99% best cuối là 12; tăng valid từ k=6 đến k=12 là +0.00614.
- NARM: k đầu đạt 99% best cuối là 2; tăng valid từ k=6 đến k=12 là +0.00000.
- SASRec: k đầu đạt 99% best cuối là 7; tăng valid từ k=6 đến k=12 là +0.00574.

Mốc 99% tính post-hoc theo đúng thứ tự manifest, không phải quy tắc dừng online hay bảo đảm hội tụ.

## Phân công theo đề bài

Khung tham khảo dưới đây cần nhóm xác nhận theo người thực sự làm; không coi là lịch sử đóng góp đã được xác minh.

| Vai trò trong đề | Phần việc |
| --- | --- |
| Nguyễn Tuấn Anh (SV1) | Search space và thí nghiệm GRU4Rec/SASRec, đối chiếu cấu hình |
| Mai Hoàng Anh (SV2) | Search space và thí nghiệm NARM, phân tích đường cong ngân sách |
| Cùng làm | Kiểm tra dữ liệu/metric, so sánh thứ hạng, báo cáo và slide |

Nếu làm cá nhân, ghi rõ một người thực hiện toàn bộ. Điền tên/mã SV/lớp trong btl_t10_profile.json rồi chạy lại phần xuất báo cáo.