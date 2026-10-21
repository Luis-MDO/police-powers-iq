/* Reports are reviewed and exported by the student, never transmitted automatically. */
(() => {
  'use strict';
  const study = window.PPIQ_STUDY, KEY = 'ppiq_reports_v1';
  const categories = {wording:'Unclear wording', answer:'Possible answer or explanation error', source:'Broken or outdated legal source', other:'Other issue'};
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog = document.getElementById('studyDialog');
  let draft = null;
  function reports() {
    const data = study.read(KEY, []);
    return Array.isArray(data) ? data.filter(r => r && typeof r.id==='string' && typeof r.questionId==='string' && typeof r.question==='string' && typeof r.note==='string' && r.note.length<=2000 && Object.hasOwn(categories,r.category)) : [];
  }
  function show(title, body) {
    dialog.innerHTML=`<div class="dialog-heading"><h2 id="dialogTitle">${escape(title)}</h2><button class="ghost dialog-close" type="button" aria-label="Close dialog">×</button></div>${body}`;
    dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
    if(!dialog.open)dialog.showModal();
  }
  function download(data, name) {
    const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function open(question) {
    draft={id:study.sessionId(),questionId:question.id,question:question.question,options:question.options,category:'wording',note:'',createdAt:new Date().toISOString(),status:'open'};
    edit();
  }
  function edit() {
    show(`Report question ${draft.questionId}`,`<p class="small">Describe the issue without including personal information. Preview your report before choosing to submit it to the site owner, save it on this device, or download a copy.</p><p class="report-stem">${escape(draft.question)}</p><form id="questionReportForm"><label for="reportCategory">Issue type</label><select id="reportCategory">${Object.entries(categories).map(([id,label])=>`<option value="${id}" ${draft.category===id?'selected':''}>${label}</option>`).join('')}</select><label for="reportNote">What should be checked?</label><textarea id="reportNote" rows="5" minlength="10" maxlength="2000" required placeholder="Explain what is unclear or include the legal source that should be checked.">${escape(draft.note)}</textarea><div class="actions"><button class="primary" type="submit">Preview report →</button></div></form>`);
    dialog.querySelector('#questionReportForm').onsubmit=event=>{
      event.preventDefault();
      const note=dialog.querySelector('#reportNote').value.trim();
      if(note.length<10){dialog.querySelector('#reportNote').setCustomValidity('Please describe the issue in at least 10 characters.');dialog.querySelector('#reportNote').reportValidity();return}
      draft.note=note;draft.category=dialog.querySelector('#reportCategory').value;preview();
    };
    dialog.querySelector('#reportNote').oninput=event=>event.target.setCustomValidity('');
  }
  function preview() {
    show('Review your question report',`<dl class="report-preview"><dt>Question</dt><dd>${escape(draft.questionId)} · ${escape(draft.question)}</dd><dt>Issue</dt><dd>${escape(categories[draft.category])}</dd><dt>Your note</dt><dd class="preserve-lines">${escape(draft.note)}</dd></dl><p class="small">Review the details before saving or exporting. Nothing is sent until you choose Submit report to site owner. Online reporting requires the deployed site’s Netlify Forms service.</p><p id="reportStatus" role="status"></p><div class="actions"><button id="editReport" class="ghost" type="button">Edit</button><button id="submitReport" class="primary" type="button">Submit report to site owner</button><button id="saveReport" class="ghost" type="button">Save on this device</button><button id="downloadReport" class="ghost" type="button">Download report</button></div>`);
    dialog.querySelector('#editReport').onclick=edit;
    dialog.querySelector('#saveReport').onclick=()=>{
      const rows=reports(),existing=rows.findIndex(r=>r.id===draft.id);
      if(existing<0&&rows.length>=100){dialog.querySelector('#reportStatus').textContent='This device already has 100 reports. Download and remove older reports before saving another.';return}
      if(existing<0)rows.push({...draft});else rows[existing]={...draft};
      const saved=study.write(KEY,rows);
      dialog.querySelector('#reportStatus').textContent=saved?'Report saved on this device. Nothing has been sent. Use Download report to share it with the site owner.':'The report could not be saved. You can still download it now.';
      if(saved)dialog.querySelector('#saveReport').disabled=true;
    };
    dialog.querySelector('#submitReport').onclick=async()=>{
      const submitted={...draft},button=dialog.querySelector('#submitReport'),status=dialog.querySelector('#reportStatus');
      button.disabled=true;status.textContent='Submitting your reviewed report…';
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
      try{
        const body=new URLSearchParams({'form-name':'question-report','bot-field':'','question-id':submitted.questionId,'question-text':submitted.question,'category':submitted.category,'note':submitted.note,'report-id':submitted.id});
        const response=await fetch('/report-confirmed',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:controller.signal});
        // An ordinary static-page HTTP 200 is not proof that a form was accepted.
        if(!response.ok||!response.redirected||new URL(response.url).pathname.replace(/\.html$/, '').replace(/\/$/, '')!=='/report-confirmed')throw Error('Online reporting unavailable');
        const rows=reports(),existing=rows.findIndex(r=>r.id===submitted.id),record={...submitted,submittedAt:new Date().toISOString()};
        if(existing>=0)rows[existing]=record;else if(rows.length<100)rows.push(record);
        const saved=study.write(KEY,rows);
        status.textContent='Report submitted to the site owner.'+(saved?' A copy is saved on this device.':' A local copy could not be saved; download one if needed.');
        button.textContent='Report submitted';
      }catch(_){
        status.textContent='Online reporting is unavailable or has not been enabled. Your report has not been confirmed as received. Save or download it to keep a copy.';
        button.disabled=false;
      }finally{clearTimeout(timeout)}
    };
    dialog.querySelector('#downloadReport').onclick=()=>download({schemaVersion:1,application:'Police PowersIQ',report:draft},`Police-PowersIQ-report-${draft.questionId}.json`);
  }
  function queue() {
    const rows=reports();
    show('Question reports on this device',`<p class="small">These reports are local to this browser. Download them to share with Luis MdO; each report shows whether an online submission was confirmed. Locally saved reports have not been sent.</p>${rows.length?`<ul class="report-queue">${rows.map(r=>`<li><b>${escape(r.questionId)} · ${escape(categories[r.category])}</b><p class="preserve-lines">${escape(r.note)}</p><small>${escape(r.status==='resolved'?'Marked resolved locally':r.submittedAt?'Submitted to site owner':'Not submitted · saved locally')}</small><div class="actions"><button type="button" class="ghost" data-report-toggle="${escape(r.id)}">${r.status==='resolved'?'Reopen':'Mark resolved locally'}</button><button type="button" class="ghost" data-report-delete="${escape(r.id)}">Remove</button></div></li>`).join('')}</ul><div class="actions"><button id="exportReports" class="primary" type="button">Download all reports</button></div>`:'<p>No reports have been saved on this device.</p>'}`);
    const exportButton=dialog.querySelector('#exportReports');if(exportButton)exportButton.onclick=()=>download({schemaVersion:1,application:'Police PowersIQ',exportedAt:new Date().toISOString(),reports:rows},'Police-PowersIQ-question-reports.json');
    dialog.querySelectorAll('[data-report-toggle]').forEach(button=>button.onclick=()=>{const updated=reports().map(r=>r.id===button.dataset.reportToggle?{...r,status:r.status==='resolved'?'open':'resolved'}:r);if(study.write(KEY,updated))queue()});
    dialog.querySelectorAll('[data-report-delete]').forEach(button=>button.onclick=()=>{if(confirm('Remove this report from this device? Download a copy first if you want to keep it.')){if(study.write(KEY,reports().filter(r=>r.id!==button.dataset.reportDelete)))queue()}});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-report-question]');
    if(button){const question=window.PPIQ_QUESTIONS.find(q=>q.id===button.dataset.reportQuestion);if(question)open(question)}
    if(event.target.closest('#reportsQueueBtn'))queue();
  });
  window.PPIQ_REPORTS={open,queue,reports,download};
})();
