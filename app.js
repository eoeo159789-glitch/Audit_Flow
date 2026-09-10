const KEY="auditflow_v2_offline";
// ---- AI 分析（Gemini API，BYOK：金鑰只存在使用者自己的瀏覽器） ----
const GEMINI_KEY_STORAGE="auditflow_gemini_api_key";
const GEMINI_MODEL="gemini-3.8-flash"; // 若 Google 更新模型名稱，改這裡即可
const GEMINI_ENDPOINT="https://generativelanguage.googleapis.com/v1beta/interactions";
const $=s=>document.querySelector(s), uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let data=load(),activeCaseId=null,modalContext=null,tgSelectedId=null,planFilterName=null,aiSelectedIssueId=null,aiChatId=null,aiChatHistory=[];
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem("auditflow_offline_v1"));if(d?.cases)return d}catch(e){}return{cases:[]}}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function active(){return data.cases.find(x=>x.id===activeCaseId)||data.cases[0]}
function toast(t){let e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function empty(t){return `<div class="empty">${t}</div>`}
function riskClass(r){return r==="高"?"high":r==="中"?"medium":"low"}
function ensureCase(){if(!data.cases.length)data.cases.push({id:uid(),name:"我的第一個審計案件",number:"",agency:"",period:"",status:"進行中",events:[],issues:[],findings:[],evidence:[],procedures:[],planEvents:[]});data.cases.forEach(c=>{["events","issues","findings","evidence","procedures","attachments","planEvents"].forEach(k=>c[k]??=[])});activeCaseId||=data.cases[0].id}
function renderSelector(){let a=active();$("#caseSelector").innerHTML=data.cases.map(c=>`<option value="${c.id}" ${c.id===a.id?"selected":""}>${esc(c.name)}</option>`).join("")}
function renderDashboard(){let c=active(),issues=c.issues,events=c.events;$("#statEvents").textContent=events.length;$("#statIssues").textContent=issues.length;$("#statHigh").textContent=issues.filter(i=>i.risk==="高").length;$("#statOpen").textContent=issues.filter(i=>i.status!=="已結案").length;
$("#caseInfo").innerHTML=[["案件名稱",c.name],["案件編號",c.number||"—"],["受查單位",c.agency||"—"],["查核期間",c.period||"—"],["案件狀態",`<span class="badge ${c.status==="進行中"?"open":"closed"}">${esc(c.status)}</span>`]].map(x=>`<div class="info-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
let recent=[...events].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);$("#recentEvents").innerHTML=recent.length?recent.map(e=>`<div class="compact-item"><strong>${esc(e.title)}</strong><small>${esc(e.date)}　${esc(e.category||"一般")}</small></div>`).join(""):empty("尚無大事記紀錄");
let h=issues.filter(i=>i.risk==="高").length,m=issues.filter(i=>i.risk==="中").length,l=issues.filter(i=>i.risk==="低").length,t=Math.max(issues.length,1);$("#riskSummary").innerHTML=`<div class="meta-line"><span>🔴 高 ${h}</span><span>🟡 中 ${m}</span><span>🟢 低 ${l}</span></div><div class="risk-bar"><div class="r-high" style="width:${h/t*100}%"></div><div class="r-medium" style="width:${m/t*100}%"></div><div class="r-low" style="width:${l/t*100}%"></div></div>`;
let op=issues.filter(i=>i.status!=="已結案");$("#followups").innerHTML=op.length?op.map(i=>`<div class="compact-item"><strong>${esc(i.title)}</strong><small><span class="badge ${riskClass(i.risk)}">${i.risk}風險</span>　${esc(i.status)}</small></div>`).join(""):empty("目前沒有待追蹤問題")}
function renderTimeline(){let list=[...active().events].sort((a,b)=>b.date.localeCompare(a.date));$("#timelineList").innerHTML=list.length?list.map(e=>`<article class="timeline-item"><div class="item-meta">${esc(e.date)}｜${esc(e.category)}｜重要性：${esc(e.importance)}</div><strong>${esc(e.title)}</strong><p>${esc(e.description)}</p><div class="item-actions"><button onclick="editEvent('${e.id}')">編輯</button><button onclick="deleteItem('events','${e.id}')">刪除</button></div></article>`).join(""):empty("尚無紀錄")}
function renderIssues(){let c=active(),list=c.issues;$("#issueList").innerHTML=list.length?list.map(i=>{let whys=[1,2,3,4,5].filter(n=>i["why"+n]).map(n=>`<div class="why-row"><b>Why ${n}</b><span>${esc(i["why"+n])}</span></div>`).join("");let cats=["人員","制度","流程","法規","預算","資料","管理","其他"].filter(x=>i["fish_"+x]).map(x=>`<span class="badge open">${esc(x)}：${esc(i["fish_"+x])}</span>`).join("");return `<article class="issue-card"><div class="meta-line"><span class="badge ${riskClass(i.risk)}">${esc(i.risk)}風險</span><span class="badge ${i.status==="已結案"?"closed":"open"}">${esc(i.status)}</span></div><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p><div class="analysis-box"><h4>5 Why 分析</h4>${whys||"尚未填寫"}<h4>根本原因</h4><div class="root-cause">${esc(i.rootCause||"尚未填寫")}</div>${cats?`<h4>魚骨分析</h4><div class="relation">${cats}</div>`:""}</div><div class="item-actions"><button onclick="editIssue('${i.id}')">編輯</button><button onclick="deleteItem('issues','${i.id}')">刪除</button></div></article>`}).join(""):empty("尚無問題分析資料")}
function renderFindings(){let list=active().findings;$("#findingList").innerHTML=list.length?list.map(f=>{let issue=active().issues.find(i=>i.id===f.issueId);return `<article class="finding">${issue?`<div class="issue-ref">關聯問題：${esc(issue.title)}</div>`:""}<h3>${esc(f.title)}</h3><dl><dt>問題描述</dt><dd>${esc(f.problem)}</dd><dt>查核方法／證據</dt><dd>${esc(f.evidence)}</dd><dt>法規或依據</dt><dd>${esc(f.basis)}</dd><dt>改善建議</dt><dd>${esc(f.recommendation)}</dd></dl><div class="item-actions"><button onclick="editFinding('${f.id}')">編輯</button><button onclick="deleteItem('findings','${f.id}')">刪除</button></div></article>`}).join(""):empty("尚無查核發現")}
function issueOptions(value=""){return `<option value="">未關聯問題</option>`+active().issues.map(i=>`<option value="${i.id}" ${i.id===value?"selected":""}>${esc(i.title)}</option>`).join("")}
function renderEvidence(){let list=active().evidence;$("#evidenceList").innerHTML=list.length?list.map(e=>{let issue=active().issues.find(i=>i.id===e.issueId);return `<article class="finding"><div class="meta-line"><strong>${esc(e.code)}</strong><span class="badge open">${esc(e.type)}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="issue-ref">關聯問題：${issue?esc(issue.title):"未設定"}</div><div class="item-actions"><button onclick="editEvidence('${e.id}')">編輯</button><button onclick="deleteItem('evidence','${e.id}')">刪除</button></div></article>`}).join(""):empty("尚無證據資料")}
function renderProcedures(){let list=active().procedures;$("#procedureList").innerHTML=list.length?list.map(p=>{let issue=active().issues.find(i=>i.id===p.issueId);return `<article class="finding"><div class="meta-line"><span class="badge ${p.status==="已完成"?"low":p.status==="執行中"?"medium":"open"}">${esc(p.status)}</span><span class="issue-ref">${issue?esc(issue.title):"未關聯問題"}</span></div><h3>${esc(p.title)}</h3><dl><dt>查核目的</dt><dd>${esc(p.objective)}</dd><dt>查核程序</dt><dd>${esc(p.steps)}</dd><dt>所需資料</dt><dd>${esc(p.documents)}</dd><dt>查核結果</dt><dd>${esc(p.result)}</dd></dl><div class="item-actions"><button onclick="editProcedure('${p.id}')">編輯</button><button onclick="deleteItem('procedures','${p.id}')">刪除</button></div></article>`}).join(""):empty("尚無查核程序")}
function renderWorkpaper(){let c=active(), html=`<div class="wp-title"><h2>審計工作底稿</h2><div>${esc(c.name)}</div></div><div class="wp-section"><h3>一、案件基本資料</h3><table class="wp-table"><tr><th>案件編號</th><td>${esc(c.number)}</td><th>受查單位</th><td>${esc(c.agency)}</td></tr><tr><th>查核期間</th><td colspan="3">${esc(c.period)}</td></tr></table></div>`;c.issues.forEach((i,n)=>{let ev=c.evidence.filter(e=>e.issueId===i.id),ps=c.procedures.filter(p=>p.issueId===i.id);html+=`<div class="wp-section"><h3>問題 ${n+1}：${esc(i.title)}</h3><h4>問題描述</h4><div class="wp-text">${esc(i.description)}</div><h4>5 Why 根本原因分析</h4>${[1,2,3,4,5].filter(x=>i["why"+x]).map(x=>`<div>Why ${x}：${esc(i["why"+x])}</div>`).join("")}<div class="root-cause"><b>根本原因：</b>${esc(i.rootCause)}</div><h4>查核程序</h4><table class="wp-table"><tr><th>程序</th><th>狀態</th><th>結果</th></tr>${ps.map(p=>`<tr><td>${esc(p.steps)}</td><td>${esc(p.status)}</td><td>${esc(p.result)}</td></tr>`).join("")||"<tr><td colspan='3'>尚無資料</td></tr>"}</table><h4>相關證據</h4><table class="wp-table"><tr><th>編號</th><th>名稱</th><th>說明</th></tr>${ev.map(e=>`<tr><td>${esc(e.code)}</td><td>${esc(e.title)}</td><td>${esc(e.description)}</td></tr>`).join("")||"<tr><td colspan='3'>尚無資料</td></tr>"}</table></div>`});$("#workpaperContent").innerHTML=html}

let relationIssueId=null;
function fileIcon(type){return type?.startsWith("image/")?"🖼️":type?.includes("pdf")?"📕":type?.includes("word")?"📘":type?.includes("sheet")?"📗":"📎"}
function renderAttachments(){
 let list=active().attachments||[];
 $("#attachmentList").innerHTML=list.length?list.map(a=>{
   let target = active().issues.find(x=>x.id===a.issueId)?.title || active().evidence.find(x=>x.id===a.evidenceId)?.title || active().procedures.find(x=>x.id===a.procedureId)?.title || "未關聯";
   return `<article class="attachment-card"><div class="file-icon">${fileIcon(a.type)}</div><h3>${esc(a.name)}</h3><div class="file-meta">類型：${esc(a.type||"未知")}<br>大小：${esc(a.sizeText||"")}<br>關聯：${esc(target)}</div><div class="attachment-actions"><button onclick="downloadAttachment('${a.id}')">下載／開啟</button><button onclick="editAttachment('${a.id}')">編輯</button><button onclick="deleteItem('attachments','${a.id}')">刪除</button></div></article>`
 }).join(""):empty("尚未上傳附件資料");
}
function renderRelations(){
 let c=active(), issues=c.issues||[];
 if(!issues.length){$("#relationControls").innerHTML="";$("#relationGraph").innerHTML=empty("請先建立至少一個問題，才能顯示案件關聯圖。");return}
 relationIssueId = issues.some(i=>i.id===relationIssueId)?relationIssueId:issues[0].id;
 $("#relationControls").innerHTML=issues.map((i,n)=>`<button class="${i.id===relationIssueId?"active":""}" onclick="selectRelationIssue('${i.id}')">P-${String(n+1).padStart(3,"0")} ${esc(i.title)}</button>`).join("");
 let issue=issues.find(i=>i.id===relationIssueId), ps=c.procedures.filter(p=>p.issueId===issue.id), ev=c.evidence.filter(e=>e.issueId===issue.id);
 let findings=c.findings.filter(f=>[f.issueId,f.relatedIssueId].includes(issue.id));
 const nodes=(arr,cls,emptyText,fn)=>arr.length?arr.map(fn).join(""):`<div class="graph-node ${cls} empty">${emptyText}</div>`;
 $("#relationGraph").innerHTML=`<div class="graph-row">
 <div class="graph-col"><h4>問題</h4><div class="graph-node problem"><b>${esc(issue.title)}</b><br><small>${esc(issue.description||"")}</small></div></div>
 <div class="graph-arrow">→</div>
 <div class="graph-col"><h4>原因分析</h4><div class="graph-node root"><b>根本原因</b><br>${esc(issue.rootCause||"尚未填寫")}</div></div>
 <div class="graph-arrow">→</div>
 <div class="graph-col"><h4>查核程序</h4>${nodes(ps,"procedure","尚無關聯程序",p=>`<div class="graph-node procedure"><b>${esc(p.title)}</b><br><small>${esc(p.status)}｜${esc(p.result||"未填寫結果")}</small></div>`)}</div>
 <div class="graph-arrow">→</div>
 <div class="graph-col"><h4>證據</h4>${nodes(ev,"evidence","尚無關聯證據",e=>`<div class="graph-node evidence"><b>${esc(e.code)}</b><br><small>${esc(e.title)}</small></div>`)}</div>
 <div class="graph-arrow">→</div>
 <div class="graph-col"><h4>查核發現</h4>${nodes(findings,"finding","尚未關聯查核發現",f=>`<div class="graph-node finding"><b>${esc(f.title)}</b></div>`)}</div>
 </div>`;
}
window.selectRelationIssue=id=>{relationIssueId=id;renderRelations()}

// ---- 大事記：圖形化時間軸 ----
function renderTimelineGraph(){
 let wrap=$("#timelineGraph"),detail=$("#timelineGraphDetail");if(!wrap)return;
 let list=[...active().events].sort((a,b)=>a.date.localeCompare(b.date));
 if(!list.length){wrap.innerHTML=empty("尚無紀錄，請先新增大事記。");detail.innerHTML="";return}
 tgSelectedId=list.some(e=>e.id===tgSelectedId)?tgSelectedId:list[list.length-1].id;
 wrap.innerHTML=list.map(e=>`<div class="tg-node imp-${esc(e.importance||"中")}${e.id===tgSelectedId?" selected":""}" data-tgid="${e.id}"><div class="tg-dot"></div><div class="tg-date">${esc(e.date)}</div><div class="tg-card"><b>${esc(e.title)}</b>${esc(e.category||"")}</div></div>`).join("");
 let cur=list.find(x=>x.id===tgSelectedId);
 detail.innerHTML=cur?`<div class="item-meta">${esc(cur.date)}｜${esc(cur.category)}｜重要性：${esc(cur.importance)}</div><strong>${esc(cur.title)}</strong><p>${esc(cur.description)}</p><div class="item-actions"><button onclick="editEvent('${cur.id}')">編輯</button><button onclick="deleteItem('events','${cur.id}')">刪除</button></div>`:"";
}

// ---- 查核計畫大事記 ----
function planStatusClass(s){return s==="逾期"?"high":s==="待觀察"?"medium":s==="準時"?"low":"closed"}
function renderPlanEvents(){
 let listEl=$("#planEventList"),filterEl=$("#planFilter");if(!listEl)return;
 let all=active().planEvents||[];
 let names=[...new Set(all.map(x=>x.planName).filter(Boolean))];
 filterEl.innerHTML=names.length?[`<button class="${!planFilterName?"active":""}" data-plan="">全部計畫</button>`].concat(names.map(n=>`<button class="${planFilterName===n?"active":""}" data-plan="${esc(n)}">${esc(n)}</button>`)).join(""):"";
 let shown=(planFilterName?all.filter(x=>x.planName===planFilterName):all).slice().sort((a,b)=>b.date.localeCompare(a.date));
 listEl.innerHTML=shown.length?shown.map(e=>`<article class="timeline-item"><div class="item-meta">${esc(e.date)}｜${esc(e.planName||"未分類計畫")}${e.deadline?`｜預定期限：${esc(e.deadline)}`:""}</div><div class="meta-line" style="margin:6px 0"><span class="badge ${planStatusClass(e.status)}">${esc(e.status||"未設定")}</span></div><strong>${esc(e.content||"")}</strong>${e.issue?`<p><b>發現問題／備註：</b>${esc(e.issue)}</p>`:""}<div class="item-actions"><button onclick="editPlanEvent('${e.id}')">編輯</button><button onclick="deleteItem('planEvents','${e.id}')">刪除</button></div></article>`).join(""):empty("尚無查核計畫紀錄")
}
function planEventForm(p={}){
 let names=[...new Set((active().planEvents||[]).map(x=>x.planName).filter(Boolean))];
 openModal(p.id?"編輯查核計畫紀錄":"新增查核計畫紀錄",formWrap([
  `<div class="field full"><label>計畫／項目名稱</label><input list="planNameList" name="planName" value="${esc(p.planName||"")}" placeholder="例如：○○補助計畫" required><datalist id="planNameList">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>`,
  field("date","時間點",p.date||new Date().toISOString().slice(0,10),"date"),
  field("deadline","預定期限（選填）",p.deadline||"","date"),
  select("status","時效狀態",p.status||"待觀察",["準時","逾期","待觀察","不適用"]),
  field("content","辦理內容說明",p.content||"","textarea","full"),
  field("issue","發現問題／備註",p.issue||"","textarea","full")
 ]),{type:"planEvent",id:p.id});
}
window.editPlanEvent=id=>planEventForm((active().planEvents||[]).find(x=>x.id===id));

// ---- AI 分析 ----
function geminiKey(){return localStorage.getItem(GEMINI_KEY_STORAGE)||""}
function renderGeminiKeyStatus(){
 let k=geminiKey(),el=$("#geminiKeyStatus");if(!el)return;
 if(k){el.textContent=`✓ 已儲存金鑰（${k.slice(0,4)}${"•".repeat(Math.max(k.length-8,0))}${k.slice(-4)}），僅存於此瀏覽器`;el.classList.remove("empty")}
 else{el.textContent="尚未設定 API 金鑰，AI 分析功能無法使用";el.classList.add("empty")}
}
function renderAiIssueControls(){
 let el=$("#aiIssueControls");if(!el)return;
 let c=active(),issues=c.issues||[];
 if(!issues.length){el.innerHTML=empty("請先建立至少一個問題，才能使用 AI 分析。");aiSelectedIssueId=null;return}
 aiSelectedIssueId=issues.some(i=>i.id===aiSelectedIssueId)?aiSelectedIssueId:issues[0].id;
 el.innerHTML=issues.map((i,n)=>`<button class="${i.id===aiSelectedIssueId?"active":""}" data-aiid="${i.id}">P-${String(n+1).padStart(3,"0")} ${esc(i.title)}</button>`).join("");
}
function buildIssueContext(c,issue){
 let evs=c.evidence.filter(e=>e.issueId===issue.id),procs=c.procedures.filter(p=>p.issueId===issue.id),finds=c.findings.filter(f=>[f.issueId,f.relatedIssueId].includes(issue.id));
 let whys=[1,2,3,4,5].filter(n=>issue["why"+n]).map(n=>`Why ${n}：${issue["why"+n]}`).join("\n");
 let fish=["人員","制度","流程","法規","預算","資料","管理","其他"].filter(x=>issue["fish_"+x]).map(x=>`${x}：${issue["fish_"+x]}`).join("\n");
 return `【案件名稱】${c.name}
【受查單位】${c.agency||"未填寫"}
【查核期間】${c.period||"未填寫"}

【問題標題】${issue.title}
【問題描述】${issue.description||"未填寫"}
【問題分類】${issue.category||"未填寫"}
【目前風險等級】${issue.risk||"未填寫"}
【處理狀態】${issue.status||"未填寫"}

【5-Why 分析】
${whys||"尚未填寫"}

【目前根本原因】
${issue.rootCause||"尚未填寫"}

【魚骨分析】
${fish||"尚未填寫"}

【相關查核程序】
${procs.length?procs.map(p=>`- ${p.title}（${p.status}）：目的：${p.objective||"未填寫"}；結果：${p.result||"未填寫"}`).join("\n"):"尚無關聯查核程序"}

【相關證據】
${evs.length?evs.map(e=>`- ${e.code} ${e.title}：${e.description||"未填寫"}`).join("\n"):"尚無關聯證據"}

【相關查核發現】
${finds.length?finds.map(f=>`- ${f.title}：${f.problem||"未填寫"}`).join("\n"):"尚無關聯查核發現"}`;
}
function buildAuditPrompt(c,issue){
 return `你是一位資深內部稽核（審計）顧問。請根據以下審計案件的問題分析資料，用繁體中文提供專業意見，內容包含：
1. 對目前 5-Why 分析與根本原因的評論，是否合理、是否有遺漏的角度
2. 建議可以補充的查核程序（具體、可執行）
3. 風險等級評估與理由（高／中／低）
4. 具體可行的改善建議

請只根據下方提供的資料進行分析，不要編造資料中沒有的具體數字、日期或事實；若資料不足以判斷，請直接說明需要補充哪些資訊。請用條列方式回答。

${buildIssueContext(c,issue)}`;
}
async function callGeminiApi({input,system_instruction,previous_interaction_id}){
 let key=geminiKey();
 if(!key)throw new Error("尚未設定 Gemini API 金鑰，請先在上方輸入並儲存。");
 let payload={model:GEMINI_MODEL,input,generation_config:{thinking_level:"low"}};
 if(system_instruction)payload.system_instruction=system_instruction;
 if(previous_interaction_id)payload.previous_interaction_id=previous_interaction_id;
 let res;
 try{
  res=await fetch(GEMINI_ENDPOINT,{
   method:"POST",
   headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify(payload)
  });
 }catch(networkErr){
  throw new Error("無法連線到 Gemini API。請檢查網路連線；若持續失敗，可能是瀏覽器 CORS 政策擋下了跨網域請求，屆時需要改用後端代理伺服器轉發請求。");
 }
 let body=null;try{body=await res.json()}catch(e){}
 if(!res.ok){throw new Error(`Gemini API 回傳錯誤（HTTP ${res.status}）：${body?.error?.message||"請確認金鑰是否正確、額度是否足夠。"}`)}
 let text=(body?.steps||[]).filter(s=>s.type==="model_output").flatMap(s=>s.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n").trim();
 if(!text)throw new Error("Gemini 沒有回傳可用的文字內容，請稍後再試一次。");
 return {text,id:body?.id||null};
}
function renderAiChatLog(){
 let el=$("#aiChatLog");if(!el)return;
 el.innerHTML=aiChatHistory.length?aiChatHistory.map((m,idx)=>{
  let actions=m.role==="ai"?`<div class="ai-chat-actions">
   <button data-fill="rootcause" data-msgidx="${idx}">📥 填入根本原因</button>
   <button data-fill="procedure" data-msgidx="${idx}">📥 新增為查核程序</button>
   <button data-fill="finding" data-msgidx="${idx}">📥 新增為查核發現</button>
  </div>`:"";
  return `<div class="ai-chat-msg ${m.role}"><b>${m.role==="user"?"你":m.role==="error"?"⚠ 錯誤":"AI"}</b><div>${esc(m.text)}</div>${actions}</div>`;
 }).join(""):empty("目前沒有對話，可以先「產生 AI 分析」，或直接在下方輸入問題。");
 el.scrollTop=el.scrollHeight;
}
function resetAiChat(){aiChatId=null;aiChatHistory=[];renderAiChatLog()}
function fillFromAiMessage(idx,target){
 let msg=aiChatHistory[idx];if(!msg)return;
 let c=active(),issue=c.issues.find(x=>x.id===aiSelectedIssueId);
 if(!issue)return toast("找不到對應的問題，請先在上方選擇問題");
 if(target==="rootcause"){
  issue.rootCause=issue.rootCause&&issue.rootCause.trim()?`${issue.rootCause}\n\n【AI 建議】\n${msg.text}`:msg.text;
  save();toast("已填入根本原因，可到「問題分析」查看");
 }else if(target==="procedure"){
  procedureForm({issueId:issue.id,title:"AI 建議查核程序",steps:msg.text});
 }else if(target==="finding"){
  findingForm({issueId:issue.id,title:"AI 建議查核發現",problem:issue.description||"",recommendation:msg.text});
 }
}
function attachmentForm(a={}){
 let c=active();
 const opts=(arr,selected,label)=>`<option value="">未關聯</option>`+arr.map(x=>`<option value="${x.id}" ${x.id===selected?"selected":""}>${esc(x[label])}</option>`).join("");
 openModal(a.id?"編輯附件":"上傳附件",formWrap([
  `<div class="field full"><label>選擇檔案</label><div class="dropzone">請選擇要儲存在本機瀏覽器中的附件<br><input type="file" name="file" ${a.id?"":"required"}><div class="file-warning">建議單一附件小於 2MB，避免瀏覽器 LocalStorage 容量限制。</div><div class="attachment-preview" id="attachmentPreview">${a.name?`目前：${esc(a.name)}`:""}</div></div></div>`,
  `<div class="field"><label>關聯問題</label><select name="issueId">${opts(c.issues,a.issueId,"title")}</select></div>`,
  `<div class="field"><label>關聯證據</label><select name="evidenceId">${opts(c.evidence,a.evidenceId,"title")}</select></div>`,
  `<div class="field"><label>關聯查核程序</label><select name="procedureId">${opts(c.procedures,a.procedureId,"title")}</select></div>`,
  field("note","附件備註",a.note||"","textarea","full")
 ]),{type:"attachment",id:a.id});
}
async function dataUrlFromFile(file){
 return new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})
}
window.downloadAttachment=id=>{
 let a=active().attachments.find(x=>x.id===id);if(!a?.dataUrl)return alert("此附件沒有可用的本機檔案資料。");
 let link=document.createElement("a");link.href=a.dataUrl;link.download=a.name;link.click();
}
window.editAttachment=id=>attachmentForm(active().attachments.find(x=>x.id===id));

function renderAll(){ensureCase();renderSelector();renderDashboard();renderTimeline();renderIssues();renderEvidence();renderProcedures();renderFindings();renderAttachments();renderRelations();renderWorkpaper();renderTimelineGraph();renderPlanEvents();renderAiIssueControls();renderGeminiKeyStatus();renderAiChatLog()}
function openModal(title,html,ctx){modalContext=ctx;$("#modalTitle").textContent=title;$("#modalForm").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
function field(n,l,v="",type="text",cls=""){return type==="textarea"?`<div class="field ${cls}"><label>${l}</label><textarea name="${n}">${esc(v)}</textarea></div>`:`<div class="field ${cls}"><label>${l}</label><input type="${type}" name="${n}" value="${esc(v)}"></div>`}
function select(n,l,v,opts,cls=""){return `<div class="field ${cls}"><label>${l}</label><select name="${n}">${opts.map(o=>`<option ${o===v?"selected":""}>${o}</option>`).join("")}</select></div>`}
function formWrap(f){return `<div class="form-grid">${Array.isArray(f)?f.join(""):f}</div><div class="form-actions"><button type="button" onclick="closeModal()">取消</button><button class="primary">儲存</button></div>`}
function caseForm(c={}){openModal(c.id?"編輯案件":"新增案件",formWrap([field("name","案件名稱",c.name||"","text","full"),field("number","案件編號",c.number||""),field("agency","受查單位",c.agency||""),field("period","查核期間",c.period||""),select("status","案件狀態",c.status||"進行中",["進行中","暫停","已完成"])]),{type:"case",id:c.id})}
function eventForm(e={}){openModal(e.id?"編輯大事記":"新增大事記",formWrap([field("date","日期",e.date||new Date().toISOString().slice(0,10),"date"),select("category","分類",e.category||"查核",["案件啟動","查核","溝通","資料取得","證據","重要發現","其他"]),select("importance","重要性",e.importance||"中",["低","中","高","重大"]),field("title","事件標題",e.title||"","text","full"),field("description","事件內容",e.description||"","textarea","full")]),{type:"event",id:e.id})}
function issueForm(i={}){let fish=["人員","制度","流程","法規","預算","資料","管理","其他"].map(x=>field("fish_"+x,"魚骨："+x,i["fish_"+x]||"","text")).join("");openModal(i.id?"編輯問題分析":"新增問題分析",formWrap([field("title","問題標題",i.title||"","text","full"),field("description","問題描述",i.description||"","textarea","full"),select("category","問題分類",i.category||"制度",["人員","制度","流程","資料","預算","管理","法規","其他"]),select("risk","風險等級",i.risk||"中",["高","中","低"]),select("status","處理狀態",i.status||"待追蹤",["待追蹤","查核中","已處理","已結案"]),... [1,2,3,4,5].map(n=>field("why"+n,"Why "+n,i["why"+n]||"","text","full")),field("rootCause","根本原因",i.rootCause||"","textarea","full"),fish]),{type:"issue",id:i.id})}
function evidenceForm(e={}){openModal(e.id?"編輯證據":"新增證據",formWrap([field("code","證據編號",e.code||`E-${String(active().evidence.length+1).padStart(3,"0")}`),field("title","證據名稱",e.title||""),select("type","證據類型",e.type||"文件",["文件","函文","照片","現場紀錄","資料分析","其他"]),`<div class="field"><label>關聯問題</label><select name="issueId">${issueOptions(e.issueId)}</select></div>`,field("description","證據說明",e.description||"","textarea","full")]),{type:"evidence",id:e.id})}
function procedureForm(p={}){openModal(p.id?"編輯查核程序":"新增查核程序",formWrap([field("title","程序名稱",p.title||"","text","full"),`<div class="field"><label>關聯問題</label><select name="issueId">${issueOptions(p.issueId)}</select></div>`,select("status","執行狀態",p.status||"尚未執行",["尚未執行","執行中","已完成"]),field("objective","查核目的",p.objective||"","textarea","full"),field("steps","查核程序",p.steps||"","textarea","full"),field("documents","所需資料",p.documents||"","textarea","full"),field("result","查核結果",p.result||"","textarea","full")]),{type:"procedure",id:p.id})}
function findingForm(f={}){openModal(f.id?"編輯查核發現":"新增查核發現",formWrap([field("title","查核發現標題",f.title||"","text","full"),`<div class="field"><label>關聯問題</label><select name="issueId">${issueOptions(f.issueId)}</select></div>`,field("problem","問題描述",f.problem||"","textarea","full"),field("evidence","查核方法／證據",f.evidence||"","textarea","full"),field("basis","法規或依據",f.basis||"","textarea","full"),field("recommendation","改善建議",f.recommendation||"","textarea","full")]),{type:"finding",id:f.id})}
$("#modalForm").addEventListener("submit",async e=>{e.preventDefault();let fd=new FormData(e.target),o=Object.fromEntries(fd),c=active(),ctx=modalContext;if(ctx.type==="case"){if(ctx.id)Object.assign(data.cases.find(x=>x.id===ctx.id),o);else{data.cases.push({id:uid(),...o,events:[],issues:[],findings:[],evidence:[],procedures:[],planEvents:[]});activeCaseId=data.cases.at(-1).id}}else if(ctx.type==="attachment"){
 let arr=c.attachments||(c.attachments=[]), existing=ctx.id?arr.find(x=>x.id===ctx.id):null, file=fd.get("file");
 if(file && file.size>0){
   if(file.size>2*1024*1024 && !confirm("此檔案超過 2MB，可能超出瀏覽器儲存空間。仍要繼續嗎？"))return;
   o.name=file.name;o.type=file.type;o.size=file.size;o.sizeText=(file.size/1024/1024).toFixed(2)+" MB";o.dataUrl=await dataUrlFromFile(file);
 } else if(existing){Object.assign(o,{name:existing.name,type:existing.type,size:existing.size,sizeText:existing.sizeText,dataUrl:existing.dataUrl})}
 if(existing)Object.assign(existing,o);else arr.push({id:uid(),...o});
} else {let key={event:"events",issue:"issues",finding:"findings",evidence:"evidence",procedure:"procedures",planEvent:"planEvents"}[ctx.type],arr=c[key];ctx.id?Object.assign(arr.find(x=>x.id===ctx.id),o):arr.push({id:uid(),...o})}closeModal();save();toast("已儲存")})
window.closeModal=closeModal;$("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
$("#newCaseBtn").onclick=()=>caseForm();$("#addAttachmentBtn").onclick=()=>attachmentForm();$("#relationRefreshBtn").onclick=()=>renderRelations();$("#editCaseBtn").onclick=()=>caseForm(active());$("#quickEventBtn").onclick=()=>eventForm();$("#addEventBtn").onclick=()=>eventForm();$("#addIssueBtn").onclick=()=>issueForm();$("#addFindingBtn").onclick=()=>findingForm();$("#addEvidenceBtn").onclick=()=>evidenceForm();$("#addProcedureBtn").onclick=()=>procedureForm();$("#addPlanEventBtn").onclick=()=>planEventForm();$("#caseSelector").onchange=e=>{activeCaseId=e.target.value;aiChatId=null;aiChatHistory=[];renderAll()};
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll("[data-view-go]").forEach(b=>b.onclick=()=>showView(b.dataset.viewGo));function showView(v){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===v));document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.view===v))}
window.editEvent=id=>eventForm(active().events.find(x=>x.id===id));window.editIssue=id=>issueForm(active().issues.find(x=>x.id===id));window.editFinding=id=>findingForm(active().findings.find(x=>x.id===id));window.editEvidence=id=>evidenceForm(active().evidence.find(x=>x.id===id));window.editProcedure=id=>procedureForm(active().procedures.find(x=>x.id===id));window.deleteItem=(key,id)=>{if(confirm("確定刪除？")){active()[key]=active()[key].filter(x=>x.id!==id);save()}};
$("#exportBtn").onclick=()=>{let b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`AuditFlow_V2_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")};$("#importBtn").onclick=()=>$("#importFile").click();$("#importFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let p=JSON.parse(await f.text());if(!Array.isArray(p.cases))throw 0;if(confirm("匯入將覆蓋目前資料，確定嗎？")){data=p;activeCaseId=p.cases[0]?.id;save();toast("資料已還原")}}catch{x=0;alert("檔案格式不正確")}};$("#clearAllBtn").onclick=()=>{if(confirm("確定永久清除？")){data={cases:[]};activeCaseId=null;localStorage.removeItem(KEY);renderAll()}};
$("#printWorkpaperBtn").onclick=()=>window.print();
$("#timelineViewToggle").addEventListener("click",e=>{
 let b=e.target.closest(".tv-btn");if(!b)return;
 document.querySelectorAll("#timelineViewToggle .tv-btn").forEach(x=>x.classList.toggle("active",x===b));
 let mode=b.dataset.tv;
 $("#timelineList").classList.toggle("tv-hide",mode!=="list");
 $("#timelineGraphWrap").classList.toggle("tv-hide",mode!=="graph");
 if(mode==="graph")renderTimelineGraph();
});
$("#timelineGraph").addEventListener("click",e=>{let n=e.target.closest("[data-tgid]");if(!n)return;tgSelectedId=n.dataset.tgid;renderTimelineGraph()});
$("#planFilter").addEventListener("click",e=>{let b=e.target.closest("[data-plan]");if(!b)return;planFilterName=b.dataset.plan||null;renderPlanEvents()});
$("#aiIssueControls").addEventListener("click",e=>{let b=e.target.closest("[data-aiid]");if(!b)return;aiSelectedIssueId=b.dataset.aiid;renderAiIssueControls();resetAiChat()});
$("#saveGeminiKeyBtn").onclick=()=>{let v=$("#geminiKeyInput").value.trim();if(!v)return toast("請先輸入金鑰");localStorage.setItem(GEMINI_KEY_STORAGE,v);$("#geminiKeyInput").value="";renderGeminiKeyStatus();toast("金鑰已儲存在此瀏覽器")};
$("#clearGeminiKeyBtn").onclick=()=>{if(confirm("確定要清除已儲存的 Gemini API 金鑰嗎？")){localStorage.removeItem(GEMINI_KEY_STORAGE);renderGeminiKeyStatus();toast("金鑰已清除")}};
$("#runAiAnalysisBtn").onclick=async()=>{
 let c=active(),issue=c.issues.find(x=>x.id===aiSelectedIssueId);
 if(!issue)return toast("請先選擇要分析的問題");
 let resultEl=$("#aiResult"),btn=$("#runAiAnalysisBtn");
 resultEl.className="ai-result loading";resultEl.textContent="AI 分析中，請稍候…（依內容長度可能需要數秒到數十秒）";btn.disabled=true;
 try{
  let {text,id}=await callGeminiApi({input:buildAuditPrompt(c,issue),system_instruction:"你是一位嚴謹、專業的內部稽核顧問，只根據使用者提供的資料進行分析，不編造未提及的具體事實。"});
  resultEl.className="ai-result";resultEl.innerHTML=esc(text);
  aiChatId=id;aiChatHistory=[{role:"ai",text}];renderAiChatLog();
 }catch(err){
  resultEl.className="ai-result error";resultEl.textContent=err.message||"分析失敗，請稍後再試。";
 }finally{
  btn.disabled=false;
 }
};
$("#clearAiChatBtn").onclick=()=>resetAiChat();
$("#aiChatLog").addEventListener("click",e=>{let b=e.target.closest("[data-fill]");if(!b)return;fillFromAiMessage(Number(b.dataset.msgidx),b.dataset.fill)});
$("#aiChatForm").addEventListener("submit",async e=>{
 e.preventDefault();
 let c=active(),issue=c.issues.find(x=>x.id===aiSelectedIssueId);
 if(!issue)return toast("請先選擇要提問的問題");
 let input=$("#aiChatInput"),btn=$("#aiChatSendBtn"),q=input.value.trim();
 if(!q)return;
 aiChatHistory.push({role:"user",text:q});renderAiChatLog();
 input.value="";input.disabled=true;btn.disabled=true;
 try{
  let result=aiChatId
   ?await callGeminiApi({input:q,previous_interaction_id:aiChatId})
   :await callGeminiApi({input:`${buildIssueContext(c,issue)}\n\n【使用者提問】${q}`,system_instruction:"你是一位資深稽核顧問，請根據上面提供的案件資料回答使用者的問題；若資料不足以回答，請直接說明需要補充哪些資訊，不要編造未提及的事實。"});
  aiChatId=result.id;
  aiChatHistory.push({role:"ai",text:result.text});
 }catch(err){
  aiChatHistory.push({role:"error",text:err.message||"提問失敗，請稍後再試。"});
 }finally{
  renderAiChatLog();input.disabled=false;btn.disabled=false;input.focus();
 }
});
renderAll();