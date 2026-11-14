# BÁO CÁO BTL-T10: GRU4Rec, NARM và SASRec trên Amazon-M2

> BẢN MÔ PHỎNG — các điểm thuật toán được tạo để minh họa, chưa có kết quả huấn luyện Amazon-M2 thực tế.

Thực hiện: Nguyễn Tuấn Anh; Mai Hoàng Anh

Ngày biên soạn: 07/11/2026

## Tóm tắt

Báo cáo trình bày bài toán dự đoán sản phẩm kế tiếp trong phiên mua sắm trên phần dữ liệu Ý của Amazon-M2, tập trung vào ba thuật toán GRU4Rec, NARM và SASRec. Mục tiêu là mô tả một quy trình đánh giá đầy đủ và minh họa cách phân tích tác động của tinh chỉnh siêu tham số đến chất lượng, thứ hạng mô hình và hiệu quả của ngân sách tìm kiếm.

Trạng thái dữ liệu: file BTL_T10_AmazonM2.html ban đầu ghi rõ chưa có kết quả huấn luyện Amazon-M2 của nhóm và còn cần file sessions_train.csv. Toàn bộ điểm mô hình, đường cong ngân sách và các mức cải thiện trong báo cáo này là số liệu mô phỏng được tạo để hoàn thiện cấu trúc báo cáo. Không có quá trình huấn luyện, tinh chỉnh hay đánh giá test thực tế nào được thực hiện trong lần biên soạn này.

Trong kịch bản minh họa, SASRec có MRR@20 cao nhất sau tinh chỉnh, đạt 0,2319; NARM đạt 0,2167 và GRU4Rec đạt 0,2006. MRR@20 tăng tương đối lần lượt 11,87%, 10,56% và 9,80%. Đây là các phép tính trên bảng số liệu giả định, không phải bằng chứng về chất lượng thực tế của các thuật toán trên Amazon-M2.

## 1. Đặt vấn đề và mục tiêu

Gợi ý theo phiên sử dụng chuỗi sản phẩm đã tương tác trong một phiên để xếp hạng các sản phẩm có thể được xem tiếp theo. Bài toán phù hợp với tình huống không có lịch sử người dùng dài hạn. Với prefix S = [i₁, i₂, …, iₜ], mô hình trả về danh sách K sản phẩm có điểm dự đoán cao nhất cho vị trí t + 1.

Báo cáo đặt ra ba câu hỏi: (RQ1) tinh chỉnh cải thiện bao nhiêu so với cấu hình tham chiếu; (RQ2) thứ hạng GRU4Rec, NARM và SASRec có thay đổi sau tinh chỉnh; (RQ3) khi ngân sách tăng từ 1 lên 3, 6 và 12 cấu hình, chất lượng validation còn tăng ở mức nào. Các câu trả lời trong phần kết quả chỉ mô tả kịch bản mô phỏng.

## 2. Dữ liệu và phạm vi nghiên cứu

Theo nội dung file HTML nguồn, Amazon-M2 là dữ liệu phiên mua sắm đa quốc gia dùng trong KDD Cup 2023. Báo cáo lựa chọn locale IT để minh họa quy trình ở quy mô nhỏ hơn bộ đầy đủ. Chỉ dùng mã sản phẩm và thứ tự tương tác; không sử dụng tiêu đề, thương hiệu, mô tả hoặc các thuộc tính văn bản. Các thống kê dưới đây được chép từ file nguồn, chưa được đếm lại từ dữ liệu thô trong lần biên soạn này.

**Bảng 1. Thống kê được nêu trong file HTML gốc**

| Phạm vi | Phiên train | Tương tác train | Sản phẩm | Tình trạng |
| --- | --- | --- | --- | --- |
| Amazon-M2 toàn bộ | 3.606.249 | 15.306.183 | 1.410.675 | Số liệu tham khảo trong file nguồn |
| Amazon-M2, Ý | 126.925 | 464.851 | 50.461 | Chưa kiểm đếm lại; file nguồn còn nêu mốc 48.788 từ trang cuộc thi |
| Test công khai của Ý | 27.984 phiên | Không đưa thêm số liệu | Không xác nhận ở đây | File nguồn ghi đã thống kê; không đồng nghĩa có nhãn test |

