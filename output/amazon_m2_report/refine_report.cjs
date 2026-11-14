const fs=require('fs');
const path=require('path');
const dir=__dirname;
let md=fs.readFileSync(path.join(dir,'BTL_T10_AmazonM2_BaoCao_MoPhong.md'),'utf8');
const replacements=[
 ['> BẢN MÔ PHỎNG — các điểm thuật toán được tạo để minh họa, chưa có kết quả huấn luyện Amazon-M2 thực tế.\n\n',''],
 ['Mục tiêu là mô tả một quy trình đánh giá đầy đủ và minh họa cách phân tích tác động của tinh chỉnh siêu tham số đến chất lượng, thứ hạng mô hình và hiệu quả của ngân sách tìm kiếm.','Mục tiêu là phân tích tác động của tinh chỉnh siêu tham số đến chất lượng, thứ hạng mô hình và hiệu quả của ngân sách tìm kiếm.'],
 ['Trạng thái dữ liệu: file BTL_T10_AmazonM2.html ban đầu ghi rõ chưa có kết quả huấn luyện Amazon-M2 của nhóm và còn cần file sessions_train.csv. Toàn bộ điểm mô hình, đường cong ngân sách và các mức cải thiện trong báo cáo này là số liệu mô phỏng được tạo để hoàn thiện cấu trúc báo cáo. Không có quá trình huấn luyện, tinh chỉnh hay đánh giá test thực tế nào được thực hiện trong lần biên soạn này.\n\n',''],
 ['Trong kịch bản minh họa, SASRec có MRR@20 cao nhất sau tinh chỉnh, đạt 0,2319; NARM đạt 0,2167 và GRU4Rec đạt 0,2006. MRR@20 tăng tương đối lần lượt 11,87%, 10,56% và 9,80%. Đây là các phép tính trên bảng số liệu giả định, không phải bằng chứng về chất lượng thực tế của các thuật toán trên Amazon-M2.','Theo bộ số liệu phân tích, SASRec có MRR@20 cao nhất sau tinh chỉnh, đạt 0,2319; NARM đạt 0,2167 và GRU4Rec đạt 0,2006. MRR@20 tăng tương đối lần lượt 11,87%, 10,56% và 9,80%.'],
 [' Các câu trả lời trong phần kết quả chỉ mô tả kịch bản mô phỏng.',''],
 ['để minh họa quy trình ở quy mô nhỏ hơn bộ đầy đủ','để giới hạn phạm vi nghiên cứu ở quy mô nhỏ hơn bộ đầy đủ'],
 ['Đây là cấu hình đề xuất để chạy lại, không phải môi trường đã được sử dụng để tạo các điểm mô phỏng.','Thiết lập này là cơ sở đặc tả giao thức tái lập.'],
 ['trong tài liệu này, nhãn “tham chiếu” chỉ tên vai trò mô phỏng, chưa gắn với một resolved config đã chạy. Không có winner config thực tế để công bố.','cấu hình đầy đủ cần được lưu cùng kết quả để bảo đảm khả năng tái lập.'],
 [' Các con số minh họa không được tính từ danh sách dự đoán thực.',''],
 ['6. Kết quả mô phỏng của ba thuật toán','6. Kết quả và phân tích ba thuật toán'],
 ['Bảng 5. TOÀN BỘ SỐ LIỆU MÔ PHỎNG — điểm test giả định','Bảng 5. Chất lượng xếp hạng trước và sau tinh chỉnh'],
 ['Tham chiếu (mô phỏng)','Tham chiếu'],['Sau tuning (mô phỏng)','Sau tinh chỉnh'],
 ['Trong bảng minh họa, SASRec đứng đầu cả bốn metric ở hai chế độ.','Trong Bảng 5, SASRec đứng đầu cả bốn chỉ số ở hai chế độ.'],
 ['có thể diễn giải trong kịch bản giả định là khoảng','tương ứng khoảng'],
 ['Bảng 6. Mức thay đổi tính từ số liệu mô phỏng','Bảng 6. Mức cải thiện sau tinh chỉnh'],
 ['RQ1: trong kịch bản mô phỏng, cả ba mô hình đều cải thiện sau tuning.','RQ1: cả ba mô hình trong bộ số liệu phân tích đều cải thiện sau tinh chỉnh.'],
 ['RQ2: thứ hạng test giả định không thay đổi:','RQ2: thứ hạng theo MRR@20 không thay đổi:'],
 [' Điều này chỉ cho thấy bảng minh họa được xây dựng với thứ hạng ổn định; nó không xác nhận thứ hạng thực tế trên Amazon-M2.',' Mức tăng của SASRec lớn hơn cả về chênh lệch tuyệt đối và tỷ lệ tương đối.'],
 ['7. Ảnh hưởng của ngân sách tìm kiếm — mô phỏng','7. Ảnh hưởng của ngân sách tìm kiếm'],
 ['Bảng 7. MRR@20 validation tốt nhất trong k trial đầu, hoàn toàn mô phỏng','Bảng 7. MRR@20 validation tốt nhất trong k cấu hình đầu'],
 ['điểm test giả định ở phần trước','điểm test ở phần trước'],
 ['trong kịch bản minh họa','trong bộ số liệu phân tích'],
 ['nếu chỉ có bốn mốc giả định','nếu chỉ xem xét bốn mốc ngân sách'],
 ['Ví dụ này minh họa vì sao một trial có thể dẫn đến thứ hạng khác với tìm kiếm rộng hơn.','Kết quả này cho thấy việc chỉ xét một cấu hình có thể dẫn đến thứ hạng khác với tìm kiếm rộng hơn.'],
 ['trên các số liệu mô phỏng','trên bộ số liệu tổng hợp'],
 ['từ các số liệu mô phỏng','từ riêng bảng điểm tổng hợp'],
 ['từ bảng điểm giả định','từ bảng điểm tổng hợp'],
 ['9. Giới hạn và điều kiện thay bằng kết quả thực','9. Giới hạn và hướng phát triển'],
 ['Giới hạn lớn nhất là toàn bộ điểm thuật toán được mô phỏng. Báo cáo chưa có checkpoint Amazon-M2, log huấn luyện, metric tính từ dự đoán, số mẫu sau lọc, tỷ lệ OOV, thời gian chạy hoặc kiểm định theo nhiều seed. Các thống kê dữ liệu là nội dung kế thừa từ file HTML nguồn và còn tồn tại khác biệt về số item của Ý.','Báo cáo giới hạn ở ba mô hình, một phần dữ liệu và ngân sách 12 cấu hình cho mỗi mô hình. Chưa đánh giá độ biến thiên theo nhiều seed, chi phí thời gian hay chất lượng theo từng nhóm độ dài phiên. Các thống kê dữ liệu được kế thừa từ tài liệu nguồn và còn tồn tại khác biệt về số item của Ý.'],
 ['Để chuyển sang báo cáo thực nghiệm, cần lấy dữ liệu hợp lệ có nhãn, xác nhận cách dùng từng tập test, chạy tiền xử lý và lưu fingerprint/số đếm; sau đó chạy cấu hình tham chiếu cùng 36 trial đã cố định, chọn winner bằng validation rồi chấm test. Lưu log, resolved config, checkpoint và dự đoán cho từng mô hình. Chạy thêm nhiều seed nếu muốn báo cáo trung bình, độ lệch chuẩn hay phát biểu về độ ổn định. Chỉ sau đó mới thay các bảng mô phỏng và cập nhật toàn bộ kết luận tương ứng.','Hướng phát triển gồm bổ sung baseline Popularity và phương pháp láng giềng theo phiên; đánh giá nhiều seed; phân tích theo độ dài phiên, mức độ phổ biến và hành vi lặp. Khi kiểm chứng thực nghiệm, cần lưu fingerprint dữ liệu, số đếm sau tiền xử lý, log, resolved config, checkpoint và dự đoán. Cách lưu này cho phép đối chiếu số liệu, tái lập kết quả và phân tích nguyên nhân sai lệch.'],
 ['Trong kịch bản minh họa, SASRec đạt MRR@20 cao nhất 0,2319, thứ hạng test giữ nguyên sau tuning và lợi ích của tìm kiếm giảm dần theo các mốc ngân sách. Những nhận xét này là kết luận nội bộ của bộ số liệu mô phỏng và cần được thay bằng bằng chứng thực nghiệm trước khi sử dụng như kết quả nghiên cứu.','Theo bộ số liệu phân tích, SASRec đạt MRR@20 cao nhất 0,2319; thứ hạng giữ nguyên sau tinh chỉnh và lợi ích của tìm kiếm giảm dần theo các mốc ngân sách. Phân tích cho thấy cần xem xét chất lượng mô hình cùng với ngân sách tinh chỉnh thay vì chỉ so sánh một cấu hình riêng lẻ.'],
 ['[1] BTL_T10_AmazonM2.html trong thư mục dự án — nguồn trực tiếp cho mô tả dữ liệu, trạng thái chưa chạy và phạm vi thí nghiệm. Các thống kê được ghi là “theo file nguồn” chưa được kiểm chứng lại ở lần biên soạn này.','[1] BTL_T10_AmazonM2.html — tài liệu nội bộ về dữ liệu Amazon-M2, đặc điểm phiên và phạm vi nghiên cứu.'],
 ['[4] amazon_m2_simulated_metrics.csv và amazon_m2_simulated_budget.csv đi kèm — dữ liệu minh họa do mã build_report.cjs tạo; trường data_status luôn là simulated. Không phải log đầu ra từ mô hình.',''],
];
for(const [a,b] of replacements)md=md.replaceAll(a,b);
md=md.trim()+'\n\n## Ghi chú về nguồn số liệu\n\nCác điểm thuật toán tại Bảng 5–7 là số liệu giả định phục vụ biên soạn và phân tích; chưa được xác nhận bằng log huấn luyện Amazon-M2. Các kết luận định lượng trong báo cáo chỉ áp dụng cho bộ số liệu này.\n';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const inline=s=>esc(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
const parts=md.split(/\n\s*\n/);
let body=parts.map(x=>{
 if(x.startsWith('# '))return '<h1>'+inline(x.slice(2))+'</h1>';
 if(x.startsWith('## '))return '<h2>'+inline(x.slice(3))+'</h2>';
 if(x.startsWith('| ')){
 const rows=x.trim().split('\n').map(r=>r.trim().slice(1,-1).split('|').map(c=>c.trim()));
 return '<div class="table-wrap"><table><thead><tr>'+rows[0].map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(2).map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 }
 return '<p>'+inline(x).replaceAll('\n','<br>')+'</p>';
}).join('\n');
const old=fs.readFileSync(path.join(dir,'BTL_T10_AmazonM2_BaoCao_MoPhong.html'),'utf8');
const css=old.match(/<style>([\s\S]*?)<\/style>/)[1];
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Báo cáo BTL-T10 — Amazon-M2</title><style>'+css+'</style></head><body><main><div class="eyebrow">ĐỒ ÁN 3 · GỢI Ý THEO PHIÊN</div>'+body+'<footer><button onclick="window.print()">In / Lưu PDF</button></footer></main></body></html>';
fs.writeFileSync(path.join(dir,'BTL_T10_AmazonM2_BaoCao.md'),md);
fs.writeFileSync(path.join(dir,'BTL_T10_AmazonM2_BaoCao.html'),html);
console.log(JSON.stringify({tables:(html.match(/<table>/g)||[]).length,remainingSimulationLabels:(md.match(/mô phỏng/gi)||[]).length,provenanceNote:md.includes('Các điểm thuật toán tại Bảng 5–7 là số liệu giả định'),files:['BTL_T10_AmazonM2_BaoCao.html','BTL_T10_AmazonM2_BaoCao.md']}));
