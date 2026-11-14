const fs = require('fs');
const path = require('path');
const out = __dirname;
const models = [
 {name:'GRU4Rec', base:[.3512,.1776,.4238,.1827], tuned:[.3786,.1954,.4521,.2006], budget:[.1990,.2040,.2080,.2100]},
 {name:'NARM', base:[.3729,.1908,.4487,.1960], tuned:[.4013,.2116,.4764,.2167], budget:[.2110,.2180,.2220,.2250]},
 {name:'SASRec', base:[.3895,.2023,.4628,.2073], tuned:[.4237,.2268,.4956,.2319], budget:[.2080,.2240,.2330,.2390]},
];
const fmt=n=>n.toFixed(4).replace('.',',');
const pct=n=>n.toFixed(2).replace('.',',')+'%';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const blocks=[];
const h=(title)=>blocks.push({type:'h',title});
const p=(text)=>blocks.push({type:'p',text});
const table=(caption,heads,rows)=>blocks.push({type:'table',caption,heads,rows});
h('Tóm tắt');
p('Báo cáo trình bày bài toán dự đoán sản phẩm kế tiếp trong phiên mua sắm trên phần dữ liệu Ý của Amazon-M2, tập trung vào ba thuật toán GRU4Rec, NARM và SASRec. Mục tiêu là mô tả một quy trình đánh giá đầy đủ và minh họa cách phân tích tác động của tinh chỉnh siêu tham số đến chất lượng, thứ hạng mô hình và hiệu quả của ngân sách tìm kiếm.');
p('Trạng thái dữ liệu: file BTL_T10_AmazonM2.html ban đầu ghi rõ chưa có kết quả huấn luyện Amazon-M2 của nhóm và còn cần file sessions_train.csv. Toàn bộ điểm mô hình, đường cong ngân sách và các mức cải thiện trong báo cáo này là số liệu mô phỏng được tạo để hoàn thiện cấu trúc báo cáo. Không có quá trình huấn luyện, tinh chỉnh hay đánh giá test thực tế nào được thực hiện trong lần biên soạn này.');
p('Trong kịch bản minh họa, SASRec có MRR@20 cao nhất sau tinh chỉnh, đạt 0,2319; NARM đạt 0,2167 và GRU4Rec đạt 0,2006. MRR@20 tăng tương đối lần lượt 11,87%, 10,56% và 9,80%. Đây là các phép tính trên bảng số liệu giả định, không phải bằng chứng về chất lượng thực tế của các thuật toán trên Amazon-M2.');
h('1. Đặt vấn đề và mục tiêu');
p('Gợi ý theo phiên sử dụng chuỗi sản phẩm đã tương tác trong một phiên để xếp hạng các sản phẩm có thể được xem tiếp theo. Bài toán phù hợp với tình huống không có lịch sử người dùng dài hạn. Với prefix S = [i₁, i₂, …, iₜ], mô hình trả về danh sách K sản phẩm có điểm dự đoán cao nhất cho vị trí t + 1.');
p('Báo cáo đặt ra ba câu hỏi: (RQ1) tinh chỉnh cải thiện bao nhiêu so với cấu hình tham chiếu; (RQ2) thứ hạng GRU4Rec, NARM và SASRec có thay đổi sau tinh chỉnh; (RQ3) khi ngân sách tăng từ 1 lên 3, 6 và 12 cấu hình, chất lượng validation còn tăng ở mức nào. Các câu trả lời trong phần kết quả chỉ mô tả kịch bản mô phỏng.');
h('2. Dữ liệu và phạm vi nghiên cứu');
p('Theo nội dung file HTML nguồn, Amazon-M2 là dữ liệu phiên mua sắm đa quốc gia dùng trong KDD Cup 2023. Báo cáo lựa chọn locale IT để minh họa quy trình ở quy mô nhỏ hơn bộ đầy đủ. Chỉ dùng mã sản phẩm và thứ tự tương tác; không sử dụng tiêu đề, thương hiệu, mô tả hoặc các thuộc tính văn bản. Các thống kê dưới đây được chép từ file nguồn, chưa được đếm lại từ dữ liệu thô trong lần biên soạn này.');
table('Bảng 1. Thống kê được nêu trong file HTML gốc', ['Phạm vi','Phiên train','Tương tác train','Sản phẩm','Tình trạng'], [
 ['Amazon-M2 toàn bộ','3.606.249','15.306.183','1.410.675','Số liệu tham khảo trong file nguồn'],
 ['Amazon-M2, Ý','126.925','464.851','50.461','Chưa kiểm đếm lại; file nguồn còn nêu mốc 48.788 từ trang cuộc thi'],
 ['Test công khai của Ý','27.984 phiên','Không đưa thêm số liệu','Không xác nhận ở đây','File nguồn ghi đã thống kê; không đồng nghĩa có nhãn test'],
]);
p('File nguồn ghi 59,2% phiên test của Ý có 2–3 sản phẩm trước đáp án, độ dài trung vị là 3; 41,1% phiên có lặp sản phẩm và 26,8% bước kế tiếp là sản phẩm đã xem. Đây là thống kê được báo lại từ tài liệu nội bộ, không phải thống kê mới của báo cáo. Phiên ngắn đặt ra hạn chế về ngữ cảnh; tương tác lặp là lý do cần giữ sản phẩm đã xem trong tập ứng viên.');
p('Amazon-M2 là thí nghiệm bổ sung: file nguồn lưu ý Mục 1.5 của đề T10 liệt kê Diginetica, Yoochoose và RetailRocket. Vì vậy kết quả Amazon-M2 cần được trình bày đúng phạm vi bổ sung; không dùng để khẳng định đã đáp ứng yêu cầu dữ liệu chính thức của đề. Amazon Beauty là một bộ dữ liệu khác và các điểm của nó không được chuyển sang Amazon-M2.');
h('3. Thiết kế tiền xử lý và chia tập');
p('Giao thức đề xuất bắt đầu bằng việc lọc locale IT, đọc prev_items theo đúng thứ tự và nối next_item nếu tập dữ liệu có nhãn. Không suy ra thứ tự giữa các phiên từ thứ tự dòng. Trước khi lọc sản phẩm hay sinh prefix, chia theo đơn vị phiên để tránh một phiên xuất hiện ở nhiều tập.');
table('Bảng 2. Phân chia dự kiến, chưa phải số sau tiền xử lý', ['Tập','Quy mô tham chiếu','Vai trò','Giới hạn'], [
 ['Train','Khoảng 114.200 phiên','Học trọng số và xây dựng từ điển item','Ước tính 90% của 126.925; chưa có số đếm chính thức'],
 ['Validation','Khoảng 12.700 phiên','Chọn siêu tham số và checkpoint','10% ngẫu nhiên theo phiên, seed 42'],
 ['Test','27.984 phiên công khai được nêu trong nguồn','Chỉ đánh giá khi có đáp án hoặc kênh chấm hợp lệ','Không mặc định hai tập test có nhãn và có thể gộp để tính metric'],
]);
p('Dùng train để đếm tần suất, giữ item xuất hiện ít nhất 5 lần, rồi loại các phiên còn dưới 2 item. Ánh xạ ID và mọi quyết định lọc được xác định từ train. Với validation và test có nhãn, bỏ item ngoài từ điển khỏi prefix, loại mẫu có prefix rỗng hoặc đáp án ngoài từ điển; đồng thời ghi lại số mẫu bị loại và tỷ lệ OOV. Chưa có số đếm sau lọc hoặc tỷ lệ OOV thực tế nên báo cáo không tự tạo các số liệu này.');
p('Trên train, mỗi vị trí hợp lệ sinh một cặp prefix → next-item; chỉ giữ tối đa 50 item cuối của prefix. Trên validation/test có nhãn, dùng một cặp prev_items → next_item cho mỗi phiên để không đếm một phiên nhiều lần. Nếu sau này dùng quy tắc sinh mọi prefix trên tập đánh giá, phải báo cáo thành một giao thức khác. Giữ các lượt xem lặp và không lọc item đã xem khỏi danh sách ứng viên.');
p('File nguồn mô tả hai tuần đầu làm train và tuần cuối làm test; việc xác nhận chính xác từng tệp thuộc mốc nào vẫn cần kiểm tra trên dữ liệu chính thức. Khi thiếu timestamp, validation ngẫu nhiên không bảo đảm cùng điều kiện như chia hoàn toàn theo thời gian. Đây là giới hạn cần giữ lại trong báo cáo thực nghiệm sau này.');
h('4. Ba thuật toán nghiên cứu');
table('Bảng 3. Đặc điểm mô hình', ['Thuật toán','Cách biểu diễn phiên','Siêu tham số cần khảo sát','Điểm cần kiểm chứng'], [
 ['GRU4Rec','GRU cập nhật trạng thái theo thứ tự tương tác','Embedding, hidden size, số tầng, dropout, learning rate','Khả năng học tín hiệu chuyển tiếp và độ nhạy với learning rate'],
 ['NARM','Kết hợp biểu diễn tuần tự toàn cục và attention lên các trạng thái','Embedding, hidden size, dropout, learning rate','Attention có giúp chọn tương tác liên quan trong phiên hay không'],
 ['SASRec','Self-attention có causal mask và biểu diễn vị trí','Embedding, số block, số head, dropout, learning rate','Hiệu quả trên phiên ngắn và mức phụ thuộc vào cấu hình'],
]);
p('Khác biệt kiến trúc cung cấp cơ sở đặt giả thuyết, không tự chứng minh mô hình nào tốt hơn. Nếu SASRec có điểm cao hơn trong một lần chạy thực tế, vẫn cần kiểm tra nhiều seed, cùng cách lọc dữ liệu và cùng tập ứng viên trước khi kết luận rộng hơn.');
h('5. Giao thức đánh giá và tìm kiếm siêu tham số');
p('Thiết lập dự kiến dùng RecBole 1.2.1 để thống nhất triển khai, seed huấn luyện 42, prefix tối đa 50 và Adam với batch size 256. Huấn luyện tối đa 100 epoch, đánh giá validation sau mỗi epoch và early stopping khi MRR@20 không tăng trong 10 lần đánh giá. Đây là cấu hình đề xuất để chạy lại, không phải môi trường đã được sử dụng để tạo các điểm mô phỏng.');
table('Bảng 4. Không gian tìm kiếm đề xuất', ['Nhóm tham số','Giá trị ứng viên','Áp dụng'], [
 ['Learning rate','0,0003; 0,001; 0,003','Cả ba mô hình'],
 ['Embedding dimension','64; 128','Cả ba mô hình'],
 ['Hidden size','64; 128','GRU4Rec và NARM'],
 ['Số tầng GRU','1; 2','GRU4Rec'],
 ['Dropout','0,1; 0,2; 0,3','Ánh xạ sang các trường dropout tương ứng của từng mô hình'],
 ['Số attention block / head','Block: 1; 2 — Head: 2; 4','SASRec; embedding phải chia hết cho số head'],
]);
p('So sánh một cấu hình tham chiếu với 12 cấu hình random search riêng cho mỗi mô hình; tổng cộng là 3 lượt tham chiếu và 36 lượt tìm kiếm. Ghi lại phiên bản thư viện, cấu hình đầy đủ và thứ tự trial trước khi chạy. Cấu hình tham chiếu là cấu hình thư viện với các tham số giao thức chung được ghi rõ; trong tài liệu này, nhãn “tham chiếu” chỉ tên vai trò mô phỏng, chưa gắn với một resolved config đã chạy. Không có winner config thực tế để công bố.');
p('Chọn checkpoint và cấu hình bằng validation MRR@20, hòa điểm thì ưu tiên trial có chỉ số nhỏ hơn. Sau khi chốt cấu hình mới đánh giá test của cấu hình tham chiếu và cấu hình đã chọn. Không chọn trial bằng test. Ngân sách tính bằng số cấu hình nên không thể suy ra công bằng về thời gian, FLOPs hay chi phí GPU.');
p('Chấm theo full-sort trên toàn bộ item thuộc từ điển train, loại padding, giữ item đã xem và không lấy mẫu negative khi tính metric. Với một đáp án đúng cho mỗi mẫu, HR@K bằng Recall@K và được tính bằng trung bình của I(rank ≤ K). MRR@K = (1/N) × Σ I(rank ≤ K)/rank. Báo cáo HR@10, MRR@10, HR@20 và MRR@20 trên thang [0,1]. Các con số minh họa không được tính từ danh sách dự đoán thực.');
h('6. Kết quả mô phỏng của ba thuật toán');
table('Bảng 5. TOÀN BỘ SỐ LIỆU MÔ PHỎNG — điểm test giả định', ['Mô hình','Cấu hình','HR@10','MRR@10','HR@20','MRR@20'], models.flatMap(m=>[
 [m.name,'Tham chiếu (mô phỏng)',...m.base.map(fmt)], [m.name,'Sau tuning (mô phỏng)',...m.tuned.map(fmt)]
]));
p('Trong bảng minh họa, SASRec đứng đầu cả bốn metric ở hai chế độ. Sau tinh chỉnh, HR@20 của SASRec là 0,4956, có thể diễn giải trong kịch bản giả định là khoảng 49,56% mẫu có đáp án trong 20 gợi ý đầu. MRR@20 bằng 0,2319 phản ánh thứ hạng của đáp án trên toàn bộ mẫu, bao gồm các mẫu không có đáp án ở top 20; không được lấy nghịch đảo của MRR để gọi là thứ hạng trung bình.');
table('Bảng 6. Mức thay đổi tính từ số liệu mô phỏng', ['Mô hình','ΔHR@20 (điểm phần trăm)','Tăng HR@20 tương đối','ΔMRR@20 (điểm metric)','Tăng MRR@20 tương đối'], models.map(m=>[
 m.name,((m.tuned[2]-m.base[2])*100).toFixed(2).replace('.',','),pct((m.tuned[2]/m.base[2]-1)*100),fmt(m.tuned[3]-m.base[3]),pct((m.tuned[3]/m.base[3]-1)*100)
]));
p('RQ1: trong kịch bản mô phỏng, cả ba mô hình đều cải thiện sau tuning. Mức tăng tương đối được tính bằng (điểm tuning − điểm tham chiếu)/điểm tham chiếu × 100%. Ví dụ, SASRec tăng MRR@20 từ 0,2073 lên 0,2319, chênh 0,0246 điểm metric và tăng tương đối 11,87%. Không nhầm 0,0246 với mức tăng tương đối 2,46%.');
p('RQ2: thứ hạng test giả định không thay đổi: SASRec > NARM > GRU4Rec trước và sau tuning. Khoảng cách MRR@20 giữa SASRec và NARM tăng từ 0,0113 lên 0,0152. Điều này chỉ cho thấy bảng minh họa được xây dựng với thứ hạng ổn định; nó không xác nhận thứ hạng thực tế trên Amazon-M2.');
h('7. Ảnh hưởng của ngân sách tìm kiếm — mô phỏng');
table('Bảng 7. MRR@20 validation tốt nhất trong k trial đầu, hoàn toàn mô phỏng', ['Mô hình','1 cấu hình','3 cấu hình','6 cấu hình','12 cấu hình'], models.map(m=>[m.name,...m.budget.map(fmt)]));
p('Bảng 7 là best-so-far trên validation, không phải điểm test theo ngân sách. Từng hàng không giảm khi tăng số trial vì luôn giữ cấu hình tốt nhất đã thấy. Ngân sách 1 là trial đầu của random search, không phải điểm của cấu hình tham chiếu ở Bảng 5. Không đưa ra kết luận từ việc so trực tiếp điểm validation ở đây với điểm test giả định ở phần trước.');
p('RQ3: mức tăng có xu hướng nhỏ dần trong kịch bản minh họa. Từ 6 lên 12 trial, GRU4Rec tăng 0,0020 MRR@20, NARM tăng 0,0030 và SASRec tăng 0,0060. Riêng SASRec tăng 0,0160 từ 1 lên 3 trial, 0,0090 từ 3 lên 6 và 0,0060 từ 6 lên 12. Chưa thể gọi là hội tụ hoặc xác định ngân sách tối ưu nếu chỉ có bốn mốc giả định.');
p('Ở ngân sách 1, NARM có validation MRR@20 cao hơn SASRec (0,2110 so với 0,2080); từ ngân sách 3, SASRec vượt lên. Ví dụ này minh họa vì sao một trial có thể dẫn đến thứ hạng khác với tìm kiếm rộng hơn. Sự thay đổi trên validation theo ngân sách không mâu thuẫn với thứ hạng test trước/sau tuning ở mục 6 vì hai bảng mô tả các phép so sánh khác nhau.');
h('8. Thảo luận và đối chiếu tài liệu nguồn');
p('Một giả thuyết cần kiểm chứng là self-attention của SASRec có thể khai thác quan hệ giữa các sản phẩm hiệu quả hơn trong một số cấu hình; NARM có thể hưởng lợi từ attention để chọn ngữ cảnh; GRU4Rec có thể phù hợp với tín hiệu chuyển tiếp tuần tự. Những giải thích này là giả thuyết kiến trúc, không phải nguyên nhân đã được xác định từ các số liệu mô phỏng. Muốn kiểm tra cần thêm ablation hoặc phân tích lỗi trên dự đoán thật.');
p('File HTML gốc trích bảng kết quả của tác giả Amazon-M2 ở top 100, có Popularity, NARM và GRU4Rec++. Báo cáo này không chuyển các điểm đó thành kết quả của nhóm: GRU4Rec++ không đồng nhất với GRU4Rec, @100 không đồng nhất với @20 và cách chấm chưa được xác nhận là cùng giao thức. Vì vậy không tính phần trăm vượt bài báo hoặc gán điểm SASRec từ một bộ dữ liệu khác.');
p('Popularity vẫn là baseline nên bổ sung khi chạy thật, đặc biệt vì dữ liệu có sản phẩm phổ biến và hành vi lặp. Chưa có điểm Popularity theo giao thức của nhóm, nên không thể kết luận ba mô hình học sâu vượt baseline này. Không suy ra độ ổn định, ý nghĩa thống kê, tốc độ huấn luyện hoặc hiệu quả triển khai từ bảng điểm giả định.');
h('9. Giới hạn và điều kiện thay bằng kết quả thực');
p('Giới hạn lớn nhất là toàn bộ điểm thuật toán được mô phỏng. Báo cáo chưa có checkpoint Amazon-M2, log huấn luyện, metric tính từ dự đoán, số mẫu sau lọc, tỷ lệ OOV, thời gian chạy hoặc kiểm định theo nhiều seed. Các thống kê dữ liệu là nội dung kế thừa từ file HTML nguồn và còn tồn tại khác biệt về số item của Ý.');
p('Để chuyển sang báo cáo thực nghiệm, cần lấy dữ liệu hợp lệ có nhãn, xác nhận cách dùng từng tập test, chạy tiền xử lý và lưu fingerprint/số đếm; sau đó chạy cấu hình tham chiếu cùng 36 trial đã cố định, chọn winner bằng validation rồi chấm test. Lưu log, resolved config, checkpoint và dự đoán cho từng mô hình. Chạy thêm nhiều seed nếu muốn báo cáo trung bình, độ lệch chuẩn hay phát biểu về độ ổn định. Chỉ sau đó mới thay các bảng mô phỏng và cập nhật toàn bộ kết luận tương ứng.');
h('10. Kết luận');
p('Báo cáo đã hoàn thiện cấu trúc đánh giá GRU4Rec, NARM và SASRec trên Amazon-M2, từ mục tiêu, đặc điểm dữ liệu, tiền xử lý, chia tập đến metric, tìm kiếm siêu tham số và phân tích kết quả. Trong kịch bản minh họa, SASRec đạt MRR@20 cao nhất 0,2319, thứ hạng test giữ nguyên sau tuning và lợi ích của tìm kiếm giảm dần theo các mốc ngân sách. Những nhận xét này là kết luận nội bộ của bộ số liệu mô phỏng và cần được thay bằng bằng chứng thực nghiệm trước khi sử dụng như kết quả nghiên cứu.');
h('Nguồn và tài liệu đối chiếu');
p('[1] BTL_T10_AmazonM2.html trong thư mục dự án — nguồn trực tiếp cho mô tả dữ liệu, trạng thái chưa chạy và phạm vi thí nghiệm. Các thống kê được ghi là “theo file nguồn” chưa được kiểm chứng lại ở lần biên soạn này.');
p('[2] Jin và cộng sự, Amazon-M2, NeurIPS 2023, arXiv:2307.09688 — tài liệu được file HTML gốc dẫn lại; cần đọc bản gốc khi xác nhận số liệu và giao thức.');
p('[3] BTL_T10.ipynb và output/btl_t10/BTL_T10_BaoCao.md — tài liệu nội bộ về giao thức Diginetica và ba câu hỏi tuning; kết quả của các bộ khác không được coi là kết quả Amazon-M2.');
p('[4] amazon_m2_simulated_metrics.csv và amazon_m2_simulated_budget.csv đi kèm — dữ liệu minh họa do mã build_report.cjs tạo; trường data_status luôn là simulated. Không phải log đầu ra từ mô hình.');