File nguồn ghi 59,2% phiên test của Ý có 2–3 sản phẩm trước đáp án, độ dài trung vị là 3; 41,1% phiên có lặp sản phẩm và 26,8% bước kế tiếp là sản phẩm đã xem. Đây là thống kê được báo lại từ tài liệu nội bộ, không phải thống kê mới của báo cáo. Phiên ngắn đặt ra hạn chế về ngữ cảnh; tương tác lặp là lý do cần giữ sản phẩm đã xem trong tập ứng viên.

Amazon-M2 là thí nghiệm bổ sung: file nguồn lưu ý Mục 1.5 của đề T10 liệt kê Diginetica, Yoochoose và RetailRocket. Vì vậy kết quả Amazon-M2 cần được trình bày đúng phạm vi bổ sung; không dùng để khẳng định đã đáp ứng yêu cầu dữ liệu chính thức của đề. Amazon Beauty là một bộ dữ liệu khác và các điểm của nó không được chuyển sang Amazon-M2.

## 3. Thiết kế tiền xử lý và chia tập

Giao thức đề xuất bắt đầu bằng việc lọc locale IT, đọc prev_items theo đúng thứ tự và nối next_item nếu tập dữ liệu có nhãn. Không suy ra thứ tự giữa các phiên từ thứ tự dòng. Trước khi lọc sản phẩm hay sinh prefix, chia theo đơn vị phiên để tránh một phiên xuất hiện ở nhiều tập.

**Bảng 2. Phân chia dự kiến, chưa phải số sau tiền xử lý**

| Tập | Quy mô tham chiếu | Vai trò | Giới hạn |
| --- | --- | --- | --- |
| Train | Khoảng 114.200 phiên | Học trọng số và xây dựng từ điển item | Ước tính 90% của 126.925; chưa có số đếm chính thức |
| Validation | Khoảng 12.700 phiên | Chọn siêu tham số và checkpoint | 10% ngẫu nhiên theo phiên, seed 42 |
| Test | 27.984 phiên công khai được nêu trong nguồn | Chỉ đánh giá khi có đáp án hoặc kênh chấm hợp lệ | Không mặc định hai tập test có nhãn và có thể gộp để tính metric |

Dùng train để đếm tần suất, giữ item xuất hiện ít nhất 5 lần, rồi loại các phiên còn dưới 2 item. Ánh xạ ID và mọi quyết định lọc được xác định từ train. Với validation và test có nhãn, bỏ item ngoài từ điển khỏi prefix, loại mẫu có prefix rỗng hoặc đáp án ngoài từ điển; đồng thời ghi lại số mẫu bị loại và tỷ lệ OOV. Chưa có số đếm sau lọc hoặc tỷ lệ OOV thực tế nên báo cáo không tự tạo các số liệu này.

Trên train, mỗi vị trí hợp lệ sinh một cặp prefix → next-item; chỉ giữ tối đa 50 item cuối của prefix. Trên validation/test có nhãn, dùng một cặp prev_items → next_item cho mỗi phiên để không đếm một phiên nhiều lần. Nếu sau này dùng quy tắc sinh mọi prefix trên tập đánh giá, phải báo cáo thành một giao thức khác. Giữ các lượt xem lặp và không lọc item đã xem khỏi danh sách ứng viên.

File nguồn mô tả hai tuần đầu làm train và tuần cuối làm test; việc xác nhận chính xác từng tệp thuộc mốc nào vẫn cần kiểm tra trên dữ liệu chính thức. Khi thiếu timestamp, validation ngẫu nhiên không bảo đảm cùng điều kiện như chia hoàn toàn theo thời gian. Đây là giới hạn cần giữ lại trong báo cáo thực nghiệm sau này.

## 4. Ba thuật toán nghiên cứu

**Bảng 3. Đặc điểm mô hình**

| Thuật toán | Cách biểu diễn phiên | Siêu tham số cần khảo sát | Điểm cần kiểm chứng |
| --- | --- | --- | --- |
| GRU4Rec | GRU cập nhật trạng thái theo thứ tự tương tác | Embedding, hidden size, số tầng, dropout, learning rate | Khả năng học tín hiệu chuyển tiếp và độ nhạy với learning rate |
| NARM | Kết hợp biểu diễn tuần tự toàn cục và attention lên các trạng thái | Embedding, hidden size, dropout, learning rate | Attention có giúp chọn tương tác liên quan trong phiên hay không |
| SASRec | Self-attention có causal mask và biểu diễn vị trí | Embedding, số block, số head, dropout, learning rate | Hiệu quả trên phiên ngắn và mức phụ thuộc vào cấu hình |

Khác biệt kiến trúc cung cấp cơ sở đặt giả thuyết, không tự chứng minh mô hình nào tốt hơn. Nếu SASRec có điểm cao hơn trong một lần chạy thực tế, vẫn cần kiểm tra nhiều seed, cùng cách lọc dữ liệu và cùng tập ứng viên trước khi kết luận rộng hơn.

## 5. Giao thức đánh giá và tìm kiếm siêu tham số

Thiết lập dự kiến dùng RecBole 1.2.1 để thống nhất triển khai, seed huấn luyện 42, prefix tối đa 50 và Adam với batch size 256. Huấn luyện tối đa 100 epoch, đánh giá validation sau mỗi epoch và early stopping khi MRR@20 không tăng trong 10 lần đánh giá. Đây là cấu hình đề xuất để chạy lại, không phải môi trường đã được sử dụng để tạo các điểm mô phỏng.

**Bảng 4. Không gian tìm kiếm đề xuất**

| Nhóm tham số | Giá trị ứng viên | Áp dụng |
| --- | --- | --- |
| Learning rate | 0,0003; 0,001; 0,003 | Cả ba mô hình |
| Embedding dimension | 64; 128 | Cả ba mô hình |
| Hidden size | 64; 128 | GRU4Rec và NARM |
| Số tầng GRU | 1; 2 | GRU4Rec |
| Dropout | 0,1; 0,2; 0,3 | Ánh xạ sang các trường dropout tương ứng của từng mô hình |
| Số attention block / head | Block: 1; 2 — Head: 2; 4 | SASRec; embedding phải chia hết cho số head |

So sánh một cấu hình tham chiếu với 12 cấu hình random search riêng cho mỗi mô hình; tổng cộng là 3 lượt tham chiếu và 36 lượt tìm kiếm. Ghi lại phiên bản thư viện, cấu hình đầy đủ và thứ tự trial trước khi chạy. Cấu hình tham chiếu là cấu hình thư viện với các tham số giao thức chung được ghi rõ; trong tài liệu này, nhãn “tham chiếu” chỉ tên vai trò mô phỏng, chưa gắn với một resolved config đã chạy. Không có winner config thực tế để công bố.

Chọn checkpoint và cấu hình bằng validation MRR@20, hòa điểm thì ưu tiên trial có chỉ số nhỏ hơn. Sau khi chốt cấu hình mới đánh giá test của cấu hình tham chiếu và cấu hình đã chọn. Không chọn trial bằng test. Ngân sách tính bằng số cấu hình nên không thể suy ra công bằng về thời gian, FLOPs hay chi phí GPU.

Chấm theo full-sort trên toàn bộ item thuộc từ điển train, loại padding, giữ item đã xem và không lấy mẫu negative khi tính metric. Với một đáp án đúng cho mỗi mẫu, HR@K bằng Recall@K và được tính bằng trung bình của I(rank ≤ K). MRR@K = (1/N) × Σ I(rank ≤ K)/rank. Báo cáo HR@10, MRR@10, HR@20 và MRR@20 trên thang [0,1]. Các con số minh họa không được tính từ danh sách dự đoán thực.

## 6. Kết quả mô phỏng của ba thuật toán

**Bảng 5. TOÀN BỘ SỐ LIỆU MÔ PHỎNG — điểm test giả định**

| Mô hình | Cấu hình | HR@10 | MRR@10 | HR@20 | MRR@20 |
| --- | --- | --- | --- | --- | --- |
| GRU4Rec | Tham chiếu (mô phỏng) | 0,3512 | 0,1776 | 0,4238 | 0,1827 |
| GRU4Rec | Sau tuning (mô phỏng) | 0,3786 | 0,1954 | 0,4521 | 0,2006 |
| NARM | Tham chiếu (mô phỏng) | 0,3729 | 0,1908 | 0,4487 | 0,1960 |
| NARM | Sau tuning (mô phỏng) | 0,4013 | 0,2116 | 0,4764 | 0,2167 |
| SASRec | Tham chiếu (mô phỏng) | 0,3895 | 0,2023 | 0,4628 | 0,2073 |
| SASRec | Sau tuning (mô phỏng) | 0,4237 | 0,2268 | 0,4956 | 0,2319 |

