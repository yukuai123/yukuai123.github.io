"use strict";
const T = Trends,
  $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const colors = [
  "#ba4665",
  "#416cbb",
  "#bd9526",
  "#7d4bb3",
  "#1a887c",
  "#a86c37",
  "#6b8840",
  "#3987a0",
];
let exams = [],
  staged = [],
  roster = [],
  current = null,
  chosen = new Set(T.subjects),
  metric = "class",
  loadedReport = false;
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
function table(headers, rows) {
  return (
    "<table><thead><tr>" +
    headers.map((x) => `<th>${esc(x)}</th>`).join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (r) => "<tr>" + r.map((x) => `<td>${x ?? "—"}</td>`).join("") + "</tr>",
      )
      .join("") +
    "</tbody></table>"
  );
}
function signed(v, suffix = "", digits = 0) {
  return v === null
    ? "—"
    : `<span class="${v > 0 ? "positive" : v < 0 ? "negative" : ""}">${v > 0 ? "+" : ""}${T.fmt(v, digits)}${suffix}</span>`;
}
function openImport() {
  staged = structuredClone(exams);
  $("#confirmed").checked = false;
  $("#importStatus").textContent = "";
  renderSettings();
  $("#importDialog").showModal();
}
$("#openImport").onclick = openImport;
$("#startImport").onclick = () => {
  openImport();
  $("#files").click();
};
async function addFiles(files) {
  $("#importStatus").textContent = "正在读取…";
  let errors = [],
    count = 0;
  for (const file of files) {
    if (!/\.xlsx?$/i.test(file.name)) {
      errors.push(`${file.name}：请选择 .xls 或 .xlsx 成绩表。`);
      continue;
    }
    try {
      const raw = await ExcelIO.read(file);
      let found = 0;
      for (const r of raw) {
        if (
          !r.rows.some((row) =>
            row.some((v) => ["姓名", "考生姓名"].includes(String(v).trim())),
          )
        )
          continue;
        const e = T.inspect(r);
        const existing = staged.findIndex(
          (x) => x.file === e.file && x.sheet === e.sheet,
        );
        if (existing >= 0) staged[existing] = e;
        else staged.push(e);
        found++;
        count++;
      }
      if (!found)
        errors.push(`${file.name}：没有找到包含“姓名”列的成绩工作表。`);
    } catch (e) {
      errors.push(`${file.name}：${e.message}`);
    }
  }
  $("#importStatus").textContent =
    `已读取${count}个成绩工作表。${errors.length ? "\n" + errors.join("\n") : ""}`;
  $("#confirmed").checked = false;
  $("#files").value = "";
  renderSettings();
}
$("#files").onchange = (e) => addFiles(e.target.files);
$("#dropzone").ondragover = (e) => {
  e.preventDefault();
};
$("#dropzone").ondrop = (e) => {
  e.preventDefault();
  addFiles(e.dataTransfer.files);
};
function foldOptions(e,i){
  const pending=Object.keys(T.foldWeights).filter(s=>s in e.maxima&&!T.foldSetting(e,s).locked);
  const ready=Object.keys(T.foldWeights).filter(s=>s in e.maxima&&T.foldSetting(e,s).locked);
  let html=ready.length?`<p class="foldready">${ready.join('、')}：已识别为折算分，直接使用，不重复换算。</p>`:'';
  if(pending.length)html+=`<div class="foldsettings"><strong>原始分处理（请逐科确认）</strong>${pending.map(s=>{const rule=T.foldSetting(e,s),raw=e.rows.find(r=>r.scores[s]!==null)?.scores[s],after=raw===undefined?'—':T.fmt(raw*rule.factor,2);return `<label>${s}<select data-fold="${i}" data-subject="${s}" aria-label="第${i+1}次${s}折算处理"><option value="convert" ${rule.mode==='convert'?'selected':''}>原始分 × ${T.foldWeights[s]}</option><option value="raw" ${rule.mode==='raw'?'selected':''}>保留原分，不折算</option></select><small>示例：${raw??'—'} → ${after}；报告满分 ${T.fmt(e.maxima[s]*rule.factor,0)}</small></label>`;}).join('')}</div>`;
  return html;
}
function renderSettings() {
  $("#examSettings").innerHTML =
    staged
      .map(
        (e, i) =>
          `<div class="examsetting"><div class="examrow"><b>${i + 1}</b><input data-name="${i}" value="${esc(e.name)}" aria-label="第${i + 1}次考试名称"><small>${esc(e.file)} / ${esc(e.sheet)} · ${e.rows.length}人 · 源总分满分 <b>${e.totalMax}</b></small><button data-up="${i}" ${i === 0 ? "disabled" : ""}>上移</button><button data-down="${i}" ${i === staged.length - 1 ? "disabled" : ""}>下移</button><button data-remove="${i}">移除</button></div><div class="maxsettings">${Object.entries(
            e.maxima,
          )
            .map(
              ([s, m]) =>
                `<label>${s}满分<input type="number" min="1" max="1000" value="${m}" data-max="${i}" data-subject="${s}"></label>`,
            )
            .join(
              "",
            )}</div>${foldOptions(e,i)}<small>${e.inferred ? "部分满分依据列名和分值推测，需按试卷确认。" : ""}${e.mismatch.length ? " 分科合计与源总分不一致，请核对。" : ""}</small></div>`,
      )
      .join("") || '<p class="muted">尚未选择文件。</p>';
  $("#examSettings")
    .querySelectorAll("[data-name]")
    .forEach(
      (el) =>
        (el.oninput = () => {
          staged[+el.dataset.name].name = el.value.trim();
          $("#confirmed").checked = false;
        }),
    );
  $("#examSettings")
    .querySelectorAll("[data-max]")
    .forEach(
      (el) =>
        (el.onchange = () => {
          const e = staged[+el.dataset.max];
          e.maxima[el.dataset.subject] = Number(el.value);
          e.totalMax = Object.values(e.maxima).reduce((a, b) => a + b, 0);
          $("#confirmed").checked = false;
          renderSettings();
        }),
    );
  $('#examSettings').querySelectorAll('[data-fold]').forEach(el=>el.onchange=()=>{const e=staged[+el.dataset.fold];e.folding??={};e.folding[el.dataset.subject]=el.value;$('#confirmed').checked=false;renderSettings();});
  for (const action of ["up", "down", "remove"])
    $("#examSettings")
      .querySelectorAll(`[data-${action}]`)
      .forEach(
        (el) =>
          (el.onclick = () => {
            const i = +el.dataset[action];
            if (action === "remove") staged.splice(i, 1);
            else {
              const j = action === "up" ? i - 1 : i + 1;
              [staged[i], staged[j]] = [staged[j], staged[i]];
            }
            $("#confirmed").checked = false;
            renderSettings();
          }),
      );
}
$("#generate").onclick = () => {
  try {
    if (staged.length < 2) throw Error("请至少导入两次考试。");
    if (!$("#confirmed").checked)
      throw Error("请先核对并勾选考试顺序、满分、折算处理和人数。");
    if (
      staged.some(
        (e) =>
          !e.name ||
          Object.values(e.maxima).some(
            (m) => !Number.isFinite(m) || m <= 0 || m > 1000,
          ),
      )
    )
      throw Error("考试名称不能为空，满分须为1—1000之间的数字。");
    if (new Set(staged.map((e) => e.name)).size < staged.length)
      throw Error("考试名称不能重复，请给不同考试命名。");
    const next = T.prepare(structuredClone(staged)),
      issues = T.validate(next);
    if (issues.length) throw Error(issues.join("\n"));
    exams = next;
    loadedReport = false;
    activate();
    $("#importDialog").close();
    toast("分析已更新。数据仅保留在当前页面，关闭前请导出。");
  } catch (e) {
    $("#importStatus").textContent = e.message;
  }
};
$("#clearAll").onclick = () => {
  staged = [];
  exams = [];
  roster = [];
  current = null;
  $("#workspace").hidden = true;
  $("#empty").hidden = false;
  $("#export").disabled = true;
  $("#confirmed").checked = false;
  renderSettings();
  $("#importStatus").textContent =
    "已清空当前页面数据。原始Excel文件不受影响。";
};
function activate() {
  roster = T.students(exams);
  roster.sort(
    (a, b) =>
      (exams.at(-1).rows.find((x) => x.key === a.key)?.schoolRank ?? 1e6) -
      (exams.at(-1).rows.find((x) => x.key === b.key)?.schoolRank ?? 1e6),
  );
  if (!roster.some((s) => s.key === current)) current = roster[0]?.key;
  $("#empty").hidden = true;
  $("#workspace").hidden = false;
  $("#export").disabled = false;
  $("#studentCount").textContent = roster.length;
  $("#examCount").textContent = exams.length;
  $("#timeline").innerHTML = exams
    .map(
      (e, i) =>
        `<div class="timepoint"><b>${esc(e.name)}</b><small>${e.rows.length}人 / 源满分${e.totalMax}</small></div>`,
    )
    .join("");
  const schoolMissing = exams.filter((e) =>
    e.rows.every((x) => Object.values(x.schoolRanks).every((v) => v === null)),
  );
  const counts = exams.map((e) => e.rows.length);
  $("#notice").textContent =
    `${schoolMissing.length ? schoolMissing.map((e) => e.name).join("、") + "未提供单科校排，曲线在该次断开。 " : ""}源总分权重不同，五次总分比较优先看共同七科得分率。源校次保留原口径，不能消除难度、参试人数及权重差异。${new Set(counts).size > 1 ? " 各次人数不同，班内排名也受名单变化影响。" : ""}`;
  renderList();
  renderPersonal();
  renderClass();
}
function visibleStudents() {
  const q = $("#search").value.trim(),
    filter = $("#studentFilter").value;
  return roster.filter(
    (s) =>
      (!q || s.name.includes(q) || String(s.shortId ?? "").includes(q)) &&
      (filter === "all" ||
        (filter === "down" && T.diagnose(exams, s.key).recent < 0) ||
        (filter === "weak" && T.diagnose(exams, s.key).weak.length)),
  );
}
function renderList() {
  $("#studentList").innerHTML =
    visibleStudents()
      .map((s) => {
        const last = exams.at(-1).rows.find((x) => x.key === s.key);
        return `<button class="studentitem ${s.key === current ? "active" : ""}" data-key="${esc(s.key)}"><span>${esc(s.name)}</span><small>${last?.schoolRank ? "校" + last.schoolRank : "无本次"}</small></button>`;
      })
      .join("") || '<p class="muted">没有匹配的学生。</p>';
  $("#studentList")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          current = b.dataset.key;
          renderList();
          renderPersonal();
        }),
    );
}
$("#search").oninput = renderList;
$("#studentFilter").onchange = renderList;
$("#prev").onclick = () => step(-1);
$("#next").onclick = () => step(1);
function step(d) {
  const a = visibleStudents();
  if (!a.length) return;
  const i = a.findIndex((s) => s.key === current);
  current = a[(i + d + a.length) % a.length].key;
  renderList();
  renderPersonal();
}
function lineChart(key, m = "class", width = 920, height = 300) {
  const left = 46,
    right = 25,
    top = 18,
    bottom = 42,
    w = width - left - right,
    h = height - top - bottom,
    active = T.subjects.filter((s) => chosen.has(s));
  const dat = active.map((s) => ({ s, values: T.series(exams, key, s, m) })),
    all = dat.flatMap((x) => x.values).filter((v) => v !== null);
  let max =
    m === "rate"
      ? 100
      : m === "class"
        ? Math.max(10, ...exams.map((e) => e.rows.length))
        : Math.max(100, Math.ceil(Math.max(0, ...all) / 100) * 100);
  const x = (i) => left + (w * i) / Math.max(1, exams.length - 1),
    y = (v) => (m === "rate" ? top + h * (1 - v / max) : top + (h * v) / max);
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${m === "rate" ? "各科得分率" : "各科名次"}趋势"><rect width="${width}" height="${height}" fill="white"/>`;
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4,
      yy = m === "rate" ? top + h - (h * i) / 4 : top + (h * i) / 4;
    svg += `<path d="M${left} ${yy}H${width - right}" stroke="#e1e4ee" stroke-dasharray="4 5"/><text x="${left - 9}" y="${yy + 4}" text-anchor="end" fill="#6c7088" font-size="11">${Math.round(v)}${m === "rate" ? "%" : ""}</text>`;
  }
  exams.forEach((e, i) => {
    svg += `<text x="${x(i)}" y="${height - 15}" text-anchor="middle" fill="#6c7088" font-size="11">${esc(e.name)}</text>`;
  });
  for (const d of dat) {
    const color = colors[T.subjects.indexOf(d.s)];
    let path = "",
      run = false;
    d.values.forEach((v, i) => {
      if (v === null) {
        run = false;
        return;
      }
      const vv = m === "rate" ? v * 100 : v;
      path += `${run ? "L" : "M"}${x(i)} ${y(vv)} `;
      run = true;
    });
    svg += `<path d="${path}" stroke="${color}" stroke-width="2.5" fill="none"/>`;
    d.values.forEach((v, i) => {
      if (v !== null)
        svg += `<circle cx="${x(i)}" cy="${y(m === "rate" ? v * 100 : v)}" r="4" fill="${color}" stroke="white" stroke-width="1.5"><title>${esc(d.s)} / ${esc(exams[i].name)}：${m === "rate" ? T.fmt(v * 100) + "%" : v + "名"}</title></circle>`;
    });
  }
  if (!all.length)
    svg += `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#6c7088">所选科目没有可用记录</text>`;
  return svg + "</svg>";
}
function totalChart(key, width = 440, height = 230) {
  const l = 35,
    r = 15,
    t = 20,
    b = 42,
    w = width - l - r,
    h = height - t - b,
    step = w / exams.length;
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="源总分与共同七科得分率"><rect width="${width}" height="${height}" fill="white"/>`;
  for (const v of [0, 50, 100]) {
    const y = t + h * (1 - v / 100);
    svg += `<path d="M${l} ${y}H${width - r}" stroke="#e1e4ee"/><text x="${l - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6c7088">${v}</text>`;
  }
  exams.forEach((e, i) => {
    const x = e.rows.find((x) => x.key === key),
      base = l + step * (i + 0.5);
    if (x)
      for (const [j, v] of [x.totalRate, x.commonRate].entries())
        if (v !== null)
          svg += `<rect x="${base + (j === 0 ? -17 : 1)}" y="${t + h * (1 - v)}" width="15" height="${h * v}" rx="2" fill="${j === 0 ? "#d7a32b" : "#6154b3"}"><title>${esc(e.name)} ${j === 0 ? "源总分" : "共同七科"}：${T.fmt(v * 100)}%</title></rect>`;
    svg += `<text x="${base}" y="${height - 23}" text-anchor="middle" font-size="9" fill="#6c7088">${esc(e.name)}</text>`;
  });
  svg += `<text x="${l}" y="${height - 4}" font-size="10" fill="#b18a24">■ 源总分</text><text x="${l + 90}" y="${height - 4}" font-size="10" fill="#6154b3">■ 共同七科</text>`;
  return svg + "</svg>";
}
function subjectRows(key, m) {
  return T.subjects.map((s) => {
    const a = T.series(exams, key, s, m),
      tr = T.trend(a, m === "rate" ? "rate" : "rank");
    return [
      esc(s),
      ...a.map((v) =>
        v === null ? "—" : m === "rate" ? T.fmt(v * 100) + "%" : String(v),
      ),
      tr.label,
      tr.change === null
        ? "—"
        : signed(
            tr.change * (m === "rate" ? 100 : 1),
            m === "rate" ? "pp" : "名",
            m === "rate" ? 1 : 0,
          ),
    ];
  });
}
function actionText(d) {
  const focus = d.focus.filter((x) => x.recent !== null && x.recent <= -5);
  return `${d.weak.length ? "<p>相对短板：" + d.weak.map((x) => esc(x.s)).join("、") + "。与学生一起抽看近两次试卷，区分基础缺口、审题、时间分配和偶发失误，再确定一项可跟进的练习。</p>" : "<p>各科相对位置较均衡，结合最近试卷选择一项能落实的改进任务。</p>"}${focus.length ? "<p>最近下滑：" + focus.map((x) => esc(x.s)).join("、") + "的班内名次下降至少5名，建议优先核对失分原因。</p>" : ""}<p>两周后用同类小测、错题重做和独立完成情况复核。图表只能提示需要了解的方向，具体知识点要查卷确认。</p>`;
}
function renderPersonal() {
  const student=roster.find(s=>s.key===current);if(!student)return;
  const d=T.diagnose(exams,current);
  $('#studentName').textContent=student.name;
  $('#studentMeta').textContent=`学号 ${student.shortId??'—'} · ${exams.filter(e=>e.rows.some(x=>x.key===current)).length}次成绩记录`;
  $('#diagnosis').textContent=d.summary;$('#actions').innerHTML=actionText(d);
  $('#a4Preview').innerHTML=A4Report.render(exams,current,{scoreMode:$('#scoreMode').value}).join('');
}
$('#scoreMode').onchange=renderPersonal;
function renderClass() {
  const rows = roster.map((s) => {
    const ds = T.diagnose(exams, s.key),
      school = T.series(exams, s.key, "总分", "school");
    return [
      `<button data-student="${esc(s.key)}">${esc(s.name)}</button>`,
      ...school.map((v) => v ?? "—"),
      signed(ds.totalTrend?.change ?? null, "名"),
      signed(ds.recent, "名"),
      esc(ds.weak.map((x) => x.s).join("、") || "—"),
    ];
  });
  $("#cohort").innerHTML = table(
    [
      "姓名",
      ...exams.map((e) => e.name + "校次"),
      "首末变化",
      "最近变化",
      "本次相对短板",
    ],
    rows,
  );
  $("#cohort")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          current = b.dataset.student;
          showView("personal");
          renderList();
          renderPersonal();
        }),
    );
  $("#classSubjects").innerHTML = table(
    ["学科", ...exams.map((e) => e.name)],
    T.subjects.map((s) => [
      s,
      ...exams.map((e) => {
        const vs = e.rows.map((x) => x.rates[s]).filter((v) => v !== null);
        return vs.length ? T.fmt(T.mean(vs) * 100) + "%" : "—";
      }),
    ]),
  );
}
function showView(v) {
  $("#personal").hidden = v !== "personal";
  $("#classView").hidden = v === "personal";
  $("#personalTab").classList.toggle("active", v === "personal");
  $("#classTab").classList.toggle("active", v !== "personal");
}
$("#personalTab").onclick = () => showView("personal");
$("#classTab").onclick = () => showView("class");
function download(blob, name) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function exportSheets() {
  const summary = [
    [
      "姓名",
      ...exams.map((e) => e.name + "校次"),
      "首末校次变化（正数进步）",
      "最近校次变化（正数进步）",
      "本次相对短板",
      "分析",
    ],
  ];
  for (const s of roster) {
    const d = T.diagnose(exams, s.key);
    summary.push([
      s.name,
      ...T.series(exams, s.key, "总分", "school"),
      d.totalTrend?.change ?? null,
      d.recent,
      d.weak.map((x) => x.s).join("、"),
      d.summary,
    ]);
  }
  const detail = [
    [
      "考试",
      "姓名",
      "学号",
      "学科",
      "提取值",
      "报告分数（按导入配置）",
      "换算系数",
      "分数处理",
      "原列满分",
      "得分率(%)",
      "班内单科名次",
      "单科校次",
      "源总分",
      "源总分满分",
      "报告总分（按导入配置）",
      "报告总分满分",
      "报告总分班次（重算）",
      "源校次",
      "共同七科总分(460)",
      "共同七科得分率(%)",
      "共同七科班次",
    ],
  ];
  for (const e of exams)
    for (const x of e.rows)
      for (const s of T.subjects)
        detail.push([
          e.name,
          x.name,
          x.shortId,
          s,
          x.scores[s] ?? null,
          x.configuredScores[s] ?? null,
          T.foldSetting(e,s).factor,
          T.foldSetting(e,s).mode==='already'?'已折算，直接使用':T.foldSetting(e,s).mode==='convert'?'原始分折算':'保留原分',
          e.maxima[s] ?? null,
          x.rates[s] === null ? null : x.rates[s] * 100,
          x.classRanks[s],
          x.schoolRanks[s] ?? null,
          x.sourceTotal,
          e.totalMax,
          x.configuredTotal,
          e.configuredTotalMax,
          x.configuredClassRank,
          x.schoolRank,
          x.commonTotal,
          x.commonRate === null ? null : x.commonRate * 100,
          x.commonRank,
        ]);
  const method = [
    ["口径", "说明"],
    [
      "共同七科",
      "语数英各100、政治历史各50、生物地理各30，合计460；物理单列。",
    ],
    [
      "源校次",
      "保留原表总分校排，不混用源表的进退步字段；七上期末原总分700，其他考试权重不同。",
    ],
    ["短板", "本次单科班内名次比共同七科班内名次落后≥5名，仅作为查卷线索。"],
    ["缺失", "缺考、无科目或无校排名保留空白；没有年级参试人数不计算百分位。"],
    ["趋势", "按有效记录判断逐次方向；跨缺失记录的变化不代表连续考试变化。"],
    ...exams.map((e) => [
      e.name,
      `${e.file} / ${e.sheet}；${e.rows.length}人；满分${e.totalMax}`,
    ]),
  ];
  return [
    { name: "学生趋势总览", rows: summary },
    { name: "分科数据", rows: detail },
    { name: "统计口径", rows: method },
  ];
}
$("#export").onclick = () => {
  try {
    download(ExcelIO.write(exportSheets()), "学生多次考试趋势分析.xlsx");
    toast("分析Excel已导出。个人图表可用打印功能保存PDF。");
  } catch (e) {
    toast("导出失败：" + e.message);
  }
};
function reportItems(all){
  return (all?roster:roster.filter(s=>s.key===current)).flatMap(s=>A4Report.render(exams,s.key,{scoreMode:$('#scoreMode').value}).map((svg,i)=>({svg,name:`${s.name}_A4成绩分析${i?'_'+(i+1):''}.png`})));
}
async function exportReport(kind,all){
  if(!exams.length)return;
  const buttons=['#printOne','#printAll','#exportPNG','#exportAllPNG'];buttons.forEach(id=>$(id).disabled=true);
  try{
    await document.fonts.ready;
    const items=reportItems(all),progress=(i,n)=>toast(`正在生成 ${i}/${n} 页，请保持页面打开…`);
    const prefix=all?`全班${roster.length}名学生`:roster.find(s=>s.key===current).name;
    if(kind==='pdf')download(await ReportExport.pdf(items.map(x=>x.svg),progress),`${prefix}_A4成绩分析.pdf`);
    else if(items.length===1)download(await ReportExport.raster(items[0].svg),items[0].name);
    else download(await ReportExport.pngZip(items,progress),`${prefix}_A4成绩分析_PNG.zip`);
    toast('导出完成：A4纵向，每页一人，PNG为2480×3508像素（300dpi）。打印请选择A4、实际大小。');
  }catch(e){toast('导出失败：'+e.message);}finally{buttons.forEach(id=>$(id).disabled=false);}
}
$('#printOne').onclick=()=>exportReport('pdf',false);
$('#printAll').onclick=()=>exportReport('pdf',true);
$('#exportPNG').onclick=()=>exportReport('png',false);
$('#exportAllPNG').onclick=()=>exportReport('png',true);
$("#demo").onclick = () => {
  const demoNames = ["同学甲", "同学乙", "同学丙", "同学丁", "同学戊"];
  exams = T.prepare(
    ["第一次", "第二次", "第三次"].map((name, i) => ({
      name,
      file: "匿名示例",
      sheet: "示例",
      totalMax: 460,
      maxima: {
        语文: 100,
        数学: 100,
        英语: 100,
        政治: 50,
        历史: 50,
        生物: 30,
        地理: 30,
      },
      mismatch: [],
      rows: demoNames.map((name, j) => ({
        name,
        id: "示例" + j,
        shortId: j + 1,
        sourceTotal: [360, 310, 280, 240, 180][j] + i * (j % 2 ? 8 : -5),
        schoolRank: 40 + j * 60 + i * (j % 2 ? -10 : 8),
        scores: {
          语文: 75 - j * 6 + i * 2,
          数学: 82 - j * 8 + i,
          英语: 78 - j * 9 - i * 3,
          政治: 40 - j * 4,
          历史: 37 - j * 3,
          生物: 24 - j * 2,
          地理: 24 - j * 2,
        },
        schoolRanks: Object.fromEntries(
          T.subjects.map((s, k) => [
            s,
            s === "物理" ? null : 30 + j * 50 + i * (k % 2 ? -8 : 9),
          ]),
        ),
      })),
    })),
  );
  activate();
  toast("正在查看匿名示例。导入你的Excel后可替换。");
};
// A locally generated report can provide an explicit initial dataset; the reusable tool starts empty.
if (window.INITIAL_EXAMS) {
  exams = T.prepare(window.INITIAL_EXAMS);
  loadedReport = true;
  activate();
  $("#saveHint").textContent =
    " 此文件已包含本次48名学生的分析数据，请妥善保存。";
}
