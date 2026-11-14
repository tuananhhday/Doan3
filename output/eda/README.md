# Biểu đồ dữ liệu BTL-T10

Các ảnh được tạo từ Diginetica thật, cùng split và quy tắc tiền xử lý của notebook `BTL_T10_Tuan1_Modal_H100.ipynb`.

- `00_tong_quan_du_lieu.png`: bảng tổng quan 9 biểu đồ.
- `01_phien_theo_thoi_gian.png`: số phiên theo ngày; đường đứt là ranh giới train/valid/test.
- `02_do_dai_phien.png`: số phiên theo độ dài trên thang log; cột cuối gộp độ dài từ 31 trở lên.
- `03_nhom_do_dai_phien.png`: nhóm 2–3, 4–5, 6–10, >10 click.
- `04_do_pho_bien_item.png`: tương tác của item trong train, sắp theo tần suất, hai trục log.
- `05_ty_le_chia_tap.png`: số phiên và tỉ lệ của ba tập trước lọc train-core.
- `06_mau_giu_va_loai.png`: tỉ lệ target hợp lệ, target ngoài vocabulary và prefix rỗng.
- `07_nhom_target_test.png`: mẫu test giữ lại thuộc Warm/Long-tail.
- `08_do_dai_prefix.png`: phân bố input sau xử lý, tối đa 50 item.
- `09_category.png`: 10 category có nhiều item duy nhất trong vocabulary train nhất.

`eda_stats.json`, `thong_ke_split.csv` và `phien_theo_ngay.csv` cung cấp số liệu để kiểm tra hoặc vẽ lại. `bieu_do_du_lieu.zip` đóng gói ảnh và số liệu.

Lưu ý: phân bố phiên dùng dữ liệu sau làm sạch và trước lọc train-core. Phân bố prefix/target dùng mẫu sau tiền xử lý. Số tương tác item được đếm trên train trước augmentation. Khi vẽ nhóm Warm/Long-tail, không thay đổi tập ứng viên của evaluator. Đây là biểu đồ dữ liệu, không phải kết quả đánh giá mô hình.
