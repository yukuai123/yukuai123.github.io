!(function (t, e) {
  typeof exports === 'object' && 'undefined' !== typeof module
    ? (module.exports = e())
    : typeof define === 'function' && define.amd
    ? define(e)
    : ((t = 'undefined' !== typeof globalThis ? globalThis : t || self).dayjs = e());
})(this, function () {
  let t = 1e3;
  let e = 6e4;
  let n = 36e5;
  let r = 'millisecond';
  let i = 'second';
  let s = 'minute';
  let u = 'hour';
  let a = 'day';
  let o = 'week';
  let c = 'month';
  let f = 'quarter';
  let h = 'year';
  let d = 'date';
  let l = 'Invalid Date';
  let $ =
    /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/;
  let y = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g;
  let M = {
    name: 'en',
    weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
    months:
      'January_February_March_April_May_June_July_August_September_October_November_December'.split(
        '_'
      ),
    ordinal: function (t) {
      let e = ['th', 'st', 'nd', 'rd'];
      let n = t % 100;
      return '[' + t + (e[(n - 20) % 10] || e[n] || e[0]) + ']';
    },
  };
  let m = function (t, e, n) {
    let r = String(t);
    return !r || r.length >= e ? t : '' + Array(e + 1 - r.length).join(n) + t;
  };
  let v = {
    s: m,
    z: function (t) {
      let e = -t.utcOffset();
      let n = Math.abs(e);
      let r = Math.floor(n / 60);
      let i = n % 60;
      return (e <= 0 ? '+' : '-') + m(r, 2, '0') + ':' + m(i, 2, '0');
    },
    m: function t(e, n) {
      if (e.date() < n.date()) return -t(n, e);
      let r = 12 * (n.year() - e.year()) + (n.month() - e.month());
      let i = e.clone().add(r, c);
      let s = n - i < 0;
      let u = e.clone().add(r + (s ? -1 : 1), c);
      return +(-(r + (n - i) / (s ? i - u : u - i)) || 0);
    },
    a: function (t) {
      return t < 0 ? Math.ceil(t) || 0 : Math.floor(t);
    },
    p: function (t) {
      return (
        { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t] ||
        String(t || '')
          .toLowerCase()
          .replace(/s$/, '')
      );
    },
    u: function (t) {
      return void 0 === t;
    },
  };
  let g = 'en';
  let D = {};
  D[g] = M;
  let p = '$isDayjsObject';
  let S = function (t) {
    return t instanceof _ || !(!t || !t[p]);
  };
  let w = function t(e, n, r) {
    let i;
    if (!e) return g;
    if (typeof e === 'string') {
      let s = e.toLowerCase();
      D[s] && (i = s), n && ((D[s] = n), (i = s));
      let u = e.split('-');
      if (!i && u.length > 1) return t(u[0]);
    } else {
      let a = e.name;
      (D[a] = e), (i = a);
    }
    return !r && i && (g = i), i || (!r && g);
  };
  let O = function (t, e) {
    if (S(t)) return t.clone();
    let n = typeof e === 'object' ? e : {};
    return (n.date = t), (n.args = arguments), new _(n);
  };
  let b = v;
  (b.l = w),
    (b.i = S),
    (b.w = function (t, e) {
      return O(t, { locale: e.$L, utc: e.$u, x: e.$x, $offset: e.$offset });
    });
  var _ = (function () {
    function M(t) {
      (this.$L = w(t.locale, null, !0)),
        this.parse(t),
        (this.$x = this.$x || t.x || {}),
        (this[p] = !0);
    }
    let m = M.prototype;
    return (
      (m.parse = function (t) {
        (this.$d = (function (t) {
          let e = t.date;
          let n = t.utc;
          if (e === null) return new Date(NaN);
          if (b.u(e)) return new Date();
          if (e instanceof Date) return new Date(e);
          if (typeof e === 'string' && !/Z$/i.test(e)) {
            let r = e.match($);
            if (r) {
              let i = r[2] - 1 || 0;
              let s = (r[7] || '0').substring(0, 3);
              return n
                ? new Date(Date.UTC(r[1], i, r[3] || 1, r[4] || 0, r[5] || 0, r[6] || 0, s))
                : new Date(r[1], i, r[3] || 1, r[4] || 0, r[5] || 0, r[6] || 0, s);
            }
          }
          return new Date(e);
        })(t)),
          this.init();
      }),
      (m.init = function () {
        let t = this.$d;
        (this.$y = t.getFullYear()),
          (this.$M = t.getMonth()),
          (this.$D = t.getDate()),
          (this.$W = t.getDay()),
          (this.$H = t.getHours()),
          (this.$m = t.getMinutes()),
          (this.$s = t.getSeconds()),
          (this.$ms = t.getMilliseconds());
      }),
      (m.$utils = function () {
        return b;
      }),
      (m.isValid = function () {
        return !(this.$d.toString() === l);
      }),
      (m.isSame = function (t, e) {
        let n = O(t);
        return this.startOf(e) <= n && n <= this.endOf(e);
      }),
      (m.isAfter = function (t, e) {
        return O(t) < this.startOf(e);
      }),
      (m.isBefore = function (t, e) {
        return this.endOf(e) < O(t);
      }),
      (m.$g = function (t, e, n) {
        return b.u(t) ? this[e] : this.set(n, t);
      }),
      (m.unix = function () {
        return Math.floor(this.valueOf() / 1e3);
      }),
      (m.valueOf = function () {
        return this.$d.getTime();
      }),
      (m.startOf = function (t, e) {
        let n = this;
        let r = !!b.u(e) || e;
        let f = b.p(t);
        let l = function (t, e) {
          let i = b.w(n.$u ? Date.UTC(n.$y, e, t) : new Date(n.$y, e, t), n);
          return r ? i : i.endOf(a);
        };
        let $ = function (t, e) {
          return b.w(
            n.toDate()[t].apply(n.toDate('s'), (r ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e)),
            n
          );
        };
        let y = this.$W;
        let M = this.$M;
        let m = this.$D;
        let v = 'set' + (this.$u ? 'UTC' : '');
        switch (f) {
          case h:
            return r ? l(1, 0) : l(31, 11);
          case c:
            return r ? l(1, M) : l(0, M + 1);
          case o:
            var g = this.$locale().weekStart || 0;
            var D = (y < g ? y + 7 : y) - g;
            return l(r ? m - D : m + (6 - D), M);
          case a:
          case d:
            return $(v + 'Hours', 0);
          case u:
            return $(v + 'Minutes', 1);
          case s:
            return $(v + 'Seconds', 2);
          case i:
            return $(v + 'Milliseconds', 3);
          default:
            return this.clone();
        }
      }),
      (m.endOf = function (t) {
        return this.startOf(t, !1);
      }),
      (m.$set = function (t, e) {
        let n;
        let o = b.p(t);
        let f = 'set' + (this.$u ? 'UTC' : '');
        let l = ((n = {}),
        (n[a] = f + 'Date'),
        (n[d] = f + 'Date'),
        (n[c] = f + 'Month'),
        (n[h] = f + 'FullYear'),
        (n[u] = f + 'Hours'),
        (n[s] = f + 'Minutes'),
        (n[i] = f + 'Seconds'),
        (n[r] = f + 'Milliseconds'),
        n)[o];
        let $ = o === a ? this.$D + (e - this.$W) : e;
        if (o === c || o === h) {
          let y = this.clone().set(d, 1);
          y.$d[l]($), y.init(), (this.$d = y.set(d, Math.min(this.$D, y.daysInMonth())).$d);
        } else l && this.$d[l]($);
        return this.init(), this;
      }),
      (m.set = function (t, e) {
        return this.clone().$set(t, e);
      }),
      (m.get = function (t) {
        return this[b.p(t)]();
      }),
      (m.add = function (r, f) {
        let d;
        let l = this;
        r = Number(r);
        let $ = b.p(f);
        let y = function (t) {
          let e = O(l);
          return b.w(e.date(e.date() + Math.round(t * r)), l);
        };
        if ($ === c) return this.set(c, this.$M + r);
        if ($ === h) return this.set(h, this.$y + r);
        if ($ === a) return y(1);
        if ($ === o) return y(7);
        let M = ((d = {}), (d[s] = e), (d[u] = n), (d[i] = t), d)[$] || 1;
        let m = this.$d.getTime() + r * M;
        return b.w(m, this);
      }),
      (m.subtract = function (t, e) {
        return this.add(-1 * t, e);
      }),
      (m.format = function (t) {
        let e = this;
        let n = this.$locale();
        if (!this.isValid()) return n.invalidDate || l;
        let r = t || 'YYYY-MM-DDTHH:mm:ssZ';
        let i = b.z(this);
        let s = this.$H;
        let u = this.$m;
        let a = this.$M;
        let o = n.weekdays;
        let c = n.months;
        let f = n.meridiem;
        let h = function (t, n, i, s) {
          return (t && (t[n] || t(e, r))) || i[n].slice(0, s);
        };
        let d = function (t) {
          return b.s(s % 12 || 12, t, '0');
        };
        let $ =
          f ||
          function (t, e, n) {
            let r = t < 12 ? 'AM' : 'PM';
            return n ? r.toLowerCase() : r;
          };
        return r.replace(y, function (t, r) {
          return (
            r ||
            (function (t) {
              switch (t) {
                case 'YY':
                  return String(e.$y).slice(-2);
                case 'YYYY':
                  return b.s(e.$y, 4, '0');
                case 'M':
                  return a + 1;
                case 'MM':
                  return b.s(a + 1, 2, '0');
                case 'MMM':
                  return h(n.monthsShort, a, c, 3);
                case 'MMMM':
                  return h(c, a);
                case 'D':
                  return e.$D;
                case 'DD':
                  return b.s(e.$D, 2, '0');
                case 'd':
                  return String(e.$W);
                case 'dd':
                  return h(n.weekdaysMin, e.$W, o, 2);
                case 'ddd':
                  return h(n.weekdaysShort, e.$W, o, 3);
                case 'dddd':
                  return o[e.$W];
                case 'H':
                  return String(s);
                case 'HH':
                  return b.s(s, 2, '0');
                case 'h':
                  return d(1);
                case 'hh':
                  return d(2);
                case 'a':
                  return $(s, u, !0);
                case 'A':
                  return $(s, u, !1);
                case 'm':
                  return String(u);
                case 'mm':
                  return b.s(u, 2, '0');
                case 's':
                  return String(e.$s);
                case 'ss':
                  return b.s(e.$s, 2, '0');
                case 'SSS':
                  return b.s(e.$ms, 3, '0');
                case 'Z':
                  return i;
              }
              return null;
            })(t) ||
            i.replace(':', '')
          );
        });
      }),
      (m.utcOffset = function () {
        return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
      }),
      (m.diff = function (r, d, l) {
        let $;
        let y = this;
        let M = b.p(d);
        let m = O(r);
        let v = (m.utcOffset() - this.utcOffset()) * e;
        let g = this - m;
        let D = function () {
          return b.m(y, m);
        };
        switch (M) {
          case h:
            $ = D() / 12;
            break;
          case c:
            $ = D();
            break;
          case f:
            $ = D() / 3;
            break;
          case o:
            $ = (g - v) / 6048e5;
            break;
          case a:
            $ = (g - v) / 864e5;
            break;
          case u:
            $ = g / n;
            break;
          case s:
            $ = g / e;
            break;
          case i:
            $ = g / t;
            break;
          default:
            $ = g;
        }
        return l ? $ : b.a($);
      }),
      (m.daysInMonth = function () {
        return this.endOf(c).$D;
      }),
      (m.$locale = function () {
        return D[this.$L];
      }),
      (m.locale = function (t, e) {
        if (!t) return this.$L;
        let n = this.clone();
        let r = w(t, e, !0);
        return r && (n.$L = r), n;
      }),
      (m.clone = function () {
        return b.w(this.$d, this);
      }),
      (m.toDate = function () {
        return new Date(this.valueOf());
      }),
      (m.toJSON = function () {
        return this.isValid() ? this.toISOString() : null;
      }),
      (m.toISOString = function () {
        return this.$d.toISOString();
      }),
      (m.toString = function () {
        return this.$d.toUTCString();
      }),
      M
    );
  })();
  let k = _.prototype;
  return (
    (O.prototype = k),
    [
      ['$ms', r],
      ['$s', i],
      ['$m', s],
      ['$H', u],
      ['$W', a],
      ['$M', c],
      ['$y', h],
      ['$D', d],
    ].forEach(function (t) {
      k[t[1]] = function (e) {
        return this.$g(e, t[0], t[1]);
      };
    }),
    (O.extend = function (t, e) {
      return t.$i || (t(e, _, O), (t.$i = !0)), O;
    }),
    (O.locale = w),
    (O.isDayjs = S),
    (O.unix = function (t) {
      return O(1e3 * t);
    }),
    (O.en = D[g]),
    (O.Ls = D),
    (O.p = {}),
    O
  );
});