const title='BÁO CÁO BTL-T10: GRU4Rec, NARM và SASRec trên Amazon-M2';
const disclosure='BẢN MÔ PHỎNG — các điểm thuật toán được tạo để minh họa, chưa có kết quả huấn luyện Amazon-M2 thực tế.';
const mdtable=b=>`**${b.caption}**\n\n| ${b.heads.join(' | ')} |\n| ${b.heads.map(()=> '---').join(' | ')} |\n${b.rows.map(r=>'| '+r.join(' | ')+' |').join('\n')}`;
const md=`# ${title}\n\n> ${disclosure}\n\nThực hiện: Nguyễn Tuấn Anh; Mai Hoàng Anh\n\nNgày biên soạn: 07/11/2026\n\n`+blocks.map(b=>b.type==='h'?'## '+b.title:b.type==='p'?b.text:mdtable(b)).join('\n\n')+'\n';
const htmlblocks=blocks.map((b,i)=>b.type==='h'?`<h2 id="s${i}">${esc(b.title)}</h2>`:b.type==='p'?`<p>${esc(b.text)}</p>`:`<div class="table-wrap"><table><caption>${esc(b.caption)}</caption><thead><tr>${b.heads.map(x=>'<th>'+esc(x)+'</th>').join('')}</tr></thead><tbody>${b.rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`).join('\n');
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Amazon-M2 — Báo cáo mô phỏng BTL-T10</title><style>
:root{--ink:#16243c;--accent:#324ca0;--line:#d8e0ed}*{box-sizing:border-box}body{margin:0;background:#eef2f8;color:var(--ink);font:17px/1.75 'Segoe UI',Arial,sans-serif}main{max-width:1120px;margin:36px auto;background:white;padding:64px 70px;box-shadow:0 8px 40px #14213d12}header{border-bottom:3px solid var(--accent);padding-bottom:28px;margin-bottom:30px}.eyebrow{color:var(--accent);font-weight:700;letter-spacing:.12em;font-size:13px}h1{font-size:34px;line-height:1.3;margin:14px 0 20px}h2{font-size:25px;line-height:1.35;margin:40px 0 15px;color:#233c7b}p{margin:14px 0;text-align:justify}.notice{border-left:5px solid #bd791a;background:#fff3dc;padding:15px 20px;font-weight:600}.meta{font-size:15px;color:#59667b}.table-wrap{overflow:auto;margin:24px 0}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.55}caption{text-align:left;font-weight:650;padding-bottom:10px;color:#233c7b}th{background:#eaf0fb;color:#1e3777;text-align:left}td,th{border:1px solid var(--line);padding:11px 12px;vertical-align:top}tbody tr:nth-child(even){background:#f7f9fc}nav{border-bottom:1px solid var(--line);padding-bottom:22px}nav a{display:inline-block;color:#324ca0;margin:4px 14px 4px 0;font-size:14px}footer{border-top:1px solid var(--line);margin-top:36px;padding-top:16px;font-size:13px;color:#59667b}button{padding:9px 16px;border:1px solid var(--line);background:white;color:var(--accent);cursor:pointer;font:inherit;font-size:14px}a{color:#324ca0}@media(max-width:760px){main{margin:0;padding:28px 20px}h1{font-size:27px}h2{font-size:23px}}@media print{@page{size:A4;margin:17mm}body{background:white;font-size:11pt;line-height:1.5}main{padding:0;margin:0;box-shadow:none;max-width:none}h1{font-size:23pt}h2{font-size:16pt;break-after:avoid}nav,button{display:none}table{font-size:9pt}tr{break-inside:avoid}thead{display:table-header-group}.table-wrap{overflow:visible}p{orphans:3;widows:3}}
</style></head><body><main><header><div class="eyebrow">ĐỒ ÁN 3 · GỢI Ý THEO PHIÊN</div><h1>${title}</h1><p class="meta">Nguyễn Tuấn Anh · Mai Hoàng Anh<br>Giảng viên theo file nguồn: PGS.TS. Nguyễn Văn Hậu<br>Ngày biên soạn: 07/11/2026</p><div class="notice">${disclosure}</div></header><nav>${blocks.map((b,i)=>b.type==='h'?`<a href="#s${i}">${esc(b.title)}</a>`:'').join('')}<br><button onclick="window.print()">In / Lưu PDF</button></nav>${htmlblocks}<footer>Báo cáo biên soạn từ BTL_T10_AmazonM2.html. Số liệu thuật toán: mô phỏng. File nguồn được giữ nguyên.</footer></main></body></html>`;
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'BTL_T10_AmazonM2_BaoCao_MoPhong.md'),md);
fs.writeFileSync(path.join(out,'BTL_T10_AmazonM2_BaoCao_MoPhong.html'),html);
fs.writeFileSync(path.join(out,'amazon_m2_simulated_metrics.csv'),'data_status,model,configuration,HR@10,MRR@10,HR@20,MRR@20\n'+models.flatMap(m=>['base','tuned'].map(c=>['simulated',m.name,c,...m[c].map(n=>n.toFixed(4))].join(','))).join('\n')+'\n');
fs.writeFileSync(path.join(out,'amazon_m2_simulated_budget.csv'),'data_status,model,budget,best_validation_MRR@20\n'+models.flatMap(m=>m.budget.map((v,i)=>['simulated',m.name,[1,3,6,12][i],v.toFixed(4)].join(','))).join('\n')+'\n');
for(const m of models){
 for(const a of [m.base,m.tuned]){if(!(a[1]<=a[0]&&a[0]<=a[2]&&a[1]<=a[3]&&a[3]<=a[2]))throw Error('Metric consistency');const dh=a[2]-a[0],dm=a[3]-a[1];if(dm<dh/20-1e-8||dm>dh/11+1e-8)throw Error('Rank interval inconsistency');}
 if(m.budget.some((v,i,a)=>i>0&&v<a[i-1]))throw Error('Budget consistency');
}
console.log(JSON.stringify({files:fs.readdirSync(out),sections:blocks.filter(b=>b.type==='h').length,tables:blocks.filter(b=>b.type==='table').length,metricChecks:'passed'},null,2));
