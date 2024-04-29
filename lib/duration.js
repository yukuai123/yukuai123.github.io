!(function (t, s) {
  typeof exports === 'object' && 'undefined' !== typeof module
    ? (module.exports = s())
    : typeof define === 'function' && define.amd
    ? define(s)
    : ((t = 'undefined' !== typeof globalThis ? globalThis : t || self).dayjs_plugin_duration =
        s());
})(this, function () {
  let t;
  let s;
  let n = 1e3;
  let i = 6e4;
  let e = 36e5;
  let r = 864e5;
  let o = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g;
  let u = 31536e6;
  let d = 2628e6;
  let a =
    /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
  let h = {
    years: u,
    months: d,
    days: r,
    hours: e,
    minutes: i,
    seconds: n,
    milliseconds: 1,
    weeks: 6048e5,
  };
  let c = function (t) {
    return t instanceof g;
  };
  let f = function (t, s, n) {
    return new g(t, n, s.$l);
  };
  let m = function (t) {
    return s.p(t) + 's';
  };
  let l = function (t) {
    return t < 0;
  };
  let $ = function (t) {
    return l(t) ? Math.ceil(t) : Math.floor(t);
  };
  let y = function (t) {
    return Math.abs(t);
  };
  let v = function (t, s) {
    return t
      ? l(t)
        ? { negative: !0, format: '' + y(t) + s }
        : { negative: !1, format: '' + t + s }
      : { negative: !1, format: '' };
  };
  var g = (function () {
    function l(t, s, n) {
      let i = this;
      if (
        ((this.$d = {}),
        (this.$l = n),
        void 0 === t && ((this.$ms = 0), this.parseFromMilliseconds()),
        s)
      )
        return f(t * h[m(s)], this);
      if (typeof t === 'number') return (this.$ms = t), this.parseFromMilliseconds(), this;
      if (typeof t === 'object')
        return (
          Object.keys(t).forEach(function (s) {
            i.$d[m(s)] = t[s];
          }),
          this.calMilliseconds(),
          this
        );
      if (typeof t === 'string') {
        let e = t.match(a);
        if (e) {
          let r = e.slice(2).map(function (t) {
            return null != t ? Number(t) : 0;
          });
          return (
            (this.$d.years = r[0]),
            (this.$d.months = r[1]),
            (this.$d.weeks = r[2]),
            (this.$d.days = r[3]),
            (this.$d.hours = r[4]),
            (this.$d.minutes = r[5]),
            (this.$d.seconds = r[6]),
            this.calMilliseconds(),
            this
          );
        }
      }
      return this;
    }
    let y = l.prototype;
    return (
      (y.calMilliseconds = function () {
        let t = this;
        this.$ms = Object.keys(this.$d).reduce(function (s, n) {
          return s + (t.$d[n] || 0) * h[n];
        }, 0);
      }),
      (y.parseFromMilliseconds = function () {
        let t = this.$ms;
        (this.$d.years = $(t / u)),
          (t %= u),
          (this.$d.months = $(t / d)),
          (t %= d),
          (this.$d.days = $(t / r)),
          (t %= r),
          (this.$d.hours = $(t / e)),
          (t %= e),
          (this.$d.minutes = $(t / i)),
          (t %= i),
          (this.$d.seconds = $(t / n)),
          (t %= n),
          (this.$d.milliseconds = t);
      }),
      (y.toISOString = function () {
        let t = v(this.$d.years, 'Y');
        let s = v(this.$d.months, 'M');
        let n = +this.$d.days || 0;
        this.$d.weeks && (n += 7 * this.$d.weeks);
        let i = v(n, 'D');
        let e = v(this.$d.hours, 'H');
        let r = v(this.$d.minutes, 'M');
        let o = this.$d.seconds || 0;
        this.$d.milliseconds &&
          ((o += this.$d.milliseconds / 1e3), (o = Math.round(1e3 * o) / 1e3));
        let u = v(o, 'S');
        let d = t.negative || s.negative || i.negative || e.negative || r.negative || u.negative;
        let a = e.format || r.format || u.format ? 'T' : '';
        let h =
          (d ? '-' : '') +
          'P' +
          t.format +
          s.format +
          i.format +
          a +
          e.format +
          r.format +
          u.format;
        return h === 'P' || h === '-P' ? 'P0D' : h;
      }),
      (y.toJSON = function () {
        return this.toISOString();
      }),
      (y.format = function (t) {
        let n = t || 'YYYY-MM-DDTHH:mm:ss';
        let i = {
          Y: this.$d.years,
          YY: s.s(this.$d.years, 2, '0'),
          YYYY: s.s(this.$d.years, 4, '0'),
          M: this.$d.months,
          MM: s.s(this.$d.months, 2, '0'),
          D: this.$d.days,
          DD: s.s(this.$d.days, 2, '0'),
          H: this.$d.hours,
          HH: s.s(this.$d.hours, 2, '0'),
          m: this.$d.minutes,
          mm: s.s(this.$d.minutes, 2, '0'),
          s: this.$d.seconds,
          ss: s.s(this.$d.seconds, 2, '0'),
          SSS: s.s(this.$d.milliseconds, 3, '0'),
        };
        return n.replace(o, function (t, s) {
          return s || String(i[t]);
        });
      }),
      (y.as = function (t) {
        return this.$ms / h[m(t)];
      }),
      (y.get = function (t) {
        let s = this.$ms;
        let n = m(t);
        return (
          n === 'milliseconds' ? (s %= 1e3) : (s = n === 'weeks' ? $(s / h[n]) : this.$d[n]), s || 0
        );
      }),
      (y.add = function (t, s, n) {
        let i;
        return (
          (i = s ? t * h[m(s)] : c(t) ? t.$ms : f(t, this).$ms),
          f(this.$ms + i * (n ? -1 : 1), this)
        );
      }),
      (y.subtract = function (t, s) {
        return this.add(t, s, !0);
      }),
      (y.locale = function (t) {
        let s = this.clone();
        return (s.$l = t), s;
      }),
      (y.clone = function () {
        return f(this.$ms, this);
      }),
      (y.humanize = function (s) {
        return t().add(this.$ms, 'ms').locale(this.$l).fromNow(!s);
      }),
      (y.valueOf = function () {
        return this.asMilliseconds();
      }),
      (y.milliseconds = function () {
        return this.get('milliseconds');
      }),
      (y.asMilliseconds = function () {
        return this.as('milliseconds');
      }),
      (y.seconds = function () {
        return this.get('seconds');
      }),
      (y.asSeconds = function () {
        return this.as('seconds');
      }),
      (y.minutes = function () {
        return this.get('minutes');
      }),
      (y.asMinutes = function () {
        return this.as('minutes');
      }),
      (y.hours = function () {
        return this.get('hours');
      }),
      (y.asHours = function () {
        return this.as('hours');
      }),
      (y.days = function () {
        return this.get('days');
      }),
      (y.asDays = function () {
        return this.as('days');
      }),
      (y.weeks = function () {
        return this.get('weeks');
      }),
      (y.asWeeks = function () {
        return this.as('weeks');
      }),
      (y.months = function () {
        return this.get('months');
      }),
      (y.asMonths = function () {
        return this.as('months');
      }),
      (y.years = function () {
        return this.get('years');
      }),
      (y.asYears = function () {
        return this.as('years');
      }),
      l
    );
  })();
  let p = function (t, s, n) {
    return t
      .add(s.years() * n, 'y')
      .add(s.months() * n, 'M')
      .add(s.days() * n, 'd')
      .add(s.hours() * n, 'h')
      .add(s.minutes() * n, 'm')
      .add(s.seconds() * n, 's')
      .add(s.milliseconds() * n, 'ms');
  };
  return function (n, i, e) {
    (t = e),
      (s = e().$utils()),
      (e.duration = function (t, s) {
        let n = e.locale();
        return f(t, { $l: n }, s);
      }),
      (e.isDuration = c);
    let r = i.prototype.add;
    let o = i.prototype.subtract;
    (i.prototype.add = function (t, s) {
      return c(t) ? p(this, t, 1) : r.bind(this)(t, s);
    }),
      (i.prototype.subtract = function (t, s) {
        return c(t) ? p(this, t, -1) : o.bind(this)(t, s);
      });
  };
});
