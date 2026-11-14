const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'BTL_T10_AmazonM2.html'),'utf8');
const sections=[...source.matchAll(/<section class="slide[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
const state={updated:'07/11/2026',models:[
 {name:'GRU4Rec',base:[.3624,.1832,.4368,.1883],tuned:[.3907,.2025,.4652,.2076],budget:[.203,.210,.214,.217]},
 {name:'NARM',base:[.3841,.1976,.4583,.2027],tuned:[.4145,.2194,.4897,.2246],budget:[.219,.227,.231,.234]},
 {name:'SASRec',base:[.4018,.2104,.4766,.2156],tuned:[.4389,.2361,.5127,.2412],budget:[.216,.233,.242,.248]}
]};
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
const additions=`
<section class="slide" id="results"><div class="head"><p class="eyebrow">6. Kết quả GRU4Rec, NARM và SASRec · Amazon-M2, Ý</p><h2>Kết quả trước và sau tinh chỉnh</h2></div>
<p>Bảng điểm phân tích trên Amazon-M2, locale IT. Mỗi mẫu có một sản phẩm đáp án nên HR@K tương đương Recall@K. Các chỉ số dùng thang [0,1].</p>
<div id="metrics"></div><div class="key" id="resultSummary"></div>
<p class="src">Nguồn điểm: bộ số liệu tự nhập để dựng báo cáo, chưa xác nhận bằng log huấn luyện Amazon-M2. Ngày chỉnh sửa: <span class="updated"></span>.</p></section>
<section class="slide" id="gains"><div class="head"><p class="eyebrow">7. Phân tích tác động của tinh chỉnh · Amazon-M2, Ý</p><h2>Mức cải thiện và thứ hạng mô hình</h2></div>
<div id="gainTable"></div><div id="analysis"></div><div class="key">Tăng tương đối = (điểm sau − điểm trước) / điểm trước × 100%. Thứ hạng sử dụng MRR@20; các mô hình bằng điểm được xếp đồng hạng.</div></section>
<section class="slide" id="budgets"><div class="head"><p class="eyebrow">8. Ngân sách tìm kiếm · Amazon-M2, Ý</p><h2>MRR@20 validation theo số cấu hình</h2></div>
<div id="budgetTable"></div><p id="budgetSummary"></p><div class="key">Đây là điểm validation tốt nhất trong k cấu hình đầu, không phải điểm test. Điểm tốt nhất tích lũy phải không giảm khi tăng ngân sách. Ngân sách 1 là trial tìm kiếm đầu tiên, không phải cấu hình mặc định.</div></section>`;
const editor=`<aside id="editor" hidden><div class="edit-head"><h2>Tùy chỉnh số liệu Amazon-M2</h2><button id="closeEditor">Đóng</button></div>
<p>Nhập số trong khoảng 0–1. Dùng dấu chấm hoặc dấu phẩy thập phân. Các mục dữ liệu, tiền xử lý và bảng của tác giả được giữ nguyên theo HTML gốc.</p>
<label>Ngày chỉnh sửa <input id="updated" type="text" maxlength="30"></label>
<h3>Điểm của ba thuật toán</h3><div id="metricInputs" class="scroll"></div>
<h3>MRR@20 validation tốt nhất theo ngân sách</h3><div id="budgetInputs" class="scroll"></div>
<p id="error" role="alert"></p><div class="actions"><button id="apply">Áp dụng số liệu</button><button id="save">Lưu HTML đã chỉnh</button><button id="csv">Xuất CSV</button><button id="reset">Khôi phục bộ điểm ban đầu</button></div>
<p class="editor-note">Các điểm điền sẵn là số liệu giả định. Đổi giá trị không đồng nghĩa đã chạy huấn luyện; không chuyển điểm từ Amazon Beauty hoặc bộ dữ liệu khác sang Amazon-M2.</p></aside>`;
const runtime=String.raw`
const initial=JSON.parse(document.getElementById('report-data').textContent);
let state=structuredClone(initial);
const original=JSON.parse(document.getElementById('default-data').textContent);
const el=id=>document.getElementById(id);
const f=n=>n.toFixed(4).replace('.',',');
const pct=n=>n.toFixed(2).replace('.',',')+'%';
const growth=(a,b)=>a===0?'Không xác định':pct((b-a)/a*100);
const table=(heads,rows)=>'<table><thead><tr>'+heads.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
function ranking(key){return state.models.slice().sort((a,b)=>b[key][3]-a[key][3]).map((m,i,a)=>(i?(a[i-1][key][3]===m[key][3]?' = ':' > '):'')+m.name).join('');}
function render(){
 el('metrics').innerHTML=table(['Mô hình','Cấu hình','HR@10','MRR@10','HR@20','MRR@20'],state.models.flatMap(m=>[[''+m.name,'Tham chiếu',...m.base.map(f)],[m.name,'Tinh chỉnh',...m.tuned.map(f)]]));
 const top=state.models.reduce((a,b)=>a.tuned[3]>=b.tuned[3]?a:b);const tied=state.models.filter(m=>m.tuned[3]===top.tuned[3]);
 el('resultSummary').textContent='MRR@20 sau tinh chỉnh cao nhất: '+tied.map(m=>m.name).join(', ')+' — '+f(top.tuned[3])+'.';
 el('gainTable').innerHTML=table(['Mô hình','ΔHR@20 (điểm %)','Tăng HR@20 tương đối','ΔMRR@20','Tăng MRR@20 tương đối'],state.models.map(m=>[m.name,((m.tuned[2]-m.base[2])*100).toFixed(2).replace('.',','),growth(m.base[2],m.tuned[2]),f(m.tuned[3]-m.base[3]),growth(m.base[3],m.tuned[3])]));
 el('analysis').innerHTML='<p><b>Thứ hạng trước tinh chỉnh:</b> '+ranking('base')+'.</p><p><b>Thứ hạng sau tinh chỉnh:</b> '+ranking('tuned')+'.</p><p>'+state.models.map(m=>m.name+': MRR@20 '+(m.tuned[3]>m.base[3]?'tăng':m.tuned[3]<m.base[3]?'giảm':'giữ nguyên')+' từ '+f(m.base[3])+' lên '+f(m.tuned[3])+'.').join(' ')+'</p>';
 el('budgetTable').innerHTML=table(['Mô hình','1 cấu hình','3 cấu hình','6 cấu hình','12 cấu hình'],state.models.map(m=>[m.name,...m.budget.map(f)]));
 el('budgetSummary').textContent='Từ 6 lên 12 cấu hình: '+state.models.map(m=>m.name+' tăng '+f(m.budget[3]-m.budget[2])+' MRR@20').join('; ')+'. Các mức tăng này mô tả bộ số liệu đang chọn; chưa đủ để khẳng định đã hội tụ.';
 document.querySelectorAll('.updated').forEach(n=>n.textContent=state.updated);
}
function fill(){
 el('updated').value=state.updated;
 el('metricInputs').innerHTML=table(['Mô hình','Cấu hình','HR@10','MRR@10','HR@20','MRR@20'],state.models.flatMap((m,i)=>['base','tuned'].map(k=>[m.name,k==='base'?'Tham chiếu':'Tinh chỉnh',...m[k].map((v,j)=>'<input aria-label="'+m.name+' '+k+' '+['HR10','MRR10','HR20','MRR20'][j]+'" data-i="'+i+'" data-k="'+k+'" data-j="'+j+'" inputmode="decimal" value="'+v.toFixed(4)+'">')])));
 el('budgetInputs').innerHTML=table(['Mô hình','1 cấu hình','3 cấu hình','6 cấu hình','12 cấu hình'],state.models.map((m,i)=>[m.name,...m.budget.map((v,j)=>'<input aria-label="'+m.name+' budget '+[1,3,6,12][j]+'" data-i="'+i+'" data-k="budget" data-j="'+j+'" inputmode="decimal" value="'+v.toFixed(4)+'">')]));
}
function validate(s){
 for(const m of s.models){for(const k of ['base','tuned','budget'])if(m[k].some(v=>!Number.isFinite(v)||v<0||v>1))throw Error(m.name+': tất cả điểm phải nằm trong [0,1].');
 for(const k of ['base','tuned']){const [h10,r10,h20,r20]=m[k];if(r10>h10||h10>h20||r10>r20||r20>h20)throw Error(m.name+': cần MRR@K ≤ HR@K và chỉ số @20 ≥ @10.');const dh=h20-h10,dr=r20-r10;if(dr<dh/20-.00011||dr>dh/11+.00011)throw Error(m.name+': chênh MRR giữa @10/@20 không khớp chênh HR (xét thứ hạng 11–20).');}
 if(m.budget.some((v,i,a)=>i>0&&v<a[i-1]))throw Error(m.name+': validation tốt nhất tích lũy không được giảm theo ngân sách.');
 }return s;
}
function apply(){try{const next=structuredClone(state);document.querySelectorAll('#editor input[data-i]').forEach(n=>{if(!n.value.trim())throw Error('Không để trống điểm.');next.models[+n.dataset.i][n.dataset.k][+n.dataset.j]=Number(n.value.trim().replace(',','.'));});next.updated=el('updated').value.trim();validate(next);state=next;render();el('error').textContent='Đã cập nhật các bảng và nhận xét.';el('error').style.color='#24643e';return true;}catch(e){el('error').textContent=e.message;el('error').style.color='#a52929';return false;}}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
el('edit').onclick=()=>{fill();el('editor').hidden=false;};el('closeEditor').onclick=()=>el('editor').hidden=true;el('apply').onclick=apply;
el('reset').onclick=()=>{state=structuredClone(original);fill();render();el('error').textContent='Đã khôi phục bộ điểm ban đầu.';};
el('save').onclick=()=>{if(!apply())return;const clone=document.documentElement.cloneNode(true);clone.querySelector('#report-data').textContent=JSON.stringify(state).replaceAll('<','\u003c');clone.querySelector('#editor').hidden=true;clone.querySelector('#error').textContent='';download('BTL_T10_AmazonM2_BaoCao_TuyChinh.html','<!doctype html>\n'+clone.outerHTML,'text/html;charset=utf-8');};
el('csv').onclick=()=>{if(!apply())return;const rows=['dataset,data_source,model,configuration,HR10,MRR10,HR20,MRR20'];state.models.forEach(m=>['base','tuned'].forEach(k=>rows.push(['Amazon-M2 IT','user_entered_unverified',m.name,k,...m[k]].join(','))));download('AmazonM2_KetQua.csv','\uFEFF'+rows.join('\r\n'),'text/csv;charset=utf-8');};
validate(state);render();
if(new URLSearchParams(location.search).has('check')){try{const saved=structuredClone(state);state.models[0].tuned=[.65,.35,.75,.36];render();if(!el('resultSummary').textContent.includes('GRU4Rec'))throw Error('Ranking');state=saved;render();const bad=structuredClone(state);bad.models[0].budget=[.5,.4,.3,.2];let caught=false;try{validate(bad)}catch{caught=true}if(!caught)throw Error('Validation');fill();el('editor').hidden=false;if(!apply())throw Error('Apply');el('editor').hidden=true;document.body.dataset.check='passed';}catch(e){document.body.dataset.check='failed: '+e.message;}}
`;
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Amazon-M2 — Báo cáo tùy chỉnh kết quả</title><style>'+css+`
html,body{height:auto;overflow:auto;background:#e6ebf3}#stage{position:static;transform:none;width:min(1280px,100%);margin:35px auto}.slide{scroll-margin-top:76px;position:relative;display:flex;width:100%;height:auto;min-height:660px;margin-bottom:26px;padding:45px 55px;overflow:visible}.src{position:static;margin-top:20px}.key{margin-top:20px}h1{font-size:50px}h2{font-size:34px}#toolbar{position:sticky;top:0;z-index:20;padding:10px 24px;background:#14213d;color:white;display:flex;align-items:center;gap:12px;flex-wrap:wrap}#toolbar a{color:#e8ecff}button{border:1px solid #bac4db;border-radius:5px;background:white;color:#14213d;padding:9px 13px;cursor:pointer;font:inherit;font-size:14px}#editor{position:fixed;z-index:100;inset:28px;overflow:auto;padding:25px;background:#fff;box-shadow:0 0 0 100vmax #14213d99;border-radius:10px}#editor[hidden]{display:none}.edit-head{display:flex;align-items:center;justify-content:space-between;gap:20px}#editor h2{font-size:28px}#editor h3{margin:24px 0 10px}#editor p{font-size:15px;margin:14px 0}#editor label{display:block;font-size:15px}#editor input{padding:8px;border:1px solid #b4bfd4;border-radius:4px;font:inherit;width:115px}#editor label input{width:180px}#editor table{font-size:14px}.scroll{overflow:auto}.actions{display:flex;gap:10px;flex-wrap:wrap}.editor-note{color:#58657a}#error{min-height:24px}#results td,#gains td,#budgets td{padding:12px 10px}#metrics,#gainTable,#budgetTable{overflow:auto}@media(max-width:800px){.slide{padding:28px 22px;min-height:0}.grid,.steps{display:block}.card,.step{margin:10px 0}h1{font-size:34px}h2{font-size:27px}#stage{margin:16px auto}#editor{inset:10px;padding:16px}.slide>div[style*="grid"]{display:block!important}}@media print{#toolbar,#editor{display:none!important}#stage{width:100%;margin:0}.slide{page-break-after:always;break-after:page;margin:0;min-height:0;width:100%;height:auto;padding:32px 42px}.src{position:static}h1{font-size:44px}h2{font-size:31px}}
` + '</style></head><body><div id="toolbar"><strong>Amazon-M2 · Báo cáo kết quả</strong><button id="edit">Tùy chỉnh số liệu</button><a href="#results">Bảng kết quả</a><a href="#gains">Mức cải thiện</a><a href="#budgets">Ngân sách</a><button onclick="window.print()">In / Lưu PDF</button></div><main id="stage">'+sections.slice(0,7).join('\n')+additions+'</main>'+editor+'<script type="application/json" id="report-data">'+JSON.stringify(state)+'</script><script type="application/json" id="default-data">'+JSON.stringify(state)+'</script><script>'+runtime+'</script></body></html>';
fs.writeFileSync(path.join(root,'BTL_T10_AmazonM2_BaoCao_TuyChinh.html'),html);
const preserved=[...html.matchAll(/<section class="slide[^>]*>[\s\S]*?<\/section>/g)].slice(0,7).map(m=>m[0]);
if(JSON.stringify(preserved)!==JSON.stringify(sections.slice(0,7)))throw Error('Original Amazon sections changed');
console.log(JSON.stringify({file:'BTL_T10_AmazonM2_BaoCao_TuyChinh.html',originalAmazonSectionsUnchanged:7,newResultSections:3,sourceFileUnchanged:true}));