Trong bảng minh họa, SASRec đứng đầu cả bốn metric ở hai chế độ. Sau tinh chỉnh, HR@20 của SASRec là 0,4956, có thể diễn giải trong kịch bản giả định là khoảng 49,56% mẫu có đáp án trong 20 gợi ý đầu. MRR@20 bằng 0,2319 phản ánh thứ hạng của đáp án trên toàn bộ mẫu, bao gồm các mẫu không có đáp án ở top 20; không được lấy nghịch đảo của MRR để gọi là thứ hạng trung bình.

**Bảng 6. Mức thay đổi tính từ số liệu mô phỏng**

| Mô hình | ΔHR@20 (điểm phần trăm) | Tăng HR@20 tương đối | ΔMRR@20 (điểm metric) | Tăng MRR@20 tương đối |
| --- | --- | --- | --- | --- |
| GRU4Rec | 2,83 | 6,68% | 0,0179 | 9,80% |
| NARM | 2,77 | 6,17% | 0,0207 | 10,56% |
| SASRec | 3,28 | 7,09% | 0,0246 | 11,87% |

RQ1: trong kịch bản mô phỏng, cả ba mô hình đều cải thiện sau tuning. Mức tăng tương đối được tính bằng (điểm tuning − điểm tham chiếu)/điểm tham chiếu × 100%. Ví dụ, SASRec tăng MRR@20 từ 0,2073 lên 0,2319, chênh 0,0246 điểm metric và tăng tương đối 11,87%. Không nhầm 0,0246 với mức tăng tương đối 2,46%.

RQ2: thứ hạng test giả định không thay đổi: SASRec > NARM > GRU4Rec trước và sau tuning. Khoảng cách MRR@20 giữa SASRec và NARM tăng từ 0,0113 lên 0,0152. Điều này chỉ cho thấy bảng minh họa được xây dựng với thứ hạng ổn định; nó không xác nhận thứ hạng thực tế trên Amazon-M2.

## 7. Ảnh hưởng của ngân sách tìm kiếm — mô phỏng

**Bảng 7. MRR@20 validation tốt nhất trong k trial đầu, hoàn toàn mô phỏng**

| Mô hình | 1 cấu hình | 3 cấu hình | 6 cấu hình | 12 cấu hình |
| --- | --- | --- | --- | --- |
| GRU4Rec | 0,1990 | 0,2040 | 0,2080 | 0,2100 |
| NARM | 0,2110 | 0,2180 | 0,2220 | 0,2250 |
| SASRec | 0,2080 | 0,2240 | 0,2330 | 0,2390 |

Bảng 7 là best-so-far trên validation, không phải điểm test theo ngân sách. Từng hàng không giảm khi tăng số trial vì luôn giữ cấu hình tốt nhất đã thấy. Ngân sách 1 là trial đầu của random search, không phải điểm của cấu hình tham chiếu ở Bảng 5. Không đưa ra kết luận từ việc so trực tiếp điểm validation ở đây với điểm test giả định ở phần trước.

RQ3: mức tăng có xu hướng nhỏ dần trong kịch bản minh họa. Từ 6 lên 12 trial, GRU4Rec tăng 0,0020 MRR@20, NARM tăng 0,0030 và SASRec tăng 0,0060. Riêng SASRec tăng 0,0160 từ 1 lên 3 trial, 0,0090 từ 3 lên 6 và 0,0060 từ 6 lên 12. Chưa thể gọi là hội tụ hoặc xác định ngân sách tối ưu nếu chỉ có bốn mốc giả định.

Ở ngân sách 1, NARM có validation MRR@20 cao hơn SASRec (0,2110 so với 0,2080); từ ngân sách 3, SASRec vượt lên. Ví dụ này minh họa vì sao một trial có thể dẫn đến thứ hạng khác với tìm kiếm rộng hơn. Sự thay đổi trên validation theo ngân sách không mâu thuẫn với thứ hạng test trước/sau tuning ở mục 6 vì hai bảng mô tả các phép so sánh khác nhau.

## 8. Thảo luận và đối chiếu tài liệu nguồn

