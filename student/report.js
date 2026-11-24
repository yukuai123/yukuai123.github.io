(function (root) {
  "use strict";
  const W = 1240,
    H = 1754,
    ink = "#292642",
    violet = "#65518b",
    line = "#c8bfd4",
    gold = "#edb94b";
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const fmt = (v) =>
    v === null || v === undefined
      ? "—"
      : Number(v)
          .toFixed(2)
          .replace(/\.?0+$/, "");
  function text(
    x,
    y,
    s,
    size = 16,
    anchor = "start",
    fill = ink,
    weight = 400,
  ) {
    return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" font-weight="${weight}">${esc(s)}</text>`;
  }
  function multiline(x, y, a, size = 16, gap = 21, anchor = "middle") {
    return a.map((s, i) => text(x, y + i * gap, s, size, anchor)).join("");
  }
  function chart(all, exams, key, subject, x, y, w, h, scoreMode) {
    const rows = exams.map((e) => e.rows.find((r) => r.key === key));
    const scores = rows.map((r, i) => {
      const v = Trends.scoreView(exams[i], r, scoreMode);
      return subject === "总分" ? v.total : (v.scores?.[subject] ?? null);
    });
    const ranks = rows.map((r) =>
      !r
        ? null
        : subject === "总分"
          ? r.schoolRank
          : (r.schoolRanks[subject] ?? null),
    );
    const maxima = exams.map((e) => {
      const v = Trends.scoreView(e, null, scoreMode);
      return subject === "总分" ? v.totalMax : (v.maxima[subject] ?? 0);
    });
    const scoreMax = Math.max(...maxima, 1),
      rankValues = all
        .flatMap((e) =>
          e.rows.map((r) =>
            subject === "总分"
              ? r.schoolRank
              : (r.schoolRanks[subject] ?? null),
          ),
        )
        .filter((v) => v !== null);
    const rankMax = Math.max(
      50,
      Math.ceil(Math.max(0, ...rankValues) / 100) * 100,
    );
    const L = 40,
      R = 40,
      T = 67,
      B = 70,
      plotW = w - L - R,
      plotH = h - T - B;
    const xx = (i) => L + (plotW * (i + 0.5)) / exams.length,
      sy = (v) => T + plotH * (1 - v / scoreMax),
      ry = (v) => T + (plotH * v) / rankMax;
    let out = `<g transform="translate(${x},${y})"><rect width="${w}" height="${h}" rx="5" fill="#fcfbfe" stroke="${line}"/>${text(14, 27, subject === "总分" ? "总分 · 分数与校排名" : subject + " · 分数与校排名", 18, "start", ink, 600)}<rect x="14" y="39" width="16" height="8" fill="${gold}" stroke="#b58727"/>${text(35, 47, "分数", 13)}<path d="M92 43H112" stroke="${violet}" stroke-width="2"/><circle cx="102" cy="43" r="3" fill="${violet}"/>${text(117, 47, "校排名（越靠上越好）", 13)}`;
    for (let t = 0; t <= 4; t++) {
      let yy = T + (plotH * t) / 4;
      out += `<path d="M${L} ${yy}H${w - R}" stroke="#ded8e6" stroke-dasharray="3 3"/>${text(L - 6, yy + 4, fmt(scoreMax * (1 - t / 4)), 12, "end", "#787183")}${text(w - R + 6, yy + 4, Math.round((rankMax * t) / 4), 12, "start", "#787183")}`;
    }
    const barW = Math.min(24, (plotW / exams.length) * 0.44);
    scores.forEach((v, i) => {
      if (v === null) return;
      const yy = sy(v),
        labelY = T + plotH + 16;
      out += `<rect x="${xx(i) - barW / 2}" y="${yy}" width="${barW}" height="${Math.max(0, T + plotH - yy)}" fill="${gold}" stroke="#b58d39" stroke-width=".7"/>${text(xx(i), labelY, fmt(v), 12, "middle", "#795c20")}`;
    });
    let d = "",
      run = false;
    ranks.forEach((r, i) => {
      if (r === null) {
        run = false;
        return;
      }
      d += (run ? "L" : "M") + xx(i) + " " + ry(r) + " ";
      run = true;
    });
    out += `<path d="${d}" fill="none" stroke="${violet}" stroke-width="2.6"/>`;
    ranks.forEach((r, i) => {
      if (r === null) return;
      const yy = ry(r),
        labelY = Math.max(T + 12, Math.min(T + plotH - 10, yy - 13));
      out += `<circle cx="${xx(i)}" cy="${yy}" r="4" fill="${violet}" stroke="white" stroke-width="1.1"/><rect x="${xx(i) - 19}" y="${labelY - 15}" width="38" height="20" rx="2" fill="#e7d8ed" stroke="#b49bc4" stroke-width=".7"/>${text(xx(i), labelY, r, 13, "middle", ink, 600)}`;
    });
    exams.forEach((e, i) => {
      const label = e.name;
      const a =
        label.length > 4 ? [label.slice(0, 2), label.slice(2)] : [label];
      out += multiline(xx(i), h - 30, a, 12, 16);
    });
    if (!scores.some((v) => v !== null))
      out += text(
        w / 2,
        T + plotH / 2,
        "本期未开设 / 无成绩",
        15,
        "middle",
        "#82778b",
      );
    if (!ranks.some((v) => v !== null))
      out += text(
        w / 2,
        h - 7,
        "未提供校排名，折线留空",
        11,
        "middle",
        "#82778b",
      );
    return out + "</g>";
  }
  function render(all, key, options = {}) {
    const groups = [];
    for (let i = 0; i < all.length; i += 8) groups.push(all.slice(i, i + 8));
    return groups.map((exams, page) => {
      const student = all.flatMap((e) => e.rows).find((r) => r.key === key),
        mode = options.scoreMode ?? "configured";
      const totalLabel = mode === "raw" ? "原表" : "折算";
      const subjects = Trends.subjects,
        headers = [
          ["考试名称"],
          ...subjects.flatMap((s) => [
            [s, "分数"],
            [s, "校排名"],
          ]),
          [totalLabel, "总分"],
          ["总分", "校排名"],
          ["总分", "班级排名"],
        ];
      const widths = [102, ...subjects.flatMap(() => [50, 55]), 62, 74, 74];
      const totalW = widths.reduce((a, b) => a + b, 0),
        scale = 1152 / totalW;
      const startX = 44,
        tableY = 143,
        headH = 57,
        rowH = 36,
        tableH = headH + exams.length * rowH,
        chartY = tableY + tableH + 42,
        gap = 15,
        cw = (1152 - gap * 2) / 3,
        ch = (H - chartY - 152 - gap * 2) / 3;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(student?.name)}A4个人成绩报告"><rect width="1240" height="1754" fill="white"/><g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif"><rect x="0" y="0" width="1240" height="74" fill="${violet}"/>${text(W / 2, 49, "各科历次考试成绩对比分析", 31, "middle", "white", 600)}${text(44, 111, "姓名：" + (student?.name ?? "—"), 21, "start", ink, 600)}${text(340, 111, "班级：八年4班　学号：" + (student?.shortId ?? "—"), 17)}${text(1196, 111, `${all.length}次考试${groups.length > 1 ? " · 第" + (page + 1) + "/" + groups.length + "页" : ""}`, 16, "end", "#766b82")}`;
      svg += `<rect x="${startX}" y="${tableY}" width="1152" height="${headH}" fill="#ede8f3"/><rect x="${startX}" y="${tableY}" width="1152" height="${tableH}" fill="none" stroke="${violet}" stroke-width="1.4"/>`;
      let px = startX;
      headers.forEach((label, j) => {
        const width = widths[j] * scale;
        svg += `<path d="M${px} ${tableY}V${tableY + tableH}" stroke="${line}"/>${multiline(px + width / 2, tableY + (label.length === 1 ? 34 : 24), label, 15, 20)}`;
        px += width;
      });
      for (let i = 0; i < exams.length; i++) {
        const e = exams[i],
          row = e.rows.find((r) => r.key === key),
          v = Trends.scoreView(e, row, mode);
        const vals = [
          e.name,
          ...subjects.flatMap((s) => [v.scores?.[s], row?.schoolRanks[s]]),
          v.total,
          row?.schoolRank,
          v.classRank,
        ];
        const yy = tableY + headH + i * rowH;
        svg += `<path d="M${startX} ${yy}H1196" stroke="${line}"/>`;
        let xx = startX;
        vals.forEach((value, j) => {
          const width = widths[j] * scale;
          svg += text(
            xx + width / 2,
            yy + 24,
            j === 0 ? String(value) : fmt(value),
            j === 0 ? 15 : 16,
            "middle",
          );
          xx += width;
        });
      }
      svg += text(
        44,
        tableY + tableH + 25,
        `分数口径：${mode === "configured" ? "按导入配置，已折算列不重复换算" : mode === "raw" ? "原表分数" : "单科统一折算"}；${mode === "raw" ? "总分及排名沿用原表" : "总分为显示分数合计，班排同步重算，校排沿用原表"}。分数标签统一在柱底。`,
        14,
        "start",
        "#766b82",
      );
      ["总分", ...subjects].forEach((sub, i) => {
        svg += chart(
          all,
          exams,
          key,
          sub,
          44 + (cw + gap) * (i % 3),
          chartY + (ch + gap) * Math.floor(i / 3),
          cw,
          ch,
          mode,
        );
      });
      return svg;
    });
  }
  root.A4Report = { render, W, H };
})(typeof window !== "undefined" ? window : globalThis);
