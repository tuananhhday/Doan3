# BTL-T10 - Gói nộp

Mở BTL_T10_HoanChinh.ipynb bằng VS Code/Jupyter, chọn kernel Python 3.11 và chạy theo thứ tự.
Toàn bộ code nằm trong notebook; các module .btl_t10_runtime được notebook tự xuất khi chạy.
Các tuần 1-10 được ghi chú ngay trong notebook. Không cần ghép code từ các notebook cũ.

## Môi trường laptop

Tạo venv Python 3.11, rồi cài requirements-local.txt. Nếu chưa xác thực Modal, chạy
`python -m modal token new` trong terminal cùng môi trường. Không đưa token vào file nộp.
GPU chạy từ xa trên Modal H100, không yêu cầu laptop có NVIDIA GPU.
Điền tên/mã SV/lớp/giảng viên trong btl_t10_profile.json rồi chạy lại phần xuất báo cáo;
không cần train lại. File THUYET_TRINH_VA_VAN_DAP.md có câu hỏi ôn tập và khung phân công theo đề.

## Chạy và kiểm tra

- START_TRAINING=True: thực hiện các trial còn thiếu; dùng lại kết quả đã hoàn tất trên Volume.
- START_TRAINING=False: chỉ đọc/tải/phân tích kết quả có sẵn, không khởi chạy tuning.
- Notebook cuối mặc định START_TRAINING=False; các kết quả và biểu đồ đã được lưu trong notebook.
- RUN_UNTIL_WEEK=10: đủ 12 cấu hình/model, tổng 36; GPU_BUDGET_HOURS=5 là guard thời gian.
- Chọn bằng validation MRR@20; test sau khi đủ 36. Không chỉnh manifest sau khi xem test.
- Báo cáo PDF 12 trang, Markdown có thể sửa, slide HTML có nút sửa/lưu và bản PDF 15 trang.
- output/btl_t10/checkpoints/ chứa ba winner; các checkpoint còn lại giữ trên Volume btl-t10-week1.

## Tái lập

Dữ liệu raw không đóng gói: notebook tải từ URL và commit cố định, kiểm tra SHA-256.
raw_sources.json và data_report.json ghi nguồn, split, số mẫu, OOV và fingerprint.
configs/search/ ghi 36 overrides, seed, search spaces và checksum trước train.
all_trials.csv ghi mọi trial; default_vs_tuned.csv, metric_gains.csv, rank_changes.csv và
saturation.csv trả lời ba câu hỏi đề tài. baseline_results.json và final_state.json giữ số liệu gốc.
GPU image dùng Python 3.10, torch 2.5.1+cu124, RecBole 1.2.1, numpy 1.23.5 và pandas 1.5.3.
Mặc định là tham số kiến trúc/lr tham chiếu RecBole, còn epoch/batch/seed là giao thức chung.
Điểm bài báo trong tài liệu tham khảo không phải điểm tái lập của bài tập.

Không khẳng định ý nghĩa thống kê từ một seed. k đạt 99% là mô tả post-hoc, không phải
quy tắc dừng online. Ngân sách bằng số cấu hình, không phải bằng thời gian hay FLOPs.