Một giả thuyết cần kiểm chứng là self-attention của SASRec có thể khai thác quan hệ giữa các sản phẩm hiệu quả hơn trong một số cấu hình; NARM có thể hưởng lợi từ attention để chọn ngữ cảnh; GRU4Rec có thể phù hợp với tín hiệu chuyển tiếp tuần tự. Những giải thích này là giả thuyết kiến trúc, không phải nguyên nhân đã được xác định từ các số liệu mô phỏng. Muốn kiểm tra cần thêm ablation hoặc phân tích lỗi trên dự đoán thật.

File HTML gốc trích bảng kết quả của tác giả Amazon-M2 ở top 100, có Popularity, NARM và GRU4Rec++. Báo cáo này không chuyển các điểm đó thành kết quả của nhóm: GRU4Rec++ không đồng nhất với GRU4Rec, @100 không đồng nhất với @20 và cách chấm chưa được xác nhận là cùng giao thức. Vì vậy không tính phần trăm vượt bài báo hoặc gán điểm SASRec từ một bộ dữ liệu khác.

Popularity vẫn là baseline nên bổ sung khi chạy thật, đặc biệt vì dữ liệu có sản phẩm phổ biến và hành vi lặp. Chưa có điểm Popularity theo giao thức của nhóm, nên không thể kết luận ba mô hình học sâu vượt baseline này. Không suy ra độ ổn định, ý nghĩa thống kê, tốc độ huấn luyện hoặc hiệu quả triển khai từ bảng điểm giả định.

## 9. Giới hạn và điều kiện thay bằng kết quả thực

Giới hạn lớn nhất là toàn bộ điểm thuật toán được mô phỏng. Báo cáo chưa có checkpoint Amazon-M2, log huấn luyện, metric tính từ dự đoán, số mẫu sau lọc, tỷ lệ OOV, thời gian chạy hoặc kiểm định theo nhiều seed. Các thống kê dữ liệu là nội dung kế thừa từ file HTML nguồn và còn tồn tại khác biệt về số item của Ý.

Để chuyển sang báo cáo thực nghiệm, cần lấy dữ liệu hợp lệ có nhãn, xác nhận cách dùng từng tập test, chạy tiền xử lý và lưu fingerprint/số đếm; sau đó chạy cấu hình tham chiếu cùng 36 trial đã cố định, chọn winner bằng validation rồi chấm test. Lưu log, resolved config, checkpoint và dự đoán cho từng mô hình. Chạy thêm nhiều seed nếu muốn báo cáo trung bình, độ lệch chuẩn hay phát biểu về độ ổn định. Chỉ sau đó mới thay các bảng mô phỏng và cập nhật toàn bộ kết luận tương ứng.

## 10. Kết luận

Báo cáo đã hoàn thiện cấu trúc đánh giá GRU4Rec, NARM và SASRec trên Amazon-M2, từ mục tiêu, đặc điểm dữ liệu, tiền xử lý, chia tập đến metric, tìm kiếm siêu tham số và phân tích kết quả. Trong kịch bản minh họa, SASRec đạt MRR@20 cao nhất 0,2319, thứ hạng test giữ nguyên sau tuning và lợi ích của tìm kiếm giảm dần theo các mốc ngân sách. Những nhận xét này là kết luận nội bộ của bộ số liệu mô phỏng và cần được thay bằng bằng chứng thực nghiệm trước khi sử dụng như kết quả nghiên cứu.

## Nguồn và tài liệu đối chiếu

[1] BTL_T10_AmazonM2.html trong thư mục dự án — nguồn trực tiếp cho mô tả dữ liệu, trạng thái chưa chạy và phạm vi thí nghiệm. Các thống kê được ghi là “theo file nguồn” chưa được kiểm chứng lại ở lần biên soạn này.

[2] Jin và cộng sự, Amazon-M2, NeurIPS 2023, arXiv:2307.09688 — tài liệu được file HTML gốc dẫn lại; cần đọc bản gốc khi xác nhận số liệu và giao thức.

[3] BTL_T10.ipynb và output/btl_t10/BTL_T10_BaoCao.md — tài liệu nội bộ về giao thức Diginetica và ba câu hỏi tuning; kết quả của các bộ khác không được coi là kết quả Amazon-M2.

[4] amazon_m2_simulated_metrics.csv và amazon_m2_simulated_budget.csv đi kèm — dữ liệu minh họa do mã build_report.cjs tạo; trường data_status luôn là simulated. Không phải log đầu ra từ mô hình.
