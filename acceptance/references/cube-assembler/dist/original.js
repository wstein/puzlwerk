// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/preact/dist/preact.mjs
var n;
var t$1;
var i$1;
var u$2;
var f$2;
var e$1;
var o$2;
var l$1;
var c$1;
var a$2;
var h$1 = Symbol.for("pv");
var p$1 = {};
var v$1 = [];
var y$1 = /^m(i|n|o|s|text|space)$/;
var w$1 = Array.isArray;
var d$1 = v$1.slice;
var _$1 = Object.assign;
function g$1(n) {
	n && n.parentNode && n.remove();
}
function k$1(n, t, r) {
	var i, u, f, e = {}, o = arguments.length;
	for (f in t) "key" == f ? i = t[f] : "ref" == f && "function" != typeof n ? u = t[f] : e[f] = t[f];
	return o > 2 && (e.children = o > 3 ? d$1.call(arguments, 2) : r), m$1(n, e, i, u, null);
}
function m$1(r, i, u, f, e) {
	var o = {
		type: r,
		props: i,
		key: u,
		ref: f,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: h$1,
		__v: e || ++t$1,
		__i: -1,
		__u: 0
	};
	return !e && n.vnode && n.vnode(o), o;
}
function M(n) {
	return n.children;
}
function x(n, t) {
	this.props = n, this.context = t, this.__g = 0;
}
function S(n, t) {
	if (null == t) return n.__ && S(n.__, n.__i + 1);
	for (var r; t < n.__k.length; t++) if ((r = n.__k[t]) && r.__e) return r.__e;
	return "function" != typeof n.type || n.props.__P ? null : S(n);
}
function C$1(n) {
	if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
		return t && (n.__e = t.__e);
	}), C$1(n);
}
function j(t) {
	(8 & t.__g || (t.__g |= 8, i$1.push(t), f$2++)) && u$2 == n.debounceRendering || ((u$2 = n.debounceRendering) || queueMicrotask)(L);
}
function L() {
	var t, r, o, l, c, a, s, p, v;
	try {
		for (r = 1; i$1.length;) i$1.length > r && i$1.sort(e$1), t = i$1.shift(), r = i$1.length, 8 & t.__g && (l = void 0, c = void 0, a = (c = (o = t).__v).__e, s = [], p = [], (v = o.__P) && ((l = _$1({ constructor: h$1 }, c)).__v = c.__v + 1, n.vnode && n.vnode(l), V(v, l, c, o.__n, v.namespaceURI, 32 & c.__u ? [a] : null, s, a || S(c), 32 & c.__u, p), l.__v = c.__v, l.__.__k[l.__i] = l, D$1(s, l, p), c.__ = c.__e = null, l.__e != a && C$1(l)));
	} finally {
		(f$2 = i$1.length) && (u$2 || queueMicrotask)(L);
	}
}
function H(n, t, r, i, u, f, e, o, l, c, a) {
	var s, h, y, w, d, _, g = i.__k || v$1, k = t.length;
	for (l = I(r, t, g, l, k), s = 0; s < k; s++) null != (y = r.__k[s]) && (h = ~y.__i && g[y.__i] || p$1, y.__i = s, _ = V(n, y, h, u, f, e, o, l, c, a), w = y.__e, (h.ref != y.ref || 8 & h.__u) && (h.ref && F(h.ref, null, y, h), y.ref && a.push(y.ref, y.__c || w, y)), d = d || w, 4 & y.__u ? (l = q(y, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), y.__u &= -21);
	return r.__e = d, l;
}
function I(n, t, r, i, u) {
	var f, e, o, l, c, a, s, p, v, y = r.length, d = y, _ = 0, g = 0, k = n.__k = Array(u);
	for (f = 0; f < u; f++) null != (e = t[f]) && "boolean" != typeof e && "function" != typeof e ? ("object" != typeof e || e.constructor === String ? e = k[f] = m$1(null, e) : w$1(e) ? e = k[f] = m$1(M, { children: e }) : e.constructor === h$1 && e.__b ? e = k[f] = m$1(e.type, e.props, e.key, e.ref, e.__v) : k[f] = e, l = f + _, e.__ = n, e.__b = n.__b + 1, o = null, ~(c = e.__i = O(e, r, l, d)) && (d--, (o = r[c]) && (o.__u |= 2)), o && o.__v ? (e.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (u > y ? _-- : u < y && _++), "function" != typeof e.type && (e.__u |= 4))) : k[f] = null;
	if (g) {
		for (a = [], s = [], f = 0; f < u; f++) if ((e = k[f]) && 16 & e.__u) {
			for (_ = 0, p = a.length; _ < p;) a[v = _ + p >> 1] < e.__i ? _ = v + 1 : p = v;
			a[_] = e.__i, s[f] = _ + 1;
		}
		for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
	}
	if (d) for (f = 0; f < y; f++) !(o = r[f]) || 2 & o.__u || (o.__e == i && (i = S(o)), G$1(o, o));
	return i;
}
function q(n, t, r, i) {
	var u, f, e, o;
	if ("function" == typeof n.type) {
		if (n.props.__P) return t;
		if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = q(u[f], t, r, !1));
		return t;
	}
	for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), e = n.__e, o = t; o && 8 == o.nodeType;) o = o.nextSibling;
	for (e != o && (!i && r.moveBefore && e.parentNode ? r.moveBefore(e, t) : r.insertBefore(e, t || null)), t = e; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
	return t;
}
function O(n, t, r, i) {
	var u, f = n.key, e = n.type, o = t[r], l = o && !(2 & o.__u);
	if (null === o && null == f || l && f == o.key && e == o.type) return r;
	if (i > (l ? 1 : 0)) {
		for (u = r - 1; u >= 0; u--) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
		for (u = r + 1; u < t.length; u++) if ((o = t[u]) && !(2 & o.__u) && f == o.key && e == o.type) return u;
	}
	return -1;
}
function P(n, t, r) {
	r ??= "", "-" == t[0] ? n.setProperty(t, r) : n[t] = r;
}
function T$1(n, t, r, i, u) {
	var f, e;
	if ("style" == t) if ("string" == typeof r) n.style.cssText = r;
	else {
		if ("string" == typeof i && (n.style.cssText = i = ""), i) for (t in i) r && t in r || P(n.style, t);
		if (r) for (t in r) i && r[t] == i[t] || P(n.style, t, r[t]);
	}
	else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = r, r && i || (e = a$2[t] || (a$2[t] = N(t)), (n.__a || (n.__a = {}))[t] = c$1, f = t != (t = t.replace(l$1, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), r ? n.addEventListener(t, e, f) : n.removeEventListener(t, e, f));
	else {
		if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
		else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
			n[t] = null == r ? "" : r;
			return;
		} catch (n) {}
		if ("function" == typeof r) return;
		null == r || !1 === r && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == r ? "" : r);
	}
}
function N(t) {
	return function(r) {
		var i = this.__e;
		if (i) {
			if (i = i[t], null == r[o$2]) r[o$2] = c$1++;
			else if (r[o$2] < this.__a[t]) return;
			return i(n.event ? n.event(r) : r);
		}
	};
}
function V(t, r, i, u, f, e, o, l, c, a) {
	var s, p, y, d, k, b, m, $, C, j, L, I, q, A, O, P, T, N, V = r.type;
	if (r.constructor !== h$1) return null;
	128 & i.__u && (c = 32 & i.__u, s = i.__c.__z) && (r.__u |= c, p = e = [], 8 == s.nodeType ? l = z$1(s, e) : e.push(s), l = e[0] || l), (s = n.__b) && s(r);
	n: if ("function" == typeof V) {
		y = o.length;
		try {
			if ($ = r.props, C = (s = V.prototype) && s.render, j = (s = V.contextType) && u[s.__c], L = s ? j ? j.props.value : s.__ : u, (d = i.__c) ? (r.__c = d, 2 & d.__g && (d.__g |= 1)) : (C ? r.__c = d = new V($, L) : (r.__c = d = new x($, L), d.constructor = V, d.render = J), j && j.sub(d), d.state || (d.state = {}), d.__n = u, d.__g |= 8, d.__h = [], d.__k = []), C && (d.__s || (d.__s = d.state), V.getDerivedStateFromProps && (d.__s == d.state && (d.__s = _$1({}, d.__s)), _$1(d.__s, V.getDerivedStateFromProps($, d.__s)))), k = d.props, b = d.state, d.__v = r, i.__c) {
				if ($ !== k && C && !V.getDerivedStateFromProps && d.componentWillReceiveProps && d.componentWillReceiveProps($, L), r.__v == i.__v && !(8 & d.__g) || !(4 & d.__g) && d.shouldComponentUpdate && !1 === d.shouldComponentUpdate($, d.__s, L)) {
					r.__v != i.__v && (d.props = $, d.state = d.__s, d.__g &= -9), r.__e = i.__e, r.__k = i.__k, r.__k.some(function(n) {
						n && (n.__ = r);
					}), v$1.push.apply(d.__h, d.__k), d.__k = [], d.__h.length && o.push(d), l = S(i);
					break n;
				}
				d.componentWillUpdate && d.componentWillUpdate($, d.__s, L), C && d.componentDidUpdate && d.__h.push(function() {
					d.componentDidUpdate(k, b, m);
				});
			} else C && !V.getDerivedStateFromProps && d.componentWillMount && d.componentWillMount(), C && d.componentDidMount && d.__h.push(d.componentDidMount);
			if (d.context = L, d.props = $, d.__P = t, d.__g &= -5, I = n.__r, q = 0, C) d.state = d.__s, d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), v$1.push.apply(d.__h, d.__k), d.__k = [];
			else do
				d.__g &= -9, I && I(r), s = d.render(d.props, d.state, d.context), d.state = d.__s;
			while (8 & d.__g && ++q < 25);
			d.state = d.__s, d.getChildContext && (u = _$1({}, u, d.getChildContext())), C && i.__c && d.getSnapshotBeforeUpdate && (m = d.getSnapshotBeforeUpdate(k, b)), A = s && s.type === M && null == s.key ? s.props.children : s, $.__P && (s = l, f = (t = $.__P).namespaceURI, c = e = null, i.props && i.props.__P != t && (i.__k.some(function(n) {
				n && G$1(n, n);
			}), i.__k = null), l = i.__k ? S(i, 0) : null), l = H(t, w$1(A) ? A : [A], r, i, u, f, e, o, l, c, a), $.__P && (r.__e = null, l = s), r.__u &= -161, p && p.some(g$1), d.__h.length && o.push(d), 1 & d.__g && (d.__g &= -4);
		} catch (t) {
			if (o.length = y, r.__v = null, c || e) if (t.then) {
				if (O = 0, r.__u |= 128 | c, e) {
					for (~(T = e.indexOf(l || void 0)) || (T = e.length); (N = e[T - 1]) && 8 == N.nodeType;) T--;
					for (; T < e.length; T++) if (N = e[T]) {
						if (e[T] = null, 8 == N.nodeType) {
							if (N.data.startsWith("$s")) O++ || (P = N);
							else if (O && N.data.startsWith("/$s") && !--O) break;
						} else if (!O) break;
					}
				}
				if (!P) {
					for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
					P = l;
				}
				(s = z$1(P = r.__c.__z || (r.__c.__z = P))) ? (r.__e = P, l = s) : r.__e = l, l = l && l.nextSibling;
			} else e && e.some(g$1);
			else r.__e = i.__e;
			r.__k || (r.__k = i.__k || []), t.then || B$1(r), n.__e(t, r, i);
		}
	} else l = r.__e = E$1(i.__e, r, i, u, f, e, o, c, a, t);
	return (s = n.diffed) && s(r), l;
}
function z$1(n, t) {
	if (n && 8 == n.nodeType && n.data.startsWith("$s")) for (var r = 1; n = n.nextSibling;) {
		if (8 == n.nodeType) {
			if (n.data.startsWith("$s")) r++;
			else if (n.data.startsWith("/$s") && !--r) return n;
		}
		t && t.push(n);
	}
}
function B$1(n) {
	n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(B$1));
}
function D$1(t, r, i) {
	for (var u = 0; u < i.length;) F(i[u++], i[u++], i[u++]);
	n.__c && n.__c(r, t), t.some(function(r) {
		try {
			t = r.__h, r.__h = [], t.some(function(n) {
				n.call(r);
			});
		} catch (t) {
			n.__e(t, r.__v);
		}
	});
}
function E$1(t, r, i, u, f, e, o, l, c, a) {
	var s, h, v, _, k, b, m, $, M, x = i.props || p$1, C = r.props, j = r.type;
	if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), e) {
		for (s = 0; s < e.length; s++) if ((k = e[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
			t = k, e[s] = null;
			break;
		}
	}
	if (!t) {
		if ($ = a.ownerDocument || document, !j) return $.createTextNode(C);
		t = $.createElementNS(f, j, C.is && C), l && (n.__m && n.__m(r, e), l = !1), e = null;
	}
	if (j) {
		if (a = "template" == j && t.content || t, e = "textarea" == j && null != C.defaultValue ? null : e && d$1.call(a.childNodes), !l && e) for (x = {}, s = 0; s < t.attributes.length; s++) x[(k = t.attributes[s]).name] = k.value;
		for (s in x) k = x[s], "dangerouslySetInnerHTML" == s ? v = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T$1(t, s, null, k, f);
		for (s in M = 1 & i.__u, C) k = C[s], "children" == s ? _ = k : "dangerouslySetInnerHTML" == s ? h = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(x[s] !== k || M && null != k) || T$1(t, s, k, x[s], f);
		h ? (l || v && (h.__html == v.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), r.__k = []) : (v && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && y$1.test(j)) && (f = "http://www.w3.org/1999/xhtml"), H(a, w$1(_) ? _ : [_], r, i, u, f, e, o, e ? e[0] : i.__k && S(i, 0), l, c), e && e.some(g$1)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T$1(t, s, b, x[s], f), s = "checked", null != m && m != t[s] && T$1(t, s, m, x[s], f));
	} else x === C || l && t.data == C || (t.data = C);
	return t;
}
function F(t, r, i, u) {
	try {
		"function" == typeof t ? r ? r.__x = t(r) || 1 : u && (u = u.__c || u.__e) && (r = u.__x) && (u.__x = null, "function" == typeof r ? r() : t(null)) : t.current = r;
	} catch (t) {
		n.__e(t, i);
	}
}
function G$1(t, r, i) {
	var u, f, e, o;
	if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || F(u, null, r, t), u = t.__c) {
		if (u.componentWillUnmount) try {
			u.componentWillUnmount();
		} catch (t) {
			n.__e(t, r);
		}
		u.__P = u.__n = null;
	}
	if (u = t.__k) for (o = 0; o < u.length; o++) u[o] && G$1(u[o], r, "function" != typeof t.type || i && !t.props.__P);
	!i && (u = t.__c) && (u = u.__z) && (f = z$1(u, e = [])) && (u == t.__e && e.some(g$1), g$1(f), g$1(u)), (u = t.__e) && (i || g$1(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
}
function J(n, t, r) {
	return this.constructor(n, r);
}
function K(t, r) {
	var i, u, f, e;
	n.__ && n.__(t, r), 9 == r.nodeType && (r = r.documentElement), u = (i = t && 32 & t.__u) ? null : r.__k, r.__k = m$1(M, { children: [t] }), f = [], e = [], V(r, r.__k, u || p$1, p$1, r.namespaceURI, u ? null : r.firstChild ? d$1.call(r.childNodes) : null, f, u ? u.__e : r.firstChild, i, e), D$1(f, r.__k, e), r.__k.props.children = null;
}
n = { __e: function(n, t, r, i) {
	for (var u, e, o; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
		u.__g |= 4;
		try {
			if ((o = (e = u.constructor) && e.getDerivedStateFromError) && u.setState(e.getDerivedStateFromError(n)), u.componentDidCatch && (u.componentDidCatch(n, i || {}), o = 1), o && 8 & u.__g) return void (u.__g |= 2);
		} catch (t) {
			n = t;
		}
	}
	throw f$2 = 0, n;
} }, t$1 = 0, x.prototype.setState = function(n, t) {
	var r = this.__s;
	r && r != this.state || (r = this.__s = _$1({}, this.state)), "function" == typeof n && (n = n(_$1({}, r), this.props)), n && (_$1(r, n), this.__v && (t && this.__k.push(t), j(this)));
}, x.prototype.forceUpdate = function(n) {
	this.__v && (this.__g |= 4, n && this.__h.push(n), j(this));
}, x.prototype.render = M, i$1 = [], f$2 = 0, e$1 = function(n, t) {
	return n.__v.__b - t.__v.__b;
}, o$2 = Symbol(), l$1 = /(PointerCapture)$|Capture$/i, c$1 = 0, a$2 = {};
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/preact/hooks/dist/hooks.mjs
var t;
var r;
var u$1;
var i;
var o$1 = Object.is;
var f$1 = 0;
var c = [];
var e = [];
var a$1 = n;
var v = a$1.__b;
var l = a$1.__r;
var m = a$1.diffed;
var h = a$1.__c;
var s = a$1.unmount;
var p = a$1.__;
function y(n, t) {
	a$1.__h && a$1.__h(r, n, f$1 || t), f$1 = 0;
	var u = r.__H || (r.__H = {
		__: [],
		__h: []
	});
	return n >= u.__.length && u.__.push({}), u.__[n];
}
function d(n) {
	return f$1 = 1, _(G, n);
}
function _(n, u, i) {
	var f = y(t++, 2);
	if (f.t = n, !f.__c && (f.__ = [i ? i(u) : G(void 0, u), function(n) {
		var t = f.__N ? f.__N[0] : f.__[0], r = f.t(t, n);
		o$1(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
	}], f.__c = r, !r.__f)) {
		r.__f = !0;
		var c = r.shouldComponentUpdate;
		r.shouldComponentUpdate = function(n, t, r) {
			var u = this.__H;
			if (!u) return !0;
			var i = !1, f = this.props != n;
			if (u.__.some(function(n) {
				n.__N && (i = !0, o$1(n.__[0], n.__N[0]) || (f = !0));
			}), c) {
				var e = c.call(this, n, t, r);
				return i ? e || f : e;
			}
			return !i || f;
		};
	}
	return f.__;
}
function A(n, u) {
	var i = y(t++, 3);
	!a$1.__s && E(i.__H, u) && (i.__P = !0, i.__ = n, i.u = u, r.__H.__h.push(i));
}
function T(n) {
	return f$1 = 5, w(function() {
		return { current: n };
	}, []);
}
function w(n, r) {
	var u = y(t++, 7);
	return E(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
}
function g() {
	var n;
	do {
		for (; n = e.shift();) try {
			C(n);
		} catch (t) {
			a$1.__e(t, { __: (n = n.__P) && n.__v });
		}
		for (; n = c.shift();) {
			var t = n.__H;
			if (n.__P && t) try {
				t.__h.some(C), t.__h.some(D), t.__h = [];
			} catch (r) {
				t.__h = [], a$1.__e(r, n.__v);
			}
		}
	} while (e.length);
}
a$1.__b = function(n) {
	r = null, v && v(n);
}, a$1.__ = function(n, t) {
	n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p && p(n, t);
}, a$1.__r = function(n) {
	l && l(n), t = 0;
	var i = (r = n.__c).__H;
	i && (u$1 == r ? r.__h = [] : (i.__h.some(C), i.__h.some(D), t = 0), i.__h = [], i.__.some(function(n) {
		n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
	})), u$1 = r;
}, a$1.diffed = function(n) {
	m && m(n);
	var t = n.__c;
	t && t.__H && (t.__H.__h.length && B(c.push(t)), t.__H.__.some(function(n) {
		n.u && (n.__H = n.u);
	})), u$1 = r = null;
}, a$1.__c = function(n, t) {
	t.some(function(n) {
		try {
			n.__h.some(C), n.__h = n.__h.filter(function(n) {
				return !n.__ || D(n);
			});
		} catch (t) {
			n.__h = [function() {
				throw t;
			}];
		}
	}), h && h(n, t);
}, a$1.unmount = function(n) {
	s && s(n);
	var t, r, u = n.__c;
	u && u.__H && (u.__H.__.some(function(u) {
		try {
			if (u.__P && u.__c) {
				if (void 0 === r) {
					for (r = n.__; r && (!r.__c || !r.__c.__P);) r = r.__;
					r = r && r.__c;
				}
				u.__P = r, B(e.push(u));
			} else C(u);
		} catch (n) {
			t = n;
		}
	}), u.__H = void 0, t && a$1.__e(t, u.__v));
};
var k = "function" == typeof requestAnimationFrame;
function z(n) {
	var t, r = function() {
		clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
	}, u = setTimeout(r, 35);
	k && (t = requestAnimationFrame(r));
}
function B(n) {
	1 != n && i == a$1.requestAnimationFrame || ((i = a$1.requestAnimationFrame) || z)(g);
}
function C(n) {
	var t = r, u = n.__c;
	"function" == typeof u && (n.__c = void 0, u()), r = t;
}
function D(n) {
	var t = r;
	n.__c = n.__(), r = t;
}
function E(n, t) {
	return !n || n.length != t.length || t.some(function(t, r) {
		return !o$1(t, n[r]);
	});
}
function G(n, t) {
	return "function" == typeof t ? t(n) : t;
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Stdlib_JsError.js
function throwWithMessage(str) {
	throw new Error(str);
}
function panic$1(msg) {
	throw new Error(`Panic! ` + msg);
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Primitive_option.js
function some(x) {
	if (x === void 0) return { BS_PRIVATE_NESTED_SOME_NONE: 0 };
	else if (x !== null && x.BS_PRIVATE_NESTED_SOME_NONE !== void 0) return { BS_PRIVATE_NESTED_SOME_NONE: x.BS_PRIVATE_NESTED_SOME_NONE + 1 | 0 };
	else return x;
}
function fromNull(x) {
	if (x === null) return;
	else return some(x);
}
function valFromOption(x) {
	if (x === null || x.BS_PRIVATE_NESTED_SOME_NONE === void 0) return x;
	let depth = x.BS_PRIVATE_NESTED_SOME_NONE;
	if (depth === 0) return;
	else return { BS_PRIVATE_NESTED_SOME_NONE: depth - 1 | 0 };
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Stdlib_Option.js
function filter(opt, p) {
	if (opt !== void 0 && p(valFromOption(opt))) return opt;
}
function getOrThrow(x, message) {
	if (x !== void 0) return valFromOption(x);
	else return panic$1(message !== void 0 ? message : "Option.getOrThrow called for None value");
}
function mapOr(opt, $$default, f) {
	if (opt !== void 0) return f(valFromOption(opt));
	else return $$default;
}
function map(opt, f) {
	if (opt !== void 0) return some(f(valFromOption(opt)));
}
function flatMap(opt, f) {
	if (opt !== void 0) return f(valFromOption(opt));
}
function getOr(opt, $$default) {
	if (opt !== void 0) return valFromOption(opt);
	else return $$default;
}
function orElse(opt, other) {
	if (opt !== void 0) return opt;
	else return other;
}
function isSome(x) {
	return x !== void 0;
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Stdlib_Null.js
function fromOption(option) {
	if (option !== void 0) return valFromOption(option);
	else return null;
}
// src/core/view/CubeGesture.res.mjs
function get(param, axis) {
	if (axis !== 0) {
		if (axis !== 1) return param[2];
		else return param[1];
	} else return param[0];
}
function rotateX(param, angle) {
	let z = param[2];
	let y = param[1];
	return [
		param[0],
		y * Math.cos(angle) - z * Math.sin(angle),
		y * Math.sin(angle) + z * Math.cos(angle)
	];
}
function rotateY(param, angle) {
	let z = param[2];
	let x = param[0];
	return [
		x * Math.cos(angle) + z * Math.sin(angle),
		param[1],
		-x * Math.sin(angle) + z * Math.cos(angle)
	];
}
function along(param, distance, param$1) {
	return [
		param[0] + distance * param$1[0],
		param[1] + distance * param$1[1],
		param[2] + distance * param$1[2]
	];
}
function pointerRay(x, y, camera) {
	let tangent = Math.tan(Math.PI / 8);
	let ray = [
		(2 * x / camera.width - 1) * tangent * (camera.width / camera.height),
		(1 - 2 * y / camera.height) * tangent,
		-1
	];
	let unrotate = (v) => rotateY(rotateX(v, -camera.pitch), -camera.yaw);
	return [unrotate([
		0,
		0,
		camera.zoom
	]), unrotate(ray)];
}
function pickCubeSurface$1(x, y, camera) {
	if (camera.width <= 0 || camera.height <= 0) return null;
	let match = pointerRay(x, y, camera);
	let direction = match[1];
	let origin = match[0];
	let half = camera.size / 2;
	let closest = { contents: Number.POSITIVE_INFINITY };
	let hit = { contents: null };
	[
		[
			0,
			1,
			"R"
		],
		[
			0,
			-1,
			"L"
		],
		[
			1,
			1,
			"U"
		],
		[
			1,
			-1,
			"D"
		],
		[
			2,
			1,
			"F"
		],
		[
			2,
			-1,
			"B"
		]
	].forEach((param) => {
		let axis = param[0];
		let d = get(direction, axis);
		if (Math.abs(d) < 1e-8) return;
		let distance = (param[1] * half - get(origin, axis)) / d;
		if (!(distance > 0 && distance < closest.contents)) return;
		let point = along(origin, distance, direction);
		let inside = (value) => Math.abs(value) <= half + 1e-6;
		if (inside(point[0]) && inside(point[1]) && inside(point[2])) {
			closest.contents = distance;
			hit.contents = {
				face: param[2],
				point,
				normalAxis: axis
			};
			return;
		}
	});
	return hit.contents;
}
function pickStickerSurface$1(x, y, camera) {
	return fromOption(filter(fromNull(pickCubeSurface$1(x, y, camera)), (hit) => [
		0,
		1,
		2
	].every((axis) => {
		if (axis === hit.normalAxis) return true;
		let position = get(hit.point, axis) + camera.size / 2;
		let seam = Math.round(position);
		if (seam < 1 || seam > camera.size - 1) return true;
		else return Math.abs(position - seam) >= .07;
	})));
}
function project(point, camera) {
	let match = rotateX(rotateY(point, camera.yaw), camera.pitch);
	let z = match[2];
	let focal = camera.height / (2 * Math.tan(Math.PI / 8));
	return [focal * match[0] / (camera.zoom - z), -focal * match[1] / (camera.zoom - z)];
}
function viewPoint(point, camera) {
	return rotateX(rotateY(point, camera.yaw), camera.pitch);
}
function screenPoint(point, camera) {
	let match = project(point, camera);
	return [camera.width / 2 + match[0], camera.height / 2 + match[1]];
}
function tangentInPlane(axis, param, normalAxis) {
	let z = param[2];
	let y = param[1];
	let x = param[0];
	let match = axis !== 0 ? axis !== 1 ? [
		-y,
		x,
		0
	] : [
		z,
		0,
		-x
	] : [
		0,
		-z,
		y
	];
	return [
		normalAxis === 0 ? 0 : match[0],
		normalAxis === 1 ? 0 : match[1],
		normalAxis === 2 ? 0 : match[2]
	];
}
function inPlaneAxes(normalAxis) {
	return [
		0,
		1,
		2
	].filter((axis) => axis !== normalAxis);
}
function swipeAlong(hit, dx, dy, camera) {
	let axes = inPlaneAxes(hit.normalAxis);
	let match = project(hit.point, camera);
	let ay = match[1];
	let ax = match[0];
	let screen = (axis) => {
		let direction = tangentInPlane(axis, hit.point, hit.normalAxis);
		let match = project(along(hit.point, .1, direction), camera);
		return [match[0] - ax, match[1] - ay];
	};
	let match$1 = screen(axes[0]);
	let uy = match$1[1];
	let ux = match$1[0];
	let match$2 = screen(axes[1]);
	let vy = match$2[1];
	let vx = match$2[0];
	let det = ux * vy - uy * vx;
	if (Math.abs(det) < 1e-9) return;
	else return [axes, [(dx * vy - dy * vx) / det, (ux * dy - uy * dx) / det]];
}
function axisFaces(axis) {
	if (axis !== 0) {
		if (axis !== 1) return ["F", "B"];
		else return ["U", "D"];
	} else return ["R", "L"];
}
function layerIndex(coordinate, size) {
	return Math.max(0, Math.min(size - 1, Math.round(coordinate + (size - 1) / 2)));
}
function pickLayer(hit, dx, dy, camera, startPx) {
	if (Math.hypot(dx, dy) < startPx) return;
	else return flatMap(swipeAlong(hit, dx, dy, camera), (param) => {
		let along = param[1];
		let first = Math.abs(along[0]);
		let second = Math.abs(along[1]);
		if (Math.min(first, second) > .75 * Math.max(first, second)) return;
		let axis = param[0][first >= second ? 0 : 1];
		let coordinate = get(hit.point, axis);
		let positive = coordinate >= 0;
		let match = axisFaces(axis);
		let index = layerIndex(coordinate, camera.size);
		let depth = positive ? camera.size - index : index + 1;
		return {
			face: positive ? match[0] : match[1],
			depth: depth | 0,
			axis,
			sign: positive ? -1 : 1
		};
	});
}
function pickSwipeLayer$2(hit, dx, dy, camera, startPx) {
	return fromOption(pickLayer(hit, dx, dy, camera, startPx));
}
function swipeLayerAngle$1(hit, layer, dx, dy, camera) {
	let match = swipeAlong(hit, dx, dy, camera);
	if (match !== void 0) return layer.sign * .1 * match[1][match[0].indexOf(layer.axis)];
	else return 0;
}
function pressLevel$1(keys) {
	if (keys.shiftKey) return "wide";
	else return "layer";
}
function blockLayer(axis, from, to, size) {
	let low = Math.min(from, to);
	let high = Math.max(from, to);
	let positive = high === (size - 1 | 0) || low !== 0 && (low + high | 0) >= (size - 1 | 0);
	let match = axisFaces(axis);
	return {
		face: positive ? match[0] : match[1],
		depth: positive ? size - low | 0 : high + 1 | 0,
		width: (high - low | 0) + 1 | 0,
		axis,
		sign: positive ? -1 : 1
	};
}
function wholeCubeLayer$1(axis, size) {
	return blockLayer(axis, 0, size - 1 | 0, size);
}
function standardWideLayer(layer, size) {
	let width = size <= 2 ? 1 : Math.min(size - 1 | 0, Math.max(2, layer.depth));
	let newrecord = { ...layer };
	newrecord.width = width;
	newrecord.depth = width;
	return newrecord;
}
function seamAt(hit, layer, camera) {
	let position = get(hit.point, layer.axis) + camera.size / 2;
	let seam = Math.round(position);
	if (seam < 1 || seam > camera.size - 1 || Math.abs(position - seam) > .25) return;
	else return seam | 0;
}
function screenStep(hit, axis, camera) {
	let match = project(hit.point, camera);
	let unit = axis !== 0 ? axis !== 1 ? [
		0,
		0,
		1
	] : [
		0,
		1,
		0
	] : [
		1,
		0,
		0
	];
	let match$1 = project(along(hit.point, 1, unit), camera);
	return [match$1[0] - match[0], match$1[1] - match[1]];
}
function acrossAxis(hit, layer) {
	return inPlaneAxes(hit.normalAxis).find((axis) => axis !== layer.axis);
}
function onSeam(hit, layer, camera) {
	return isSome(seamAt(hit, layer, camera));
}
function seamBlock(axis, seam, size, towardPlus) {
	let plus = blockLayer(axis, seam - 1 | 0, size - 1 | 0, size);
	let minus = blockLayer(axis, 0, seam, size);
	let preferred = towardPlus ? plus : minus;
	if (size > 2 && getOr(preferred.width, 1) >= size) {
		if (towardPlus) return minus;
		else return plus;
	} else return preferred;
}
function defaultSeamBlock(hit, layer, camera) {
	return map(seamAt(hit, layer, camera), (seam) => seamBlock(layer.axis, seam, camera.size | 0, layer.sign < 0));
}
function seamWideLayer(hit, layer, dx, dy, camera) {
	let match = seamAt(hit, layer, camera);
	let match$1 = acrossAxis(hit, layer);
	if (match === void 0) return null;
	if (match$1 === void 0) return null;
	let match$2 = screenStep(hit, layer.axis, camera);
	let uy = match$2[1];
	let ux = match$2[0];
	let match$3 = screenStep(hit, match$1, camera);
	let vy = match$3[1];
	let vx = match$3[0];
	let det = ux * vy - uy * vx;
	let lean = Math.abs(det) < 1e-9 ? 0 : (dx * vy - dy * vx) / det;
	let turn = Math.abs(det) < 1e-9 ? 0 : (ux * dy - uy * dx) / det;
	let size = camera.size | 0;
	if (Math.abs(lean) < .1 * Math.hypot(lean, turn)) return null;
	else return seamBlock(layer.axis, match, size, lean > 0);
}
function seamChoice(hit, current, dx, dy, camera) {
	let layer = pickLayer(hit, dx, dy, camera, 0);
	if (layer !== void 0 && layer.axis === current.axis) return getOr(fromNull(seamWideLayer(hit, layer, dx, dy, camera)), current);
	else return current;
}
function seamSwitch$1(hit, drag, x, y, dx, dy, camera) {
	let onStartFace = mapOr(fromNull(pickCubeSurface$1(x, y, camera)), false, (now) => now.face === hit.face);
	let unchanged = {
		locked: !onStartFace,
		layer: drag.layer,
		angle: drag.angle,
		velocity: drag.velocity
	};
	if (!onStartFace) return unchanged;
	let next = seamChoice(hit, drag.layer, dx, dy, camera);
	if (next.face === drag.layer.face && next.depth === drag.layer.depth && getOr(next.width, 1) === getOr(drag.layer.width, 1)) return unchanged;
	let flip = next.sign === drag.layer.sign ? 1 : -1;
	return {
		locked: false,
		layer: next,
		angle: flip * drag.angle,
		velocity: flip * drag.velocity
	};
}
var defaultSwipeTuning = {
	startPx: 18,
	commitFraction: .35,
	flickMs: 120
};
function releasedQuarterTurns(angle, velocity, commitFraction, flickMs) {
	let quarter = Math.PI / 2;
	let quarters = (angle + Math.max(-quarter / 2, Math.min(quarter / 2, velocity * flickMs))) / quarter;
	let turns = Math.floor(Math.abs(quarters) + 1 - commitFraction);
	if (turns === 0) return 0;
	else return Math.sign(quarters) * turns;
}
function releaseDrag$1(angle, velocity, lastMoveTime, time, cancelled, tuning) {
	let velocity$1 = time - lastMoveTime > 100 ? 0 : velocity;
	if (cancelled) return {
		turns: 0,
		speed: 0
	};
	else return {
		turns: releasedQuarterTurns(angle, velocity$1, tuning.commitFraction, tuning.flickMs),
		speed: velocity$1
	};
}
function followDrag$1(previous, angle, time) {
	return {
		angle,
		velocity: (angle - previous.angle) / Math.max(time - previous.time, 8),
		time
	};
}
function swipeStart$2(hit, dx, dy, camera, startPx, level, seamWideEnabled) {
	if (Math.hypot(dx, dy) < startPx) return {
		kind: "wait",
		layer: null,
		seam: false,
		wide: false
	};
	let layer = pickLayer(hit, dx, dy, camera, startPx);
	if (layer === void 0) return {
		kind: "nothing",
		layer: null,
		seam: false,
		wide: false
	};
	let seam = seamWideEnabled && level === "layer" && onSeam(hit, layer, camera);
	let block = seam ? orElse(fromNull(seamWideLayer(hit, layer, dx, dy, camera)), defaultSeamBlock(hit, layer, camera)) : void 0;
	return {
		kind: "turn",
		layer: block !== void 0 ? block : level === "wide" ? standardWideLayer(layer, camera.size | 0) : layer,
		seam,
		wide: isSome(block)
	};
}
function gestureForPointerDown$1(pointerType, touches, hit, current) {
	let onSticker = isSome(hit == null ? void 0 : some(hit));
	if (pointerType !== "touch") {
		if (onSticker) return "pending";
		else return "camera";
	} else if (touches === 1) {
		if (onSticker) return "pending";
		else return "none";
	} else if (touches === 2) return "two-finger";
	else return getOr(current == null ? void 0 : some(current), "none");
}
function gestureWhenLayerMovesLocked$1(pointerType, touches, onCube, current) {
	if (pointerType !== "touch") return "camera";
	else if (touches === 1) {
		if (onCube) return "camera";
		else return "none";
	} else return gestureForPointerDown$1(pointerType, touches, null, current);
}
function lockedHintDue$1(lastShown, now) {
	if (lastShown !== null) return now - lastShown >= 5e3;
	else return true;
}
function gestureWhenSwipeTurnsNothing$1(pointerType) {
	if (pointerType === "touch") return "none";
	else return "camera";
}
function gestureAfterPointerUp$1(remaining, current) {
	if (remaining === 0 || current == null) return null;
	else if (current === "two-finger") return "none";
	else return current;
}
function twoFingerMotion$1(before, after) {
	let mid = (param) => {
		let match = param[1];
		let match$1 = param[0];
		return [(match$1[0] + match[0]) / 2, (match$1[1] + match[1]) / 2];
	};
	let spread = (param) => {
		let match = param[1];
		let match$1 = param[0];
		return Math.hypot(match$1[0] - match[0], match$1[1] - match[1]);
	};
	let match = mid(before);
	let match$1 = mid(after);
	let s0 = spread(before);
	return {
		dx: match$1[0] - match[0],
		dy: match$1[1] - match[1],
		scale: s0 > 0 ? spread(after) / s0 : 1
	};
}
function twoFingerLock$1(startSpread, spread, midpointTravel, lock) {
	switch (lock) {
		case "undecided":
			let spreadChange = Math.abs(spread - startSpread);
			if (spreadChange >= Math.max(24, .15 * startSpread) && spreadChange > midpointTravel) return "pinch";
			else if (midpointTravel >= 16 && midpointTravel > spreadChange) return "tilt";
			else return "undecided";
		case "tilt":
		case "pinch": return lock;
	}
}
function clampZoom$1(zoom, size) {
	return Math.max(2 + size, Math.min(8 + size * 3, zoom));
}
function wheelGesture$1(e) {
	if (e.ctrlKey || e.deltaMode !== 0) return "zoom";
	let whole = isFinite(e.deltaY) && Math.floor(e.deltaY) === e.deltaY;
	if (e.deltaX === 0 && whole && Math.abs(e.deltaY) >= 50) return "zoom";
	else return "tilt";
}
function nextWheelSwipe$1(swipe, time, deltaX, deltaY) {
	let magnitude = Math.hypot(deltaX, deltaY);
	if (swipe !== null && time - swipe.lastTime <= 150) {
		if (swipe.coasting) return {
			startTime: swipe.startTime,
			lastTime: time,
			dx: swipe.dx,
			dy: swipe.dy,
			lastMagnitude: swipe.lastMagnitude,
			shrinking: swipe.shrinking,
			coasting: swipe.coasting
		};
		let ratio = swipe.lastMagnitude > 0 ? magnitude / swipe.lastMagnitude : 0;
		let shrinking = ratio >= .6 && ratio < .99 ? swipe.shrinking + 1 | 0 : 0;
		if (shrinking >= 4) return {
			startTime: swipe.startTime,
			lastTime: time,
			dx: swipe.dx,
			dy: swipe.dy,
			lastMagnitude: magnitude,
			shrinking,
			coasting: true
		};
		else return {
			startTime: swipe.startTime,
			lastTime: time,
			dx: swipe.dx - deltaX,
			dy: swipe.dy - deltaY,
			lastMagnitude: magnitude,
			shrinking,
			coasting: swipe.coasting
		};
	}
	return {
		startTime: time,
		lastTime: time,
		dx: -deltaX,
		dy: -deltaY,
		lastMagnitude: magnitude,
		shrinking: 0,
		coasting: false
	};
}
// src/core/view/CubeGesture.gen.tsx
var pickCubeSurface = pickCubeSurface$1;
var pickStickerSurface = pickStickerSurface$1;
var swipeStartPx = 18;
var pickSwipeLayer$1 = pickSwipeLayer$2;
var swipeLayerAngle = swipeLayerAngle$1;
var pressLevel = pressLevel$1;
var wholeCubeLayer = wholeCubeLayer$1;
var seamSwitch = seamSwitch$1;
var releaseDrag = releaseDrag$1;
var followDrag = followDrag$1;
var swipeStart$1 = swipeStart$2;
var gestureForPointerDown = gestureForPointerDown$1;
var lockedHintDue = lockedHintDue$1;
var gestureWhenLayerMovesLocked = gestureWhenLayerMovesLocked$1;
var gestureWhenSwipeTurnsNothing = gestureWhenSwipeTurnsNothing$1;
var gestureAfterPointerUp = gestureAfterPointerUp$1;
var twoFingerMotion = twoFingerMotion$1;
var twoFingerLock = twoFingerLock$1;
var clampZoom = clampZoom$1;
var wheelGesture = wheelGesture$1;
var wheelSwipeGapMs = 150;
var nextWheelSwipe = nextWheelSwipe$1;
// src/client/view3d/cubeGesture.ts
function pickSwipeLayer(hit, dx, dy, camera, startPx = swipeStartPx) {
	return pickSwipeLayer$1(hit, dx, dy, camera, startPx);
}
function swipeStart(hit, dx, dy, camera, startPx, level, seamWideEnabled = false) {
	return swipeStart$1(hit, dx, dy, camera, startPx, level, seamWideEnabled);
}
// src/core/view/TurnFeel.res.mjs
function clamp01(progress) {
	return Math.min(1, Math.max(0, progress));
}
function magneticEase(progress) {
	let t = clamp01(progress);
	if (t === 0 || t === 1) return t;
	let x = t * t - 1;
	return 1 + 2 * x * x * x + 1 * x * x;
}
function turnEase(progress, overshoot) {
	if (overshoot) return magneticEase(progress);
	else {
		let rest = 1 - clamp01(progress);
		return 1 - rest * rest * rest;
	}
}
var quarter$1 = Math.PI / 2;
function magneticDragAngle$1(raw) {
	let detent = Math.round(raw / quarter$1) * quarter$1;
	let d = raw - detent;
	let distance = Math.abs(d);
	if (distance >= .3) return raw;
	else return detent + (d >= 0 ? 1 : -1) * .3 * (distance / .3) ** 2;
}
function magneticSettleAngle(from, target, speed, duration, progress) {
	let u = clamp01(progress);
	let distance = target - from;
	if (u <= .82) {
		let s = u / .82;
		let s2 = s * s;
		let s3 = s2 * s;
		let limit = 2 * Math.abs(distance);
		let startSlope = Math.max(-limit, Math.min(limit, speed * duration * .82));
		let endSlope = 2.4 * distance;
		return (2 * s3 - 3 * s2 + 1) * from + (s3 - 2 * s2 + s) * startSlope + (-2 * s3 + 3 * s2) * target + (s3 - s2) * endSlope;
	}
	let w = (u - .82) / (1 - .82);
	return target + Math.min(.035 * quarter$1, .3 * Math.abs(distance)) * (distance >= 0 ? 1 : -1) * Math.sin(Math.PI * w) * (1 - w);
}
function settleDuration(quarters, turnMs) {
	return Math.max(.75 * turnMs, Math.min(1.5 * turnMs, turnMs * quarters));
}
function scrambleDuration$1(turnMs) {
	return Math.round(turnMs * 85 / 160);
}
function turnClickGain$1(durationMs, soundOn) {
	if (soundOn) {
		if (durationMs < 120) return .05;
		else return .12;
	} else return 0;
}
var wideCueNotes$1 = [{
	frequency: 660,
	start: 0,
	duration: .06
}];
var modeCueGain$1 = .08;
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Stdlib_Array.js
function make(length, x) {
	if (length <= 0) return [];
	let arr = new Array(length);
	arr.fill(x);
	return arr;
}
function fromInitializer(length, f) {
	if (length <= 0) return [];
	let arr = new Array(length);
	for (let i = 0; i < length; ++i) arr[i] = f(i);
	return arr;
}
function reduce(arr, init, f) {
	return arr.reduce(f, init);
}
function findIndexOpt(array, finder) {
	let index = array.findIndex(finder);
	if (index !== -1) return index;
}
// src/core/app/Preferences.res.mjs
var soundCookie = "cube-assembler-capture-sound";
var viewHelpCookie$1 = "cube-assembler-view-help";
var seamWideCookie$1 = "cube-assembler-seam-wide";
var turnSoundCookie = "cube-assembler-turn-sound";
var turnMsCookie = "cube-assembler-turn-ms";
var turnOvershootCookie = "cube-assembler-turn-overshoot";
var swipeStartCookie = "cube-assembler-swipe-start-px";
var swipeCommitCookie = "cube-assembler-swipe-commit-percent";
var swipeFlickCookie = "cube-assembler-swipe-flick-ms";
var scrambleLengthCookie = "cube-assembler-scramble-length";
var scrambleInnerCookie = "cube-assembler-scramble-inner";
var layerMovesCookie$1 = "cube-assembler-layer-moves";
var vibrationCookie = "cube-assembler-vibration";
var vibrationMsCookie = "cube-assembler-vibration-ms";
"" + 31536e3.toString();
function readSelectionOption(cookies, name) {
	let prefix = name + `=`;
	return flatMap(cookies.split(";").map((prim) => prim.trim()).find((cookie) => cookie.startsWith(prefix)), (entry) => {
		try {
			return decodeURIComponent(entry.slice(prefix.length));
		} catch (exn) {
			return;
		}
	});
}
function readPreference$2(cookies, name, fallback) {
	let match = readSelectionOption(cookies, name);
	if (match === void 0) return fallback;
	switch (match) {
		case "0": return false;
		case "1": return true;
		default: return fallback;
	}
}
function preferenceCookie$1(name, on) {
	return name + `=` + (on ? "1" : "0") + "; Max-Age=31536000; Path=/; SameSite=Lax";
}
function savedNumber(cookies, name) {
	let value = parseInt(getOr(readSelectionOption(cookies, name), ""), 10);
	if (isFinite(value)) return value;
}
function readNumber(cookies, name, param) {
	let value = savedNumber(cookies, name);
	if (value !== void 0) return Math.min(param.max, Math.max(param.min, value));
	else return param.fallback;
}
function turnSoundOn$1(cookies) {
	return readPreference$2(cookies, turnSoundCookie, readPreference$2(cookies, soundCookie, true));
}
var turnMsRange = {
	min: 60,
	max: 400,
	fallback: 160
};
function readTurnFeel$1(cookies) {
	return {
		turnMs: readNumber(cookies, turnMsCookie, turnMsRange),
		overshoot: readPreference$2(cookies, turnOvershootCookie, true)
	};
}
var swipeRanges_startPx = {
	min: 8,
	max: 40,
	fallback: defaultSwipeTuning.startPx
};
var swipeRanges_commitPercent = {
	min: 15,
	max: 60,
	fallback: Math.round(defaultSwipeTuning.commitFraction * 100)
};
var swipeRanges_flickMs = {
	min: 0,
	max: 240,
	fallback: defaultSwipeTuning.flickMs
};
function readSwipeTuning$1(cookies) {
	return {
		startPx: readNumber(cookies, swipeStartCookie, swipeRanges_startPx),
		commitFraction: readNumber(cookies, swipeCommitCookie, swipeRanges_commitPercent) / 100,
		flickMs: readNumber(cookies, swipeFlickCookie, swipeRanges_flickMs)
	};
}
function readScrambleOptions$1(cookies) {
	let match = readSelectionOption(cookies, scrambleLengthCookie);
	let tmp;
	if (match !== void 0) switch (match) {
		case "long":
			tmp = "long";
			break;
		case "short":
			tmp = "short";
			break;
		default: tmp = "normal";
	}
	else tmp = "normal";
	return {
		length: tmp,
		innerLayers: readPreference$2(cookies, scrambleInnerCookie, true)
	};
}
function layerMovesOn$1(cookies) {
	return readPreference$2(cookies, layerMovesCookie$1, false);
}
function vibrationOn$1(cookies) {
	return readPreference$2(cookies, vibrationCookie, true);
}
var vibrationMsRange = {
	min: 10,
	max: 200,
	fallback: 50
};
function readVibrationMs$1(cookies) {
	return readNumber(cookies, vibrationMsCookie, vibrationMsRange);
}
var stickerlessCookie$1 = "cube-assembler-stickerless";
var autoRotateCookie$1 = "cube-assembler-auto-rotate";
// src/core/app/Preferences.gen.tsx
var stickerlessCookie = stickerlessCookie$1;
var autoRotateCookie = autoRotateCookie$1;
var viewHelpCookie = viewHelpCookie$1;
var seamWideCookie = seamWideCookie$1;
var layerMovesCookie = layerMovesCookie$1;
var layerMovesOn = layerMovesOn$1;
var readPreference$1 = readPreference$2;
var preferenceCookie = preferenceCookie$1;
var turnSoundOn = turnSoundOn$1;
var readTurnFeel = readTurnFeel$1;
var readSwipeTuning = readSwipeTuning$1;
var readScrambleOptions = readScrambleOptions$1;
var vibrationOn = vibrationOn$1;
var readVibrationMs = readVibrationMs$1;
// src/client/preferences.ts
function readPreference(cookies, name, fallback = false) {
	return readPreference$1(cookies, name, fallback);
}
// src/cube/CubePieces.res.mjs
function solvedColor(face) {
	switch (face) {
		case "U": return "W";
		case "R": return "R";
		case "F": return "G";
		case "D": return "Y";
		case "L": return "O";
		case "B": return "B";
	}
}
function cornerFaceletIndex(n, slot) {
	switch (slot) {
		case "TL": return 0;
		case "TR": return n - 1 | 0;
		case "BL": return n * (n - 1 | 0) | 0;
		case "BR": return (n * n | 0) - 1 | 0;
	}
}
var cornerSlots = [
	[
		["U", "BR"],
		["R", "TL"],
		["F", "TR"]
	],
	[
		["U", "TR"],
		["B", "TL"],
		["R", "TR"]
	],
	[
		["U", "TL"],
		["L", "TL"],
		["B", "TR"]
	],
	[
		["U", "BL"],
		["F", "TL"],
		["L", "TR"]
	],
	[
		["D", "TR"],
		["F", "BR"],
		["R", "BL"]
	],
	[
		["D", "BR"],
		["R", "BR"],
		["B", "BL"]
	],
	[
		["D", "BL"],
		["B", "BR"],
		["L", "BL"]
	],
	[
		["D", "TL"],
		["L", "BR"],
		["F", "BL"]
	]
];
var solvedCorners = cornerSlots.map((slots) => {
	let color = (i) => {
		let match = slots[i];
		return solvedColor(match[0]);
	};
	return [
		color(0),
		color(1),
		color(2)
	];
});
function edgeLineFaceletIndex(n, line, reverse, w) {
	let w$1 = reverse ? (n - 1 | 0) - w | 0 : w;
	switch (line) {
		case "TopLine": return w$1;
		case "BottomLine": return (n * (n - 1 | 0) | 0) + w$1 | 0;
		case "LeftLine": return w$1 * n | 0;
		case "RightLine": return (w$1 * n | 0) + (n - 1 | 0) | 0;
	}
}
var edgeLines = [
	[[
		"U",
		"BottomLine",
		false
	], [
		"F",
		"TopLine",
		false
	]],
	[[
		"U",
		"RightLine",
		false
	], [
		"R",
		"TopLine",
		true
	]],
	[[
		"U",
		"TopLine",
		false
	], [
		"B",
		"TopLine",
		true
	]],
	[[
		"U",
		"LeftLine",
		false
	], [
		"L",
		"TopLine",
		false
	]],
	[[
		"D",
		"TopLine",
		false
	], [
		"F",
		"BottomLine",
		false
	]],
	[[
		"D",
		"RightLine",
		false
	], [
		"R",
		"BottomLine",
		false
	]],
	[[
		"D",
		"BottomLine",
		false
	], [
		"B",
		"BottomLine",
		true
	]],
	[[
		"D",
		"LeftLine",
		false
	], [
		"L",
		"BottomLine",
		true
	]],
	[[
		"F",
		"RightLine",
		false
	], [
		"R",
		"LeftLine",
		false
	]],
	[[
		"F",
		"LeftLine",
		false
	], [
		"L",
		"RightLine",
		false
	]],
	[[
		"B",
		"LeftLine",
		false
	], [
		"R",
		"RightLine",
		false
	]],
	[[
		"B",
		"RightLine",
		false
	], [
		"L",
		"LeftLine",
		false
	]]
];
var solvedEdges = edgeLines.map((param) => [solvedColor(param[0][0]), solvedColor(param[1][0])]);
function identifyEdge(param) {
	let b = param[1];
	let a = param[0];
	return map(findIndexOpt(solvedEdges, (param) => {
		let s1 = param[1];
		let s0 = param[0];
		if (a === s0 && b === s1) return true;
		else if (a === s1) return b === s0;
		else return false;
	}), (index) => {
		let match = solvedEdges[index];
		return [index, a === match[0] ? 0 : 1];
	});
}
function permParity(perm) {
	let visited = make(perm.length, false);
	let cycles = { contents: 0 };
	perm.forEach((param, i) => {
		if (visited[i]) return;
		let j = i;
		while (!visited[j]) {
			visited[j] = true;
			j = perm[j];
		}
		cycles.contents = cycles.contents + 1 | 0;
	});
	return (perm.length - cycles.contents | 0) % 2 === 0;
}
function sum(values) {
	return reduce(values, 0, (a, b) => a + b | 0);
}
var wingMirrored = [
	true,
	false,
	false,
	true,
	false,
	false,
	true,
	true,
	false,
	true,
	true,
	false
];
function identifyWing(colors, edge, far) {
	return map(identifyEdge(colors), (param) => {
		let pair = param[0];
		let twin = (((param[1] + (far ? 1 : 0) | 0) + (wingMirrored[edge] ? 1 : 0) | 0) + (wingMirrored[pair] ? 1 : 0) | 0) % 2;
		return (pair << 1) + twin | 0;
	});
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Primitive_object.js
var for_in = (function(o, foo) {
	for (var x in o) foo(x);
});
function equal(a, b) {
	if (a === b) return true;
	let a_type = typeof a;
	if (a_type === "string" || a_type === "number" || a_type === "bigint" || a_type === "boolean" || a_type === "undefined" || a === null) return false;
	let b_type = typeof b;
	if (a_type === "function" || b_type === "function") throw {
		RE_EXN_ID: "Invalid_argument",
		_1: "equal: functional value",
		Error: /* @__PURE__ */ new Error()
	};
	if (b_type === "number" || b_type === "bigint" || b_type === "undefined" || b === null) return false;
	if (a.TAG !== b.TAG) return false;
	let len_a = a.length | 0;
	if (len_a === (b.length | 0)) {
		if (Array.isArray(a)) {
			let _i = 0;
			while (true) {
				let i = _i;
				if (i === len_a) return true;
				if (!equal(a[i], b[i])) return false;
				_i = i + 1 | 0;
			}
		} else if (a instanceof Date && b instanceof Date) return !(a > b || a < b);
		else {
			let result = { contents: true };
			let do_key_a = (key) => {
				if (!Object.prototype.hasOwnProperty.call(b, key)) {
					result.contents = false;
					return;
				}
			};
			let do_key_b = (key) => {
				if (!Object.prototype.hasOwnProperty.call(a, key) || !equal(b[key], a[key])) {
					result.contents = false;
					return;
				}
			};
			for_in(a, do_key_a);
			if (result.contents) for_in(b, do_key_b);
			return result.contents;
		}
	} else return false;
}
function notequal(a, b) {
	if ((typeof a === "number" || typeof a === "bigint") && (typeof b === "number" || typeof b === "bigint")) return a !== b;
	else return !equal(a, b);
}
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Stdlib.js
var panic = panic$1;
// src/cube/CubeGeometry.res.mjs
var faceKeys = [
	"U",
	"R",
	"F",
	"D",
	"L",
	"B"
];
function cellPosition(face, row, col, n) {
	let a = (-(n - 1 | 0) | 0) + (col << 1) | 0;
	let b = (n - 1 | 0) - (row << 1) | 0;
	switch (face) {
		case "B": return [
			-a | 0,
			b,
			-n | 0
		];
		case "D": return [
			a,
			-n | 0,
			b
		];
		case "F": return [
			a,
			b,
			n
		];
		case "L": return [
			-n | 0,
			b,
			a
		];
		case "R": return [
			n,
			b,
			-a | 0
		];
		case "U": return [
			a,
			n,
			-b | 0
		];
		default: return panic(`Unknown face ` + face);
	}
}
function quarterTurn(param, axis) {
	let z = param[2];
	let y = param[1];
	let x = param[0];
	switch (axis) {
		case "x": return [
			x,
			z,
			-y | 0
		];
		case "y": return [
			-z | 0,
			y,
			x
		];
		case "z": return [
			y,
			-x | 0,
			z
		];
	}
}
function key(param) {
	return param[0].toString() + `,` + param[1].toString() + `,` + param[2].toString();
}
var cellLookup = {};
function cellsBySize(n) {
	let sizeKey = n.toString();
	let cells = cellLookup[sizeKey];
	if (cells !== void 0) return cells;
	let cells$1 = {};
	faceKeys.forEach((face) => {
		for (let row = 0; row < n; ++row) for (let col = 0; col < n; ++col) cells$1[key(cellPosition(face, row, col, n))] = [
			face,
			row,
			col
		];
	});
	cellLookup[sizeKey] = cells$1;
	return cells$1;
}
function faceGrid(faces, face) {
	let grid = faces[face];
	if (grid !== void 0) return valFromOption(grid);
	else return panic(`Missing ` + face + ` face`);
}
function transform(faces, move) {
	let n = faceGrid(faces, "U").length;
	let out = {};
	faceKeys.forEach((face) => {
		let rows = [];
		for (let _row = 0; _row < n; ++_row) rows.push(make(n, ""));
		out[face] = rows;
	});
	let cellOf = cellsBySize(n);
	faceKeys.forEach((face) => {
		let source = faceGrid(faces, face);
		for (let row = 0; row < n; ++row) for (let col = 0; col < n; ++col) {
			let target = move(cellPosition(face, row, col, n));
			let cell = cellOf[key(target)];
			let match = cell !== void 0 ? cell : panic("Rotated sticker position is missing");
			let sticker = source[row][col];
			faceGrid(out, match[0])[match[1]][match[2]] = sticker;
		}
	});
	return out;
}
function repeat(point, axis, times) {
	let _point = point;
	let _remaining = (times % 4 + 4 | 0) % 4;
	while (true) {
		let remaining = _remaining;
		let point$1 = _point;
		if (remaining === 0) return point$1;
		_remaining = remaining - 1 | 0;
		_point = quarterTurn(point$1, axis);
	}
}
function rotateCube(faces, axis, quarterTurns) {
	return transform(faces, (point) => repeat(point, axis, quarterTurns));
}
function turnFace(faces, face, quarterTurns, depth) {
	let n = faceGrid(faces, "U").length;
	let axis;
	switch (face) {
		case "U":
		case "D":
			axis = "y";
			break;
		case "R":
		case "L":
			axis = "x";
			break;
		case "F":
		case "B": axis = "z";
	}
	let positive;
	switch (face) {
		case "U":
		case "R":
		case "F":
			positive = true;
			break;
		default: positive = false;
	}
	let axisValue = (param) => {
		switch (axis) {
			case "x": return param[0];
			case "y": return param[1];
			case "z": return param[2];
		}
	};
	let turns = positive ? quarterTurns : -quarterTurns | 0;
	return transform(faces, (point) => {
		if ((positive ? axisValue(point) : -axisValue(point) | 0) >= ((n - 1 | 0) - ((depth - 1 | 0) << 1) | 0)) return repeat(point, axis, turns);
		else return point;
	});
}
// src/core/view/AxisGizmo.res.mjs
function gizmoCamera$1(width, height, pitch, yaw) {
	return {
		width,
		height,
		zoom: 3.4,
		pitch,
		yaw,
		size: 1
	};
}
function scale(param, k) {
	return [
		param[0] * k,
		param[1] * k,
		param[2] * k
	];
}
function gizmoAxes$1(camera) {
	return [
		[
			"x",
			"R",
			[
				1,
				0,
				0
			]
		],
		[
			"y",
			"U",
			[
				0,
				1,
				0
			]
		],
		[
			"z",
			"F",
			[
				0,
				0,
				1
			]
		]
	].map((param) => {
		let direction = param[2];
		let depth = viewPoint(direction, camera)[2];
		return [depth, {
			name: param[0],
			face: param[1],
			center: screenPoint([
				0,
				0,
				0
			], camera),
			tip: screenPoint(scale(direction, .9), camera),
			label: screenPoint(scale(direction, 1.15), camera),
			front: depth > 0
		}];
	}).toSorted((param, param$1) => param[0] - param$1[0]).map((param) => param[1]);
}
function initialColorFrame$1(cube, n) {
	if (n % 2 !== 1) return {
		u: solvedColor("U"),
		r: solvedColor("R"),
		f: solvedColor("F"),
		d: solvedColor("D"),
		l: solvedColor("L"),
		b: solvedColor("B")
	};
	let mid = (n * n | 0) / 2 | 0;
	return {
		u: cube.u[mid],
		r: cube.r[mid],
		f: cube.f[mid],
		d: cube.d[mid],
		l: cube.l[mid],
		b: cube.b[mid]
	};
}
function advanceColorFrame$1(frame, size, face, depth, turns, width) {
	let middle = (size + 1 | 0) / 2 | 0;
	let containsMiddle = ((depth - width | 0) + 1 | 0) <= middle && depth >= middle;
	let whole = width === size && depth === size;
	if (turns === 0 || depth < 1 || depth > size || width < 1 || ((depth - width | 0) + 1 | 0) < 1 || !(whole || size % 2 === 1 && containsMiddle)) return frame;
	let match;
	switch (face) {
		case "U":
			match = ["y", 1];
			break;
		case "R":
			match = ["x", 1];
			break;
		case "F":
			match = ["z", 1];
			break;
		case "D":
			match = ["y", -1];
			break;
		case "L":
			match = ["x", -1];
			break;
		case "B": match = ["z", -1];
	}
	let axis = match[0];
	let turns$1 = turns * match[1] | 0;
	let rotated = rotateCube(Object.fromEntries([
		["U", [[frame.u]]],
		["R", [[frame.r]]],
		["F", [[frame.f]]],
		["D", [[frame.d]]],
		["L", [[frame.l]]],
		["B", [[frame.b]]]
	]), axis, turns$1);
	let color = (face) => faceGrid(rotated, face)[0][0];
	return {
		u: color("U"),
		r: color("R"),
		f: color("F"),
		d: color("D"),
		l: color("L"),
		b: color("B")
	};
}
// src/core/view/AxisGizmo.gen.tsx
var gizmoCamera = gizmoCamera$1;
var gizmoAxes = gizmoAxes$1;
var initialColorFrame = initialColorFrame$1;
var advanceColorFrame = advanceColorFrame$1;
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f = Symbol.for("pv");
var o = 0;
Array.isArray;
function a(t, e, n$1, u, a, i) {
	e || (e = {});
	var c, l, p = e;
	if ("ref" in p && "function" != typeof t) for (l in p = {}, e) "ref" == l ? c = e[l] : p[l] = e[l];
	var s = {
		type: t,
		props: p,
		key: n$1,
		ref: c,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: f,
		__v: --o,
		__i: -1,
		__u: 0
	};
	return (a || i) && (s.__source = a, s.__self = i), n.vnode && n.vnode(s), s;
}
// src/client/view3d/axisGizmo.tsx
var UNITS = 96;
var points = (list) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
function arrowhead(center, tip) {
	const dx = tip[0] - center[0], dy = tip[1] - center[1];
	const length = Math.hypot(dx, dy) || 1;
	const ux = dx / length, uy = dy / length;
	const back = 8, wide = 4.5;
	return points([
		[tip[0] + ux * 2, tip[1] + uy * 2],
		[tip[0] - ux * back - uy * wide, tip[1] - uy * back + ux * wide],
		[tip[0] - ux * back + uy * wide, tip[1] - uy * back - ux * wide]
	]);
}
function AxisGizmo({ frame, pitch, yaw, palette }) {
	const colors = {
		U: frame.u,
		R: frame.r,
		F: frame.f,
		D: frame.d,
		L: frame.l,
		B: frame.b
	};
	return /* @__PURE__ */ a("svg", {
		class: "cube-3d-gizmo",
		viewBox: `0 0 ${UNITS} ${UNITS}`,
		role: "img",
		"aria-label": "X, Y and Z axes of the cube, through its R, U and F faces",
		children: gizmoAxes(gizmoCamera(UNITS, UNITS, pitch, yaw)).map(({ name, face, center, tip, label, front }) => /* @__PURE__ */ a("g", {
			"data-axis": name,
			class: `cube-3d-gizmo-axis${front ? "" : " behind"}`,
			style: { color: palette[colors[face]] ?? "#888" },
			children: [
				/* @__PURE__ */ a("line", {
					x1: center[0],
					y1: center[1],
					x2: tip[0],
					y2: tip[1],
					class: "cube-3d-gizmo-outline"
				}),
				/* @__PURE__ */ a("line", {
					x1: center[0],
					y1: center[1],
					x2: tip[0],
					y2: tip[1],
					class: "cube-3d-gizmo-shaft"
				}),
				/* @__PURE__ */ a("polygon", {
					points: arrowhead(center, tip),
					class: "cube-3d-gizmo-tip"
				}),
				/* @__PURE__ */ a("text", {
					x: label[0],
					y: label[1],
					class: "cube-3d-gizmo-label",
					children: name.toUpperCase()
				})
			]
		}, name))
	});
}
// src/core/view/CubeViewState.res.mjs
var defaultStickerHex$1 = Object.fromEntries([
	["W", "#f7f6f1"],
	["O", "#ff7a1a"],
	["G", "#1e9e57"],
	["R", "#cf2a3a"],
	["B", "#2459d6"],
	["Y", "#f2d21b"]
]);
var autoRotateRadiansPerMs$1 = .008 / (1e3 / 60);
function facePreset$1(face) {
	let quarter = Math.PI / 2;
	let limit = quarter - .05;
	switch (face) {
		case "u": return {
			pitch: limit,
			yaw: 0
		};
		case "d": return {
			pitch: -limit,
			yaw: 0
		};
		case "f": return {
			pitch: 0,
			yaw: 0
		};
		case "b": return {
			pitch: 0,
			yaw: Math.PI
		};
		case "r": return {
			pitch: 0,
			yaw: -quarter
		};
		case "l": return {
			pitch: 0,
			yaw: quarter
		};
	}
}
function isometricAngles$1(back) {
	return {
		pitch: back ? -.52 : .52,
		yaw: -.74 + (back ? Math.PI : 0)
	};
}
function tiltPitch$1(pitch, up) {
	let limit = Math.PI / 2 - .05;
	if (up) return Math.min(limit, pitch + .2);
	else return Math.max(-limit, pitch - .2);
}
function rotateYaw$1(yaw, left) {
	return yaw + (left ? .2 : -.2);
}
function wheelZoom$1(zoom, deltaY, ctrlKey, puzzleSize) {
	return clampZoom$1(zoom + deltaY * (ctrlKey ? .05 : .01), puzzleSize);
}
function hexToRgb(hex) {
	let clean = hex.replace("#", "");
	let channel = (digits) => parseInt(digits, 16) / 255;
	if (clean.length === 3) return [
		channel(clean.charAt(0) + clean.charAt(0)),
		channel(clean.charAt(1) + clean.charAt(1)),
		channel(clean.charAt(2) + clean.charAt(2))
	];
	else return [
		channel(clean.substring(0, 2)),
		channel(clean.substring(2, 4)),
		channel(clean.substring(4, 6))
	];
}
function getFaceletColor(cube, n, face, x, y, z) {
	let last = n - 1 | 0;
	let match;
	switch (face) {
		case "u":
			match = [
				cube.u,
				(z * n | 0) + x | 0,
				"W"
			];
			break;
		case "d":
			match = [
				cube.d,
				((last - z | 0) * n | 0) + x | 0,
				"Y"
			];
			break;
		case "f":
			match = [
				cube.f,
				((last - y | 0) * n | 0) + x | 0,
				"G"
			];
			break;
		case "b":
			match = [
				cube.b,
				((last - y | 0) * n | 0) + (last - x | 0) | 0,
				"B"
			];
			break;
		case "r":
			match = [
				cube.r,
				((last - y | 0) * n | 0) + (last - z | 0) | 0,
				"R"
			];
			break;
		case "l": match = [
			cube.l,
			((last - y | 0) * n | 0) + z | 0,
			"O"
		];
	}
	return getOr(match[0][match[1]], match[2]);
}
function getDefaultZoom$1(puzzleSize) {
	return 3 + puzzleSize * 1.8;
}
function getFaceSeams(face, x, y, z, n) {
	let last = n - 1 | 0;
	switch (face) {
		case "u": return {
			top: z > 0,
			bot: z < last,
			rt: x < last,
			lt: x > 0
		};
		case "d": return {
			top: z < last,
			bot: z > 0,
			rt: x < last,
			lt: x > 0
		};
		case "f": return {
			top: y < last,
			bot: y > 0,
			rt: x < last,
			lt: x > 0
		};
		case "b": return {
			top: y < last,
			bot: y > 0,
			rt: x > 0,
			lt: x < last
		};
		case "r": return {
			top: y < last,
			bot: y > 0,
			rt: z > 0,
			lt: z < last
		};
		case "l": return {
			top: y < last,
			bot: y > 0,
			rt: z < last,
			lt: z > 0
		};
	}
}
function rotateVec(param, axis, angle) {
	let z = param[2];
	let y = param[1];
	let x = param[0];
	let cos = Math.cos(angle);
	let sin = Math.sin(angle);
	switch (axis) {
		case "x": return [
			x,
			y * cos - z * sin,
			y * sin + z * cos
		];
		case "y": return [
			x * cos + z * sin,
			y,
			-x * sin + z * cos
		];
		case "z": return [
			x * cos - y * sin,
			x * sin + y * cos,
			z
		];
	}
}
var autoRotateResumeDelayMs$1 = 1500;
var isometricPitch$1 = .52;
var isometricYaw$1 = -.74;
// src/core/view/CubeViewState.gen.tsx
var defaultStickerHex = defaultStickerHex$1;
var autoRotateResumeDelayMs = autoRotateResumeDelayMs$1;
var autoRotateRadiansPerMs = autoRotateRadiansPerMs$1;
var isometricPitch = isometricPitch$1;
var isometricYaw = isometricYaw$1;
var facePreset = facePreset$1;
var isometricAngles = isometricAngles$1;
var tiltPitch = tiltPitch$1;
var rotateYaw = rotateYaw$1;
var wheelZoom = wheelZoom$1;
var getDefaultZoom = getDefaultZoom$1;
// ../../../projects/cube-assembler/.worktrees/capture-recovery-author/node_modules/@rescript/runtime/lib/es6/Belt_Array.js
function concatMany(arrs) {
	let lenArrs = arrs.length;
	let totalLen = 0;
	for (let i = 0; i < lenArrs; ++i) totalLen = totalLen + arrs[i].length | 0;
	let result = new Array(totalLen);
	totalLen = 0;
	for (let j = 0; j < lenArrs; ++j) {
		let cur = arrs[j];
		for (let k = 0, k_finish = cur.length; k < k_finish; ++k) {
			result[totalLen] = cur[k];
			totalLen = totalLen + 1 | 0;
		}
	}
	return result;
}
// src/cube/CubeMoves.res.mjs
function cubeStateToFaces(cube, n) {
	let grid = (facelets) => fromInitializer(n, (row) => facelets.slice(row * n | 0, (row + 1 | 0) * n | 0));
	return Object.fromEntries([
		["U", grid(cube.u)],
		["R", grid(cube.r)],
		["F", grid(cube.f)],
		["D", grid(cube.d)],
		["L", grid(cube.l)],
		["B", grid(cube.b)]
	]);
}
function facesToCubeState(faces) {
	return {
		u: faceGrid(faces, "U").flat(),
		r: faceGrid(faces, "R").flat(),
		f: faceGrid(faces, "F").flat(),
		d: faceGrid(faces, "D").flat(),
		l: faceGrid(faces, "L").flat(),
		b: faceGrid(faces, "B").flat()
	};
}
function turnAxis(face) {
	switch (face) {
		case "U":
		case "D": return "y";
		case "R":
		case "L": return "x";
		case "F":
		case "B": return "z";
	}
}
function positive(face) {
	switch (face) {
		case "U":
		case "R":
		case "F": return true;
		default: return false;
	}
}
function applyCubeMove$1(cube, n, face, quarterTurns) {
	return facesToCubeState(turnFace(cubeStateToFaces(cube, n), face, quarterTurns, 1));
}
function applyCubeLayerMove(cube, n, face, depth, quarterTurns, width) {
	let outer = (depth - width | 0) + 1 | 0;
	if (outer < 1 || depth > n) return cube;
	if (depth === 1) return applyCubeMove$1(cube, n, face, quarterTurns);
	let faces = cubeStateToFaces(cube, n);
	let through = depth === n ? rotateCube(faces, turnAxis(face), positive(face) ? quarterTurns : -quarterTurns | 0) : turnFace(faces, face, quarterTurns, depth);
	return facesToCubeState(outer > 1 ? turnFace(through, face, -quarterTurns | 0, outer - 1 | 0) : through);
}
function layersOf(turn, size) {
	let width = getOr(turn.width, 1);
	if (width >= size) return "WholeCube";
	else if (width === 1) return {
		TAG: "Slice",
		_0: turn.depth
	};
	else return {
		TAG: "Block",
		outer: (turn.depth - width | 0) + 1 | 0,
		inner: turn.depth
	};
}
function faceLetter(face) {
	switch (face) {
		case "U": return "U";
		case "R": return "R";
		case "F": return "F";
		case "D": return "D";
		case "L": return "L";
		case "B": return "B";
	}
}
function axisLetter(axis) {
	switch (axis) {
		case "x": return "x";
		case "y": return "y";
		case "z": return "z";
	}
}
function formatCubeTurn$2(turn, size) {
	let half = Math.abs(turn.turns) === 2;
	let amount = half ? "2" : turn.turns < 0 ? "'" : "";
	let letter = faceLetter(turn.face);
	let depth = layersOf(turn, size);
	if (typeof depth !== "object") {
		let reversed = !positive(turn.face) && !half;
		return axisLetter(turnAxis(turn.face)) + (reversed ? turn.turns < 0 ? "" : "'" : amount);
	}
	if (depth.TAG === "Slice") {
		let depth$1 = depth._0;
		return (depth$1 > 1 ? depth$1.toString() : "") + letter + amount;
	}
	let inner = depth.inner;
	let outer = depth.outer;
	return (outer > 1 ? outer.toString() + `-` + inner.toString() : inner > 2 ? inner.toString() : "") + letter + "w" + amount;
}
function quarterOf(turns) {
	return (turns % 4 + 4 | 0) % 4;
}
function recordTurn(moves, turn) {
	let quarter = quarterOf(turn.turns);
	if (quarter === 0) return moves;
	let turns = quarter === 3 ? -1 : quarter;
	let width = getOr(turn.width, 1);
	let move = (turns) => {
		if (width > 1) return {
			face: turn.face,
			depth: turn.depth,
			width,
			turns
		};
		else return {
			face: turn.face,
			depth: turn.depth,
			turns
		};
	};
	let count = moves.length;
	let last = moves[count - 1 | 0];
	if (last === void 0) return concatMany([moves, [move(turns)]]);
	if (last.face !== turn.face || last.depth !== turn.depth || getOr(last.width, 1) !== width) return concatMany([moves, [move(turns)]]);
	let net = quarterOf(last.turns + turns | 0);
	let earlier = moves.slice(0, count - 1 | 0);
	if (net === 0) return earlier;
	else return concatMany([earlier, [move(net === 3 ? -1 : net)]]);
}
var scrambleFaces = [
	"U",
	"D",
	"L",
	"R",
	"F",
	"B"
];
var scrambleLengths = [
	11,
	20,
	40,
	60,
	80,
	100
];
function scrambleScale(length) {
	switch (length) {
		case "short": return .5;
		case "normal": return 1;
		case "long": return 1.5;
	}
}
function generateScrambleMoves$2(size, options, random) {
	let base = getOr(scrambleLengths[size - 2 | 0], 20);
	let scale = scrambleScale(getOr(options.length, "normal"));
	let length = Math.round(base * scale) | 0;
	let maxDepth = getOr(options.innerLayers, true) ? size / 2 | 0 : 1;
	let pick = (count) => Math.floor(random() * count) | 0;
	let lastAxis = { contents: void 0 };
	return fromInitializer(length, (i) => {
		let allowed = scrambleFaces.filter((face) => notequal(turnAxis(face), lastAxis.contents));
		let face = allowed[pick(allowed.length)];
		lastAxis.contents = turnAxis(face);
		let turns = [
			1,
			-1,
			2
		][pick(3)];
		return {
			face,
			depth: i === 0 && maxDepth >= 2 ? 2 : 1 + pick(maxDepth) | 0,
			turns
		};
	});
}
// src/cube/CubeMoves.gen.tsx
var applyCubeMove = applyCubeMove$1;
var formatCubeTurn$1 = formatCubeTurn$2;
var generateScrambleMoves$1 = generateScrambleMoves$2;
// src/cube/cubeMoves.ts
function formatCubeTurn(turn, size = Number.POSITIVE_INFINITY) {
	return formatCubeTurn$1(turn, size);
}
function generateScrambleMoves(size, options = {}, random = Math.random) {
	return generateScrambleMoves$1(size, options, random);
}
// src/core/view/CubeLabFingerprint.res.mjs
var format = "layer-prefix/v1";
function movesText(moves, size) {
	return moves.map((move) => formatCubeTurn$2(move, size)).join(" ");
}
function payload(moves, size) {
	return {
		size,
		moves: movesText(moves, size),
		format
	};
}
function json$1(moves, size) {
	return getOr(JSON.stringify(payload(moves, size)), "{}").replaceAll("<", "\\u003c");
}
// src/core/view/CubeLabFingerprint.gen.tsx
var json = json$1;
// src/client/cubeLabFingerprint.ts
var CUBELAB_MOVES_ID = "cubelab-moves";
var cubeLabMovesJson = (moves, size) => json(moves, size);
// src/client/view3d/useCubeHelpHint.ts
var FIRST_TOUCH_DELAY_MS = 1e4;
var IDLE_DELAY_MS = 2e4;
var ACTIVE_PLAY_LIMIT_MS = 18e5;
function useCubeHelpHint(enabled, onAutoOff) {
	const [visible, setVisible] = d(enabled);
	const touched = T(false);
	const activePointers = T(/* @__PURE__ */ new Set());
	const hideTimer = T(null);
	const showTimer = T(null);
	const playTimer = T(null);
	const activeSince = T(null);
	const activePlayMs = T(0);
	const disabled = T(false);
	const stopActivePlay = () => {
		if (playTimer.current !== null) clearTimeout(playTimer.current);
		playTimer.current = null;
		if (activeSince.current !== null) {
			activePlayMs.current += Date.now() - activeSince.current;
			activeSince.current = null;
		}
	};
	const startActivePlay = () => {
		if (activeSince.current !== null) return;
		activeSince.current = Date.now();
		playTimer.current = setTimeout(() => {
			playTimer.current = null;
			stopActivePlay();
			disabled.current = true;
			clearShowTimer();
			setVisible(false);
			onAutoOff();
		}, Math.max(0, ACTIVE_PLAY_LIMIT_MS - activePlayMs.current));
	};
	const clearShowTimer = () => {
		if (showTimer.current !== null) clearTimeout(showTimer.current);
		showTimer.current = null;
	};
	const showWhenIdle = () => {
		clearShowTimer();
		showTimer.current = setTimeout(() => {
			showTimer.current = null;
			stopActivePlay();
			if (activePointers.current.size === 0) setVisible(true);
		}, IDLE_DELAY_MS);
	};
	const pointerDown = (id) => {
		if (!enabled || disabled.current) return;
		activePointers.current.add(id);
		clearShowTimer();
		startActivePlay();
		if (!touched.current) {
			touched.current = true;
			hideTimer.current = setTimeout(() => {
				hideTimer.current = null;
				setVisible(false);
			}, FIRST_TOUCH_DELAY_MS);
		} else if (hideTimer.current === null) setVisible(false);
	};
	const pointerUp = (id) => {
		if (!enabled || disabled.current) return;
		activePointers.current.delete(id);
		if (activePointers.current.size === 0 && touched.current) showWhenIdle();
	};
	const activity = () => {
		pointerDown(-1);
		pointerUp(-1);
	};
	A(() => () => {
		if (hideTimer.current !== null) clearTimeout(hideTimer.current);
		clearShowTimer();
		stopActivePlay();
	}, []);
	return {
		visible,
		pointerDown,
		pointerUp,
		activity
	};
}
// src/client/view3d/cubeView3DPresentation.tsx
function CubeView3DPresentation({ isSupported, canvasRef, handleKeyDown, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, pressMode, coarsePointer, setPreset, resetView, isScrambling, toggleScramble, randomState, undoLastTurn, moves, publicMoves = moves, isTurning, resetCube, isInitialCube, puzzleSize, isStickerless, onToggleStickerless, isRotating, onToggleAutoRotate, allowLayerMoves = true, layerMoves, onToggleLayerMoves, lockedHint, gizmo }) {
	const showFace = (face) => {
		const { pitch, yaw } = facePreset(face);
		setPreset(pitch, yaw);
	};
	const helpEnabled = readPreference(document.cookie, viewHelpCookie, true);
	const seamWideEnabled = readPreference(document.cookie, seamWideCookie);
	const help = useCubeHelpHint(helpEnabled, () => {
		document.cookie = preferenceCookie(viewHelpCookie, false);
	});
	return /* @__PURE__ */ a("div", {
		class: "cube-3d-container",
		children: !isSupported ? /* @__PURE__ */ a("div", {
			class: "cube-3d-unsupported",
			children: /* @__PURE__ */ a("p", { children: "WebGL is not available in your browser." })
		}) : /* @__PURE__ */ a(M, { children: [/* @__PURE__ */ a("div", {
			class: "cube-3d-canvas-wrap",
			onPointerDown: (event) => help.pointerDown(event.pointerId),
			onPointerUp: (event) => help.pointerUp(event.pointerId),
			onPointerCancel: (event) => help.pointerUp(event.pointerId),
			tabIndex: 0,
			onKeyDown: handleKeyDown,
			role: "region",
			"aria-label": "3D Rubik's cube interactive canvas",
			children: [
				/* @__PURE__ */ a("canvas", {
					ref: canvasRef,
					class: "cube-3d-canvas",
					onPointerDown: handlePointerDown,
					onPointerMove: handlePointerMove,
					onPointerUp: handlePointerUp,
					onPointerCancel: handlePointerUp,
					onLostPointerCapture: handlePointerUp,
					onContextMenu: (e) => e.preventDefault(),
					onWheel: (event) => {
						help.activity();
						handleWheel(event);
					},
					"aria-label": "Interactive 3D Rubik's Cube Viewer"
				}),
				gizmo,
				pressMode && pressMode !== "layer" && /* @__PURE__ */ a("div", {
					class: "cube-3d-press-mode",
					role: "status",
					children: "Wide turn: drag to turn the touched layers"
				}),
				lockedHint && /* @__PURE__ */ a("div", {
					class: "cube-3d-press-mode",
					role: "status",
					children: "Locked - tap the lock to move layers"
				}),
				help.visible && /* @__PURE__ */ a("div", {
					class: "cube-3d-hint",
					children: coarsePointer ? /* @__PURE__ */ a(M, { children: [
						"Swipe a sticker to turn its layer; gaps are inactive",
						seamWideEnabled && "; swipe near a gap and lean toward a side for a wide turn",
						" ",
						"• Two fingers on the cube turn it, beside it rotate the view • Pinch to zoom"
					] }) : /* @__PURE__ */ a(M, { children: [
						"Swipe a sticker to turn its layer; gaps are inactive",
						seamWideEnabled && "; swipe near a gap and lean toward a side for a wide turn",
						" ",
						"• Shift makes a wide turn • Two fingers on the cube turn the whole cube • Drag the background or swipe two fingers beside the cube to rotate the view • Pinch or scroll to zoom"
					] })
				})
			]
		}), /* @__PURE__ */ a("div", {
			class: "cube-3d-toolbar",
			children: [
				/* @__PURE__ */ a("div", {
					class: "cube-3d-section",
					children: [/* @__PURE__ */ a("span", {
						class: "cube-3d-label",
						children: "Faces:"
					}), /* @__PURE__ */ a("div", {
						class: "cube-3d-presets",
						children: [
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("u"),
								title: "Up face",
								children: "Up (U)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("r"),
								title: "Right face",
								children: "Right (R)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("f"),
								title: "Front face",
								children: "Front (F)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("d"),
								title: "Down face",
								children: "Down (D)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("l"),
								title: "Left face",
								children: "Left (L)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => showFace("b"),
								title: "Back face",
								children: "Back (B)"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => resetView(),
								title: "Reset to Isometric view",
								children: "Isometric"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: () => resetView(true),
								title: "Isometric view from behind",
								children: "Iso-back"
							})
						]
					})]
				}),
				/* @__PURE__ */ a("div", {
					class: "cube-3d-section",
					children: [/* @__PURE__ */ a("span", {
						class: "cube-3d-label",
						children: "Cube:"
					}), /* @__PURE__ */ a("div", {
						class: "cube-3d-presets",
						children: [
							/* @__PURE__ */ a("button", {
								type: "button",
								class: `cube-3d-btn ${isScrambling ? "cube-3d-btn-active" : ""}`,
								disabled: !allowLayerMoves,
								onClick: toggleScramble,
								title: isScrambling ? "Stop scramble" : "Scramble cube",
								children: isScrambling ? "Stop" : "Scramble"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								disabled: !allowLayerMoves,
								onClick: randomState,
								title: "Mix the cube at once into a random valid state",
								children: "Random State"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: undoLastTurn,
								disabled: moves.length === 0 || isTurning,
								title: "Undo the last completed layer turn",
								children: "Undo"
							}),
							/* @__PURE__ */ a("button", {
								type: "button",
								class: "cube-3d-btn",
								onClick: resetCube,
								disabled: isInitialCube && moves.length === 0,
								title: "Reset cube to initial assembled state",
								children: "Reset"
							})
						]
					})]
				}),
				/* @__PURE__ */ a("div", {
					class: "cube-3d-move-history",
					role: "status",
					"aria-label": "Move history",
					children: [
						"Moves:",
						" ",
						publicMoves.length ? publicMoves.map((move) => formatCubeTurn(move, puzzleSize)).join(" ") : "None"
					]
				}),
				/* @__PURE__ */ a("script", {
					type: "application/json",
					id: CUBELAB_MOVES_ID,
					dangerouslySetInnerHTML: { __html: cubeLabMovesJson(publicMoves, puzzleSize) }
				}),
				/* @__PURE__ */ a("div", {
					class: "cube-3d-actions",
					children: [
						/* @__PURE__ */ a("button", {
							type: "button",
							class: "cube-3d-btn",
							onClick: onToggleStickerless,
							title: "Toggle between stickerless and stickered appearance",
							children: isStickerless ? "Stickerless" : "Stickered"
						}),
						/* @__PURE__ */ a("button", {
							type: "button",
							class: `cube-3d-btn ${isRotating ? "cube-3d-btn-active" : ""}`,
							onClick: onToggleAutoRotate,
							children: isRotating ? "Pause" : "Auto-rotate"
						}),
						/* @__PURE__ */ a("button", {
							type: "button",
							class: `cube-3d-btn ${layerMoves ? "cube-3d-btn-active" : ""}`,
							disabled: !allowLayerMoves,
							"aria-pressed": layerMoves,
							onClick: onToggleLayerMoves,
							children: [
								/* @__PURE__ */ a("svg", {
									class: "cube-3d-lock",
									viewBox: "0 0 16 16",
									width: "14",
									height: "14",
									"aria-hidden": "true",
									fill: "none",
									stroke: "currentColor",
									"stroke-width": "1.6",
									children: [/* @__PURE__ */ a("rect", {
										x: "3",
										y: "7",
										width: "10",
										height: "7",
										rx: "1.5"
									}), /* @__PURE__ */ a("path", { d: layerMoves ? "M5.5 7V5a2.5 2.5 0 0 1 5 0" : "M5 7V5a3 3 0 0 1 6 0v2" })]
								}),
								" ",
								"Move layers"
							]
						})
					]
				})
			]
		})] })
	});
}
// src/core/view/TurnAnimation.res.mjs
var quarter = Math.PI / 2;
function startTurn$1(next, time, overshoot, fallbackDuration) {
	return {
		face: next.face,
		depth: next.depth,
		width: next.width,
		turns: next.turns,
		from: next.from,
		speed: next.speed,
		startTime: time,
		duration: getOr(next.duration, fallbackDuration),
		overshoot,
		undo: next.undo
	};
}
function turnFrame$1(turn, time) {
	let progress = Math.min(1, Math.max(0, (time - turn.startTime) / turn.duration));
	let from = getOr(turn.from, 0);
	let target = turn.turns * quarter;
	let speed = turn.speed;
	let angle;
	let exit = 0;
	if (speed !== void 0 && turn.overshoot) angle = magneticSettleAngle(from, target, speed, turn.duration, progress);
	else exit = 1;
	if (exit === 1) angle = from + turnEase(progress, turn.overshoot) * (target - from);
	return {
		angle,
		finished: progress >= 1
	};
}
function finishTurn$1(cube, size, moves, turn) {
	if (turn.turns === 0) return null;
	let depth = getOr(turn.depth, 1);
	return {
		cube: applyCubeLayerMove(cube, size, turn.face, depth, turn.turns, getOr(turn.width, 1)),
		moves: equal(turn.undo, true) ? moves.slice(0, moves.length - 1 | 0) : recordTurn(moves, {
			face: turn.face,
			depth,
			width: turn.width,
			turns: turn.turns
		})
	};
}
function settleTurn$1(layer, angle, turns, turnMs, speed) {
	let distance = Math.abs(turns * quarter - angle) / quarter;
	return {
		face: layer.face,
		depth: layer.depth,
		width: layer.width,
		turns,
		from: angle,
		speed,
		duration: settleDuration(distance, turnMs)
	};
}
function scrambleQueue$1(moves, duration) {
	return moves.map((move) => ({
		face: move.face,
		depth: move.depth,
		width: move.width,
		turns: move.turns,
		duration
	}));
}
function dragMeshKey$1(layer, angle, highlight) {
	return layer.face + layer.depth.toString() + `/` + getOr(layer.width, 1).toString() + `:` + angle.toString() + `:` + (highlight ? "1" : "0");
}
var pitchLimit = Math.PI / 2 - .05;
function clampPitch$1(pitch) {
	return Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
}
function viewTurn$1(dx, dy, elapsedMs) {
	let capped = (v) => Math.max(-.006, Math.min(.006, v));
	return {
		yaw: dx * .008,
		pitch: dy * .008,
		yawVelocity: capped(dx * .008 / elapsedMs),
		pitchVelocity: capped(dy * .008 / elapsedMs)
	};
}
function isInitialCube$1(current, cube) {
	if (current === cube) return true;
	let same = (a, b) => a.every((value, i) => equal(value, b[i]));
	if (same(current.u, cube.u) && same(current.r, cube.r) && same(current.f, cube.f) && same(current.d, cube.d) && same(current.l, cube.l)) return same(current.b, cube.b);
	else return false;
}
// src/core/view/TurnAnimation.gen.tsx
var startTurn = startTurn$1;
var turnFrame = turnFrame$1;
var finishTurn = finishTurn$1;
var settleTurn = settleTurn$1;
var scrambleQueue = scrambleQueue$1;
var dragMeshKey = dragMeshKey$1;
var clampPitch = clampPitch$1;
var viewTurn = viewTurn$1;
var isInitialCube = isInitialCube$1;
// src/core/view/DragInertia.res.mjs
function stepDragInertia$2(velocity, elapsedMs) {
	if (Math.abs(velocity) < 3e-5 || elapsedMs <= 0) return {
		delta: 0,
		velocity: 0
	};
	let decay = Math.exp(-elapsedMs / 240);
	let next = velocity * decay;
	return {
		delta: velocity * 240 * (1 - decay),
		velocity: Math.abs(next) < 3e-5 ? 0 : next
	};
}
// src/core/view/DragInertia.gen.tsx
var stepDragInertia$1 = stepDragInertia$2;
// src/client/view3d/dragInertia.ts
/** Integrate one frame of a released drag with time-based friction. */
function stepDragInertia(velocity, elapsedMs) {
	return stepDragInertia$1(velocity, elapsedMs);
}
// src/client/view3d/useCubeCamera.ts
function useCubeCamera(puzzleSize) {
	const [pitch, setPitch] = d(isometricPitch);
	const [yaw, setYaw] = d(isometricYaw);
	const [zoom, setZoom] = d(getDefaultZoom(puzzleSize));
	const [isRotating, setIsRotating] = d(() => readPreference(document.cookie, autoRotateCookie));
	A(() => {
		document.cookie = preferenceCookie(autoRotateCookie, isRotating);
	}, [isRotating]);
	const isDraggingRef = T(false);
	const resumeAutoAtRef = T(0);
	const lastPointerRef = T({
		x: 0,
		y: 0,
		time: 0
	});
	const inertiaRef = T({
		yaw: 0,
		pitch: 0
	});
	const stateRef = T({
		pitch,
		yaw,
		zoom,
		isRotating
	});
	stateRef.current = {
		pitch,
		yaw,
		zoom,
		isRotating
	};
	A(() => {
		setZoom(getDefaultZoom(puzzleSize));
	}, [puzzleSize]);
	const pauseAutoRotation = () => {
		inertiaRef.current = {
			yaw: 0,
			pitch: 0
		};
		resumeAutoAtRef.current = performance.now() + autoRotateResumeDelayMs;
	};
	const rotateView = (dx, dy, timeStamp) => {
		const elapsed = Math.max(timeStamp - lastPointerRef.current.time, 8);
		lastPointerRef.current = {
			x: lastPointerRef.current.x + dx,
			y: lastPointerRef.current.y + dy,
			time: timeStamp
		};
		const turn = viewTurn(dx, dy, elapsed);
		inertiaRef.current = {
			yaw: turn.yawVelocity,
			pitch: turn.pitchVelocity
		};
		setYaw((prev) => prev + turn.yaw);
		setPitch((prev) => clampPitch(prev + turn.pitch));
	};
	const stepCamera = (time, elapsed) => {
		if (!isDraggingRef.current) {
			const yawStep = stepDragInertia(inertiaRef.current.yaw, elapsed);
			const pitchStep = stepDragInertia(inertiaRef.current.pitch, elapsed);
			inertiaRef.current = {
				yaw: yawStep.velocity,
				pitch: pitchStep.velocity
			};
			if (yawStep.delta) setYaw((prev) => prev + yawStep.delta);
			if (pitchStep.delta) setPitch((prev) => clampPitch(prev + pitchStep.delta));
		}
		if (stateRef.current.isRotating && !isDraggingRef.current && time >= resumeAutoAtRef.current && inertiaRef.current.yaw === 0 && inertiaRef.current.pitch === 0) setYaw((prev) => prev + elapsed * autoRotateRadiansPerMs);
	};
	const isCameraIdle = (time) => !isDraggingRef.current && inertiaRef.current.yaw === 0 && inertiaRef.current.pitch === 0 && (!stateRef.current.isRotating || time < resumeAutoAtRef.current);
	const gestureCamera = (rect) => ({
		width: rect.width,
		height: rect.height,
		zoom: stateRef.current.zoom,
		pitch: stateRef.current.pitch,
		yaw: stateRef.current.yaw,
		size: puzzleSize
	});
	const toggleAutoRotate = () => {
		inertiaRef.current = {
			yaw: 0,
			pitch: 0
		};
		resumeAutoAtRef.current = 0;
		setIsRotating((value) => !value);
	};
	return {
		pitch,
		setPitch,
		yaw,
		setYaw,
		zoom,
		setZoom,
		isRotating,
		stateRef,
		isDraggingRef,
		resumeAutoAtRef,
		lastPointerRef,
		inertiaRef,
		pauseAutoRotation,
		rotateView,
		stepCamera,
		isCameraIdle,
		gestureCamera,
		toggleAutoRotate
	};
}
// src/core/view/RandomSpin.res.mjs
function spinFrame$1(elapsed) {
	let t = Math.min(1, Math.max(0, elapsed / 450));
	return {
		angle: (.5 - .5 * Math.cos(Math.PI * t)) * 2 * Math.PI,
		swapped: t >= .5,
		finished: t >= 1
	};
}
// src/core/view/RandomSpin.gen.tsx
var spinFrame = spinFrame$1;
// src/cube/RandomState.res.mjs
function nextUnsigned(rng) {
	let x = rng.state;
	let x$1 = x ^ x << 13;
	let x$2 = x$1 ^ x$1 >>> 17;
	let x$3 = x$2 ^ x$2 << 5;
	rng.state = x$3;
	if (x$3 < 0) return x$3 + 4294967296;
	else return x$3;
}
function makeRng(seed) {
	let rng = { state: seed ^ 625341585 | 1 };
	for (let _for = 1; _for <= 16; ++_for) nextUnsigned(rng);
	return rng;
}
function below(rng, k) {
	return Math.floor(nextUnsigned(rng) / 4294967296 * k) | 0;
}
function shuffle(rng, items) {
	let out = items.slice(0, items.length);
	for (let i = out.length - 1 | 0; i >= 1; --i) {
		let j = below(rng, i + 1 | 0);
		let held = out[i];
		out[i] = out[j];
		out[j] = held;
	}
	return out;
}
function faceArray(cube, face) {
	switch (face) {
		case "U": return cube.u;
		case "R": return cube.r;
		case "F": return cube.f;
		case "D": return cube.d;
		case "L": return cube.l;
		case "B": return cube.b;
	}
}
function setSticker(cube, face, index, color) {
	faceArray(cube, face)[index] = color;
}
function twists(rng, count) {
	let values = fromInitializer(count, (param) => below(rng, 3));
	let others = values.slice(0, count - 1 | 0);
	values[count - 1 | 0] = (3 - sum(others) % 3 | 0) % 3;
	return values;
}
function placeCorner(cube, n, slot, piece, twist) {
	let match = solvedCorners[piece];
	let s2 = match[2];
	let s1 = match[1];
	let s0 = match[0];
	let match$1 = twist !== 0 ? twist !== 1 ? [
		s1,
		s2,
		s0
	] : [
		s2,
		s0,
		s1
	] : [
		s0,
		s1,
		s2
	];
	let colors = [
		match$1[0],
		match$1[1],
		match$1[2]
	];
	cornerSlots[slot].forEach((param, i) => setSticker(cube, param[0], cornerFaceletIndex(n, param[1]), colors[i]));
}
function placeCorners(cube, n, rng, keepLast) {
	let fixed = keepLast ? [6] : [];
	let free = fromInitializer(8, (i) => i).filter((i) => !fixed.includes(i));
	let pieces = shuffle(rng, free);
	let freeTwists = twists(rng, free.length);
	free.forEach((slot, i) => placeCorner(cube, n, slot, pieces[i], freeTwists[i]));
	fixed.forEach((slot) => placeCorner(cube, n, slot, slot, 0));
	return fromInitializer(8, (i) => i).map((slot) => {
		let i = findIndexOpt(free, (s) => s === slot);
		if (i !== void 0) return pieces[i];
		else return slot;
	});
}
function placeEdgeColors(cube, n, edge, depth, param) {
	let match = edgeLines[edge];
	let match$1 = match[1];
	let match$2 = match[0];
	setSticker(cube, match$2[0], edgeLineFaceletIndex(n, match$2[1], match$2[2], depth), param[0]);
	setSticker(cube, match$1[0], edgeLineFaceletIndex(n, match$1[1], match$1[2], depth), param[1]);
}
function placeMiddleEdges(cube, n, rng, cornerPieces, wing) {
	let pieces = shuffle(rng, fromInitializer(12, (i) => i));
	if (permParity(pieces) !== permParity(cornerPieces)) {
		let held = pieces[0];
		pieces[0] = pieces[1];
		pieces[1] = held;
	}
	let flips = fromInitializer(12, (param) => below(rng, 2));
	flips[11] = sum(flips.slice(0, 11)) % 2;
	pieces.forEach((piece, slot) => {
		let match = solvedEdges[piece];
		let s1 = match[1];
		let s0 = match[0];
		placeEdgeColors(cube, n, slot, wing, flips[slot] === 0 ? [s0, s1] : [s1, s0]);
	});
}
function placeWings(cube, n, rng, w) {
	shuffle(rng, fromInitializer(24, (i) => i)).forEach((id, slot) => {
		let edge = slot / 2 | 0;
		let far = slot % 2 === 1;
		let match = solvedEdges[id / 2 | 0];
		let s1 = match[1];
		let s0 = match[0];
		let straight = [s0, s1];
		let found = identifyWing(straight, edge, far);
		let colors = found !== void 0 && found === id ? straight : [s1, s0];
		placeEdgeColors(cube, n, edge, far ? (n - 1 | 0) - w | 0 : w, colors);
	});
}
function centerOrbits(n) {
	let key = (face, index) => face + index.toString();
	let labeled = {};
	[
		"U",
		"R",
		"F",
		"D",
		"L",
		"B"
	].forEach((face) => {
		labeled[face] = fromInitializer(n, (r) => fromInitializer(n, (c) => key(face, (r * n | 0) + c | 0)));
	});
	let parent = {};
	let find = (x) => {
		let p = parent[x];
		if (p === void 0) return x;
		if (p === x) return x;
		let root = find(p);
		parent[x] = root;
		return root;
	};
	["x", "y"].forEach((axis) => {
		let turned = rotateCube(labeled, axis, 1);
		[
			"U",
			"R",
			"F",
			"D",
			"L",
			"B"
		].forEach((face) => {
			faceGrid(turned, face).forEach((row, r) => {
				row.forEach((label, c) => {
					let b = key(face, (r * n | 0) + c | 0);
					parent[find(label)] = find(b);
				});
			});
		});
	});
	let middle = n % 2 === 1 ? n / 2 | 0 : void 0;
	let orbits = {};
	[
		"U",
		"R",
		"F",
		"D",
		"L",
		"B"
	].forEach((face) => {
		for (let r = 1, r_finish = n - 2 | 0; r <= r_finish; ++r) for (let c = 1, c_finish = n - 2 | 0; c <= c_finish; ++c) if (notequal(middle, r) || notequal(middle, c)) {
			let root = find(key(face, (r * n | 0) + c | 0));
			let known = getOr(orbits[root], []);
			orbits[root] = known.concat([[face, (r * n | 0) + c | 0]]);
		}
	});
	return Object.values(orbits);
}
function faceOfName(name) {
	switch (name) {
		case "D": return "D";
		case "F": return "F";
		case "L": return "L";
		case "R": return "R";
		case "U": return "U";
		default: return "B";
	}
}
function placeCenters(cube, n, rng) {
	centerOrbits(n).forEach((orbit) => {
		let mixed = shuffle(rng, orbit.map((param) => solvedColor(faceOfName(param[0]))));
		orbit.forEach((param, i) => setSticker(cube, faceOfName(param[0]), param[1], mixed[i]));
	});
}
function solvedState(n) {
	let face = (f) => make(n * n | 0, solvedColor(f));
	return {
		u: face("U"),
		r: face("R"),
		f: face("F"),
		d: face("D"),
		l: face("L"),
		b: face("B")
	};
}
function randomCube$2(size, seed) {
	if (size < 2) throwWithMessage(`A cube has at least 2 layers, not ` + size.toString());
	let rng = makeRng(seed);
	let cube = solvedState(size);
	let odd = size % 2 === 1;
	let cornerPieces = placeCorners(cube, size, rng, !odd);
	if (size >= 3) {
		if (odd) placeMiddleEdges(cube, size, rng, cornerPieces, size / 2 | 0);
		for (let w = 1, w_finish = (size - 2 | 0) / 2 | 0; w <= w_finish; ++w) if (size >= 4) placeWings(cube, size, rng, w);
	}
	if (size >= 4) placeCenters(cube, size, rng);
	return cube;
}
// src/cube/RandomState.gen.tsx
var randomCube$1 = randomCube$2;
// src/cube/randomState.ts
function randomCube(size, seed) {
	return randomCube$1(size, seed);
}
// src/core/view/TurnFeel.gen.tsx
var scrambleDuration = scrambleDuration$1;
var turnClickGain = turnClickGain$1;
var wideCueNotes = wideCueNotes$1;
var modeCueGain = modeCueGain$1;
var magneticDragAngle = magneticDragAngle$1;
// src/client/view3d/turnFeel.ts
var audio = null;
function playTurnClick(gain) {
	if (gain <= 0) return;
	try {
		audio ??= new AudioContext();
		if (audio.state === "suspended") audio.resume();
		const now = audio.currentTime;
		const length = Math.floor(audio.sampleRate * .03);
		const buffer = audio.createBuffer(1, length, audio.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
		const source = audio.createBufferSource();
		source.buffer = buffer;
		const filter = audio.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = 2400;
		filter.Q.value = 1.2;
		const volume = audio.createGain();
		volume.gain.setValueAtTime(gain, now);
		volume.gain.exponentialRampToValueAtTime(1e-4, now + .03);
		source.connect(filter).connect(volume).connect(audio.destination);
		source.start(now);
	} catch {}
}
var MODE_CUE_GAIN = modeCueGain;
function playWideCue(gain) {
	if (gain <= 0) return;
	try {
		audio ??= new AudioContext();
		if (audio.state === "suspended") audio.resume();
		const now = audio.currentTime;
		for (const note of wideCueNotes) {
			const tone = audio.createOscillator();
			tone.type = "sine";
			tone.frequency.value = note.frequency;
			const volume = audio.createGain();
			const start = now + note.start;
			volume.gain.setValueAtTime(1e-4, start);
			volume.gain.exponentialRampToValueAtTime(gain, start + .008);
			volume.gain.exponentialRampToValueAtTime(1e-4, start + note.duration);
			tone.connect(volume).connect(audio.destination);
			tone.start(start);
			tone.stop(start + note.duration + .01);
		}
	} catch {}
}
// src/client/view3d/useCubeTurns.ts
function useCubeTurns({ cube, initialCube, initialMoves, initialFrame, puzzleSize, onTurnStateChange, pauseAutoRotation }) {
	const [currentCube, setCurrentCube] = d(initialCube);
	const [moves, setMoves] = d(initialMoves);
	const [frame, setFrame] = d(() => initialFrame ?? initialColorFrame(cube, puzzleSize));
	const [isScrambling, setIsScrambling] = d(false);
	const [isTurning, setIsTurning] = d(false);
	const currentCubeRef = T(initialCube);
	currentCubeRef.current = currentCube;
	const movesRef = T(initialMoves);
	movesRef.current = moves;
	const frameRef = T(frame);
	frameRef.current = frame;
	const onTurnStateChangeRef = T(onTurnStateChange);
	onTurnStateChangeRef.current = onTurnStateChange;
	const sourceCubeRef = T(cube);
	const turnQueueRef = T([]);
	const currentTurnRef = T(null);
	const dragTurnRef = T(null);
	const spinRef = T(null);
	const spinYawRef = T(0);
	const forceUpdateMeshRef = T(false);
	const [magnetic] = d(() => readTurnFeel(document.cookie).overshoot);
	A(() => {
		if (sourceCubeRef.current === cube) return;
		sourceCubeRef.current = cube;
		setCurrentCube(cube);
		currentCubeRef.current = cube;
		movesRef.current = [];
		setMoves([]);
		const resetFrame = initialColorFrame(cube, puzzleSize);
		frameRef.current = resetFrame;
		setFrame(resetFrame);
		turnQueueRef.current = [];
		currentTurnRef.current = null;
		dragTurnRef.current = null;
		spinRef.current = null;
		setIsScrambling(false);
		setIsTurning(false);
		forceUpdateMeshRef.current = true;
	}, [cube]);
	const applyTurn = (anim) => {
		const turned = finishTurn(currentCubeRef.current, puzzleSize, movesRef.current, anim);
		if (!turned) return;
		playTurnClick(turnClickGain(anim.duration, turnSoundOn(document.cookie)));
		currentCubeRef.current = turned.cube;
		setCurrentCube(turned.cube);
		movesRef.current = turned.moves;
		setMoves(turned.moves);
		const nextFrame = advanceColorFrame(frameRef.current, puzzleSize, anim.face, anim.depth ?? 1, anim.turns, anim.width ?? 1);
		frameRef.current = nextFrame;
		setFrame(nextFrame);
		onTurnStateChangeRef.current?.(turned.cube, turned.moves, nextFrame);
	};
	const finishSettlingTurn = () => {
		const anim = currentTurnRef.current;
		if (!anim || turnQueueRef.current.length > 0) return;
		currentTurnRef.current = null;
		applyTurn(anim);
		forceUpdateMeshRef.current = true;
		setIsScrambling(false);
		setIsTurning(false);
	};
	const busy = () => spinRef.current !== null || currentTurnRef.current !== null || dragTurnRef.current !== null || turnQueueRef.current.length > 0;
	const triggerTurn = (face, turns, depth = 1, undo = false, width = 1) => {
		pauseAutoRotation();
		turnQueueRef.current.push({
			face,
			depth,
			width,
			turns,
			duration: readTurnFeel(document.cookie).turnMs,
			undo
		});
		setIsTurning(true);
	};
	const toggleScramble = () => {
		pauseAutoRotation();
		if (isScrambling) {
			turnQueueRef.current = [];
			setIsScrambling(false);
			if (!currentTurnRef.current) setIsTurning(false);
		} else {
			setIsScrambling(true);
			setIsTurning(true);
			const moves = generateScrambleMoves(puzzleSize, readScrambleOptions(document.cookie));
			const duration = scrambleDuration(readTurnFeel(document.cookie).turnMs);
			turnQueueRef.current = scrambleQueue(moves, duration);
		}
	};
	const showCube = (next) => {
		currentCubeRef.current = next;
		setCurrentCube(next);
		movesRef.current = [];
		setMoves([]);
		const nextFrame = initialColorFrame(next, puzzleSize);
		frameRef.current = nextFrame;
		setFrame(nextFrame);
		onTurnStateChangeRef.current?.(next, [], nextFrame);
		forceUpdateMeshRef.current = true;
	};
	const randomState = () => {
		pauseAutoRotation();
		turnQueueRef.current = [];
		currentTurnRef.current = null;
		dragTurnRef.current = null;
		setIsScrambling(false);
		setIsTurning(true);
		spinRef.current = {
			startedAt: null,
			cube: randomCube(puzzleSize, Math.floor(Math.random() * 2147483647)),
			swapped: false,
			angle: 0
		};
	};
	const advanceSpin = (spin, time) => {
		spin.startedAt ??= time;
		const step = spinFrame(time - spin.startedAt);
		spinYawRef.current += step.angle - spin.angle;
		spin.angle = step.angle;
		if (step.finished) {
			spinRef.current = null;
			setIsTurning(false);
		}
		if (!step.swapped || spin.swapped) return null;
		spin.swapped = true;
		showCube(spin.cube);
		forceUpdateMeshRef.current = false;
		return { colors: true };
	};
	const takeSpinYaw = () => {
		const yaw = spinYawRef.current;
		spinYawRef.current = 0;
		return yaw;
	};
	const resetCube = () => {
		spinRef.current = null;
		turnQueueRef.current = [];
		currentTurnRef.current = null;
		dragTurnRef.current = null;
		setIsScrambling(false);
		setIsTurning(false);
		currentCubeRef.current = cube;
		setCurrentCube(cube);
		movesRef.current = [];
		setMoves([]);
		const resetFrame = initialColorFrame(cube, puzzleSize);
		frameRef.current = resetFrame;
		setFrame(resetFrame);
		onTurnStateChangeRef.current?.(cube, [], resetFrame);
		forceUpdateMeshRef.current = true;
	};
	const undoLastTurn = () => {
		if (isTurning) return;
		const last = movesRef.current.at(-1);
		if (last) triggerTurn(last.face, -last.turns, last.depth, true, last.width ?? 1);
	};
	const settleDrag = (turns, speed = 0) => {
		const drag = dragTurnRef.current;
		if (!drag) return;
		dragTurnRef.current = null;
		const feel = readTurnFeel(document.cookie);
		turnQueueRef.current.unshift(settleTurn(drag.layer, feel.overshoot ? magneticDragAngle(drag.angle) : drag.angle, turns, feel.turnMs, speed));
	};
	const advance = (time) => {
		const spin = spinRef.current;
		if (spin) return advanceSpin(spin, time);
		if (forceUpdateMeshRef.current) {
			forceUpdateMeshRef.current = false;
			return { colors: true };
		}
		const anim = currentTurnRef.current;
		if (anim) {
			const { angle, finished } = turnFrame(anim, time);
			if (!finished) return {
				colors: false,
				layer: {
					face: anim.face,
					depth: anim.depth,
					width: anim.width,
					angle
				}
			};
			applyTurn(anim);
			if (turnQueueRef.current.length > 0) {
				const next = turnQueueRef.current.shift();
				currentTurnRef.current = startTurn(next, time, readTurnFeel(document.cookie).overshoot, 90);
			} else {
				currentTurnRef.current = null;
				setIsScrambling(false);
				setIsTurning(false);
			}
			return { colors: true };
		}
		const drag = dragTurnRef.current;
		if (drag) {
			const angle = magnetic ? magneticDragAngle(drag.angle) : drag.angle;
			const shown = dragMeshKey(drag.layer, angle, drag.highlight === true);
			if (drag.drawn === shown) return null;
			drag.drawn = shown;
			return {
				colors: true,
				layer: {
					face: drag.layer.face,
					depth: drag.layer.depth,
					width: drag.layer.width,
					angle,
					highlight: drag.highlight
				}
			};
		}
		if (turnQueueRef.current.length > 0) {
			const next = turnQueueRef.current.shift();
			currentTurnRef.current = startTurn(next, time, readTurnFeel(document.cookie).overshoot, 160);
		}
		return null;
	};
	return {
		currentCubeRef,
		frame,
		moves,
		isScrambling,
		isTurning,
		setIsTurning,
		dragTurnRef,
		busy,
		finishSettlingTurn,
		settleDrag,
		toggleScramble,
		randomState,
		takeSpinYaw,
		resetCube,
		undoLastTurn,
		isInitialCube: isInitialCube(currentCube, cube),
		advance
	};
}
// src/core/view/CubeShadow.res.mjs
function shadowFloorY$1(n) {
	return -n * .9;
}
function rotateModelPoint(param, pitch, yaw) {
	let pz = param[2];
	let py = param[1];
	let px = param[0];
	let cy = Math.cos(yaw);
	let sy = Math.sin(yaw);
	let x = px * cy + pz * sy;
	let z = -px * sy + pz * cy;
	let cp = Math.cos(pitch);
	let sp = Math.sin(pitch);
	return [
		x,
		py * cp - z * sp,
		py * sp + z * cp
	];
}
function shadowOutline$1(n, pitch, yaw) {
	let h = n / 2;
	let points = [];
	[-h, h].forEach((x) => {
		[-h, h].forEach((y) => {
			[-h, h].forEach((z) => {
				let match = rotateModelPoint([
					x,
					y,
					z
				], pitch, yaw);
				points.push([match[0], match[2]]);
			});
		});
	});
	let sorted = points.toSorted((param, param$1) => {
		let d = param[0] - param$1[0];
		if (d !== 0 && !Number.isNaN(d)) return d;
		else return param[1] - param$1[1];
	});
	let cross = (param, param$1, param$2) => {
		let oz = param[1];
		let ox = param[0];
		return (param$1[0] - ox) * (param$2[1] - oz) - (param$1[1] - oz) * (param$2[0] - ox);
	};
	let half = (list) => {
		let hull = [];
		list.forEach((p) => {
			while (hull.length >= 2 && cross(hull[hull.length - 2 | 0], hull[hull.length - 1 | 0], p) <= 1e-9) hull.pop();
			hull.push(p);
		});
		hull.pop();
		return hull;
	};
	return concatMany([half(sorted), half(sorted.toReversed())]);
}
function paddedOutline$1(outline) {
	let out = /* @__PURE__ */ new Float32Array(16);
	for (let i = 0; i <= 7; ++i) {
		let match = outline[Math.min(i, outline.length - 1 | 0)];
		out[i << 1] = match[0];
		out[(i << 1) + 1 | 0] = match[1];
	}
	return out;
}
// src/core/view/CubeShadow.gen.tsx
var shadowOutlinePoints = 8;
var shadowFloorY = shadowFloorY$1;
var shadowOutline = shadowOutline$1;
var paddedOutline = paddedOutline$1;
// src/client/view3d/webglShader.ts
function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}
// src/client/view3d/cubeShadow.ts
var SHADOW_VS = `
attribute vec2 a_floor;
uniform mat4 u_viewProj;
uniform float u_floorY;
varying vec2 v_floor;
void main() {
  v_floor = a_floor;
  gl_Position = u_viewProj * vec4(a_floor.x, u_floorY, a_floor.y, 1.0);
}
`;
var SHADOW_FS = `
precision mediump float;
varying vec2 v_floor;
uniform vec2 u_outline[${shadowOutlinePoints}];
uniform float u_soft;
uniform float u_alpha;
float outlineDistance(vec2 p) {
  float d = dot(p - u_outline[0], p - u_outline[0]);
  float s = 1.0;
  vec2 prev = u_outline[${shadowOutlinePoints - 1}];
  for (int i = 0; i < ${shadowOutlinePoints}; i++) {
    vec2 cur = u_outline[i];
    vec2 e = prev - cur;
    vec2 w = p - cur;
    float ee = dot(e, e);
    if (ee > 1e-6) {
      vec2 b = w - e * clamp(dot(w, e) / ee, 0.0, 1.0);
      d = min(d, dot(b, b));
      bvec3 c = bvec3(p.y >= cur.y, p.y < prev.y, e.x * w.y > e.y * w.x);
      if (all(c) || all(not(c))) s = -s;
    }
    prev = cur;
  }
  return s * sqrt(d);
}
void main() {
  float d = outlineDistance(v_floor);
  // A darker core under the cube and a wide, faint falloff around it.
  float core = 1.0 - smoothstep(-u_soft * 0.6, u_soft, d);
  float halo = 1.0 - smoothstep(-u_soft, u_soft * 3.5, d);
  float a = u_alpha * max(core, halo * 0.45);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`;
function createShadowRenderer(gl) {
	const vs = compileShader(gl, gl.VERTEX_SHADER, SHADOW_VS);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, SHADOW_FS);
	if (!vs || !fs) return null;
	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	const buffer = gl.createBuffer();
	const aFloor = gl.getAttribLocation(program, "a_floor");
	const uViewProj = gl.getUniformLocation(program, "u_viewProj");
	const uFloorY = gl.getUniformLocation(program, "u_floorY");
	const uOutline = gl.getUniformLocation(program, "u_outline");
	const uSoft = gl.getUniformLocation(program, "u_soft");
	const uAlpha = gl.getUniformLocation(program, "u_alpha");
	let quadSize = 0;
	return {
		draw(viewProj, n, pitch, yaw, alpha) {
			if (alpha <= 0) return;
			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			const size = n * 3;
			if (size !== quadSize) {
				quadSize = size;
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
					-size,
					-size,
					size,
					-size,
					-size,
					size,
					size,
					size
				]), gl.STATIC_DRAW);
			}
			gl.vertexAttribPointer(aFloor, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(aFloor);
			gl.uniformMatrix4fv(uViewProj, false, viewProj);
			gl.uniform1f(uFloorY, shadowFloorY(n));
			gl.uniform2fv(uOutline, paddedOutline(shadowOutline(n, pitch, yaw)));
			gl.uniform1f(uSoft, n * .2);
			gl.uniform1f(uAlpha, alpha);
			gl.depthMask(false);
			gl.disable(gl.CULL_FACE);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disable(gl.BLEND);
			gl.enable(gl.CULL_FACE);
			gl.depthMask(true);
			gl.disableVertexAttribArray(aFloor);
		},
		dispose() {
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
		}
	};
}
var cube_assembler_profiles_default = {
	type: "cube-assembler-profiles",
	version: 3,
	cubes: [],
	colors: [
		{
			"id": "colors-1790499291201-35cyph",
			"name": "Plastic 1",
			"colors": {
				"W": {
					"r": 180,
					"g": 188,
					"b": 189
				},
				"Y": {
					"r": 187,
					"g": 209,
					"b": 10
				},
				"O": {
					"r": 241,
					"g": 89,
					"b": 34
				},
				"R": {
					"r": 195,
					"g": 25,
					"b": 53
				},
				"G": {
					"r": 68,
					"g": 194,
					"b": 44
				},
				"B": {
					"r": 14,
					"g": 144,
					"b": 189
				}
			},
			"captures": 4,
			"updatedAt": "2026-09-27T09:07:45.756Z"
		},
		{
			"id": "colors-1790499361851-0ps1rk",
			"name": "Matte",
			"colors": {
				"W": {
					"r": 185,
					"g": 200,
					"b": 208
				},
				"Y": {
					"r": 195,
					"g": 220,
					"b": 13
				},
				"O": {
					"r": 252,
					"g": 91,
					"b": 27
				},
				"R": {
					"r": 205,
					"g": 19,
					"b": 31
				},
				"G": {
					"r": 17,
					"g": 180,
					"b": 55
				},
				"B": {
					"r": 0,
					"g": 77,
					"b": 167
				}
			},
			"captures": 3,
			"updatedAt": "2026-09-27T08:58:51.381Z"
		},
		{
			"id": "colors-1790499602849-o6ssk7",
			"name": "Classic",
			"colors": {
				"R": {
					"r": 229,
					"g": 36,
					"b": 54
				},
				"W": {
					"r": 213,
					"g": 220,
					"b": 223
				},
				"B": {
					"r": 7,
					"g": 66,
					"b": 189
				},
				"G": {
					"r": 11,
					"g": 131,
					"b": 58
				},
				"Y": {
					"r": 223,
					"g": 219,
					"b": 58
				},
				"O": {
					"r": 235,
					"g": 115,
					"b": 45
				}
			},
			"captures": 1,
			"updatedAt": "2026-09-27T09:00:02.849Z"
		},
		{
			"id": "colors-1790499704674-s7af1z",
			"name": "Acryl",
			"colors": {
				"O": {
					"r": 219,
					"g": 93,
					"b": 23
				},
				"B": {
					"r": 0,
					"g": 86,
					"b": 161
				},
				"W": {
					"r": 204,
					"g": 224,
					"b": 241
				},
				"G": {
					"r": 86,
					"g": 170,
					"b": 52
				},
				"R": {
					"r": 185,
					"g": 32,
					"b": 43
				},
				"Y": {
					"r": 216,
					"g": 217,
					"b": 60
				}
			},
			"captures": 1,
			"updatedAt": "2026-09-27T09:01:44.674Z"
		},
		{
			"id": "colors-1790499822427-rg0uoq",
			"name": "Plastic 2",
			"colors": {
				"Y": {
					"r": 196,
					"g": 217,
					"b": 38
				},
				"B": {
					"r": 1,
					"g": 73,
					"b": 169
				},
				"R": {
					"r": 204,
					"g": 22,
					"b": 39
				},
				"W": {
					"r": 196,
					"g": 205,
					"b": 211
				},
				"G": {
					"r": 7,
					"g": 144,
					"b": 55
				},
				"O": {
					"r": 240,
					"g": 91,
					"b": 29
				}
			},
			"captures": 1,
			"updatedAt": "2026-09-27T09:03:42.427Z"
		},
		{
			"id": "colors-1790499914013-chygiv",
			"name": "Plastic 3",
			"colors": {
				"R": {
					"r": 223,
					"g": 11,
					"b": 43
				},
				"O": {
					"r": 238,
					"g": 144,
					"b": 16
				},
				"Y": {
					"r": 186,
					"g": 231,
					"b": 29
				},
				"W": {
					"r": 216,
					"g": 220,
					"b": 227
				},
				"G": {
					"r": 122,
					"g": 130,
					"b": 20
				},
				"B": {
					"r": 0,
					"g": 103,
					"b": 205
				}
			},
			"captures": 1,
			"updatedAt": "2026-09-27T09:05:14.013Z"
		},
		{
			"id": "colors-1790500329932-tkvslb",
			"name": "Plastic 4",
			"colors": {
				"W": {
					"r": 189,
					"g": 189,
					"b": 189
				},
				"Y": {
					"r": 193,
					"g": 209,
					"b": 32
				},
				"O": {
					"r": 247,
					"g": 81,
					"b": 36
				},
				"R": {
					"r": 198,
					"g": 27,
					"b": 38
				},
				"G": {
					"r": 21,
					"g": 157,
					"b": 53
				},
				"B": {
					"r": 5,
					"g": 61,
					"b": 119
				}
			},
			"captures": 3,
			"updatedAt": "2026-09-27T09:12:09.932Z"
		},
		{
			"id": "colors-1790500141868-s2h0u2",
			"name": "Plastic 5",
			"colors": {
				"O": {
					"r": 237,
					"g": 73,
					"b": 22
				},
				"B": {
					"r": 1,
					"g": 79,
					"b": 158
				},
				"G": {
					"r": 59,
					"g": 168,
					"b": 45
				},
				"W": {
					"r": 183,
					"g": 191,
					"b": 198
				},
				"Y": {
					"r": 216,
					"g": 173,
					"b": 33
				},
				"R": {
					"r": 164,
					"g": 15,
					"b": 24
				}
			},
			"captures": 1,
			"updatedAt": "2026-09-27T09:09:01.868Z"
		}
	],
	activeCubeBySize: {
		"2": "builtin-generic-2",
		"3": "builtin-generic-3",
		"4": "builtin-generic-4",
		"5": "builtin-generic-5",
		"7": "builtin-generic-7"
	},
	activeColorsId: "auto-colors",
	autoMatchedColorsId: "colors-1790500329932-tkvslb"
};
// src/core/profiles/ProfileSettings.res.mjs
var cubeSizes = [
	2,
	3,
	4,
	5,
	6,
	7
];
var builtinColorProfileList = cube_assembler_profiles_default.colors.map((profile) => ({
	id: profile.id,
	name: profile.name,
	colors: profile.colors,
	captures: profile.captures,
	updatedAt: profile.updatedAt
}));
getOrThrow(builtinColorProfileList.find((profile) => profile.name === "Classic"), void 0);
function builtinColorProfiles() {
	return builtinColorProfileList;
}
cubeSizes.map((size) => Object.freeze({
	id: `builtin-generic-` + size.toString(),
	name: `Generic ` + size.toString() + `×` + size.toString(),
	size,
	sampling: Object.freeze({ stickerCore: .6 })
}));
Object.freeze({
	id: "imported-generic-8",
	name: "Imported 8×8 (review only)",
	size: 8,
	sampling: Object.freeze({ stickerCore: .6 })
});
// src/core/view/CubeMesh.res.mjs
function getCapExtents(face, x, y, z, last) {
	switch (face) {
		case "u": return {
			uNeg: x > 0 ? .5 : .44,
			uPos: x < last ? .5 : .44,
			vNeg: z < last ? .5 : .44,
			vPos: z > 0 ? .5 : .44
		};
		case "d": return {
			uNeg: x > 0 ? .5 : .44,
			uPos: x < last ? .5 : .44,
			vNeg: z > 0 ? .5 : .44,
			vPos: z < last ? .5 : .44
		};
		case "f": return {
			uNeg: x > 0 ? .5 : .44,
			uPos: x < last ? .5 : .44,
			vNeg: y > 0 ? .5 : .44,
			vPos: y < last ? .5 : .44
		};
		case "b": return {
			uNeg: x < last ? .5 : .44,
			uPos: x > 0 ? .5 : .44,
			vNeg: y > 0 ? .5 : .44,
			vPos: y < last ? .5 : .44
		};
		case "r": return {
			uNeg: z < last ? .5 : .44,
			uPos: z > 0 ? .5 : .44,
			vNeg: y > 0 ? .5 : .44,
			vPos: y < last ? .5 : .44
		};
		case "l": return {
			uNeg: z > 0 ? .5 : .44,
			uPos: z < last ? .5 : .44,
			vNeg: y > 0 ? .5 : .44,
			vPos: y < last ? .5 : .44
		};
	}
}
function faceAxes(face) {
	switch (face) {
		case "u": return {
			u: [
				1,
				0,
				0
			],
			v: [
				0,
				0,
				-1
			],
			n: [
				0,
				1,
				0
			]
		};
		case "d": return {
			u: [
				1,
				0,
				0
			],
			v: [
				0,
				0,
				1
			],
			n: [
				0,
				-1,
				0
			]
		};
		case "f": return {
			u: [
				1,
				0,
				0
			],
			v: [
				0,
				1,
				0
			],
			n: [
				0,
				0,
				1
			]
		};
		case "b": return {
			u: [
				-1,
				0,
				0
			],
			v: [
				0,
				1,
				0
			],
			n: [
				0,
				0,
				-1
			]
		};
		case "r": return {
			u: [
				0,
				0,
				-1
			],
			v: [
				0,
				1,
				0
			],
			n: [
				1,
				0,
				0
			]
		};
		case "l": return {
			u: [
				0,
				0,
				1
			],
			v: [
				0,
				1,
				0
			],
			n: [
				-1,
				0,
				0
			]
		};
	}
}
var mattePlasticColors = map(builtinColorProfiles().find((profile) => profile.name === "Matte"), (profile) => profile.colors);
var darkPlastic = [
	.11,
	.11,
	.12
];
function buildCubeMesh$2(cube, n, palette, stickerless, turn) {
	let last = n - 1 | 0;
	let posList = [];
	let normList = [];
	let colList = [];
	let occlusionList = [];
	let idxList = [];
	let addTri = (param, param$1, param$2, n0, n1, n2, col, occlusion) => {
		let base = posList.length / 3 | 0;
		let b = col[2];
		let g = col[1];
		let r = col[0];
		posList.push(param[0], param[1], param[2], param$1[0], param$1[1], param$1[2], param$2[0], param$2[1], param$2[2]);
		normList.push(n0[0], n0[1], n0[2], n1[0], n1[1], n1[2], n2[0], n2[1], n2[2]);
		colList.push(r, g, b, r, g, b, r, g, b);
		idxList.push(base, base + 1 | 0, base + 2 | 0);
		occlusionList.push(occlusion, occlusion, occlusion);
	};
	let addBeveledFace = (cx, cy, cz, uAxis, vAxis, nAxis, h, r, col, elevation, seams) => {
		let na2 = nAxis[2];
		let na1 = nAxis[1];
		let na0 = nAxis[0];
		let va2 = vAxis[2];
		let va1 = vAxis[1];
		let va0 = vAxis[0];
		let ua2 = uAxis[2];
		let ua1 = uAxis[1];
		let ua0 = uAxis[0];
		let s = h - r;
		let miter = r * .5;
		let miterApex = r * (1 - 1 / Math.sqrt(6));
		let hNorm = h + elevation;
		let zOuter = hNorm - r * .65;
		let zSkirt = hNorm - .14;
		let seamLt = seams.lt;
		let seamRt = seams.rt;
		let seamBot = seams.bot;
		let seamTop = seams.top;
		let pt = (u, v, n) => [
			cx + u * ua0 + v * va0 + n * na0,
			cy + u * ua1 + v * va1 + n * na1,
			cz + u * ua2 + v * va2 + n * na2
		];
		let norm = (nu, nv, nn) => {
			let hyp = Math.hypot(nu, nv, nn);
			let len = hyp === 0 || Number.isNaN(hyp) ? 1 : hyp;
			return [
				(nu * ua0 + nv * va0 + nn * na0) / len,
				(nu * ua1 + nv * va1 + nn * na1) / len,
				(nu * ua2 + nv * va2 + nn * na2) / len
			];
		};
		let c0 = pt(-s, -s, hNorm);
		let nc0 = norm(0, 0, 1);
		let c1 = pt(s, -s, hNorm);
		let nc1 = norm(0, 0, 1);
		let c2 = pt(s, s, hNorm);
		let nc2 = norm(0, 0, 1);
		let c3 = pt(-s, s, hNorm);
		let nc3 = norm(0, 0, 1);
		let vTop = seamTop ? h : h - miter;
		let zTop = seamTop ? zOuter : hNorm - miter;
		let eTop0 = pt(-s, vTop, zTop);
		let neTop0 = norm(0, .7, .7);
		let eTop1 = pt(s, vTop, zTop);
		let neTop1 = norm(0, .7, .7);
		let vBot = seamBot ? -h : -(h - miter);
		let zBot = seamBot ? zOuter : hNorm - miter;
		let eBot0 = pt(-s, vBot, zBot);
		let neBot0 = norm(0, -.7, .7);
		let eBot1 = pt(s, vBot, zBot);
		let neBot1 = norm(0, -.7, .7);
		let uRt = seamRt ? h : h - miter;
		let zRt = seamRt ? zOuter : hNorm - miter;
		let eRt0 = pt(uRt, -s, zRt);
		let neRt0 = norm(.7, 0, .7);
		let eRt1 = pt(uRt, s, zRt);
		let neRt1 = norm(.7, 0, .7);
		let uLt = seamLt ? -h : -(h - miter);
		let zLt = seamLt ? zOuter : hNorm - miter;
		let eLt0 = pt(uLt, -s, zLt);
		let neLt0 = norm(-.7, 0, .7);
		let eLt1 = pt(uLt, s, zLt);
		let neLt1 = norm(-.7, 0, .7);
		let match = seamRt && seamTop ? [pt(h, h, zOuter), norm(.6, .6, .5)] : !seamRt && !seamTop ? [pt(h - miterApex, h - miterApex, hNorm - miterApex), norm(.57735, .57735, .57735)] : seamRt && !seamTop ? [pt(h, h - miter, hNorm - miter), norm(0, .7, .7)] : [pt(h - miter, h, hNorm - miter), norm(.7, 0, .7)];
		let ncrnTR = match[1];
		let crnTR = match[0];
		let match$1 = seamLt && seamTop ? [pt(-h, h, zOuter), norm(-.6, .6, .5)] : !seamLt && !seamTop ? [pt(-(h - miterApex), h - miterApex, hNorm - miterApex), norm(-.57735, .57735, .57735)] : seamLt && !seamTop ? [pt(-h, h - miter, hNorm - miter), norm(0, .7, .7)] : [pt(-(h - miter), h, hNorm - miter), norm(-.7, 0, .7)];
		let ncrnTL = match$1[1];
		let crnTL = match$1[0];
		let match$2 = seamLt && seamBot ? [pt(-h, -h, zOuter), norm(-.6, -.6, .5)] : !seamLt && !seamBot ? [pt(-(h - miterApex), -(h - miterApex), hNorm - miterApex), norm(-.57735, -.57735, .57735)] : seamLt && !seamBot ? [pt(-h, -(h - miter), hNorm - miter), norm(0, -.7, .7)] : [pt(-(h - miter), -h, hNorm - miter), norm(-.7, 0, .7)];
		let ncrnBL = match$2[1];
		let crnBL = match$2[0];
		let match$3 = seamRt && seamBot ? [pt(h, -h, zOuter), norm(.6, -.6, .5)] : !seamRt && !seamBot ? [pt(h - miterApex, -(h - miterApex), hNorm - miterApex), norm(.57735, -.57735, .57735)] : seamRt && !seamBot ? [pt(h, -(h - miter), hNorm - miter), norm(0, -.7, .7)] : [pt(h - miter, -h, hNorm - miter), norm(.7, 0, .7)];
		let ncrnBR = match$3[1];
		let crnBR = match$3[0];
		let tri = (a, b, c, na, nb, nc) => addTri(a, b, c, na, nb, nc, col, 1);
		tri(c0, c1, c2, nc0, nc1, nc2);
		tri(c0, c2, c3, nc0, nc2, nc3);
		tri(c3, c2, eTop1, nc3, nc2, neTop1);
		tri(c3, eTop1, eTop0, nc3, neTop1, neTop0);
		tri(eBot0, eBot1, c1, neBot0, neBot1, nc1);
		tri(eBot0, c1, c0, neBot0, nc1, nc0);
		tri(c1, eRt0, eRt1, nc1, neRt0, neRt1);
		tri(c1, eRt1, c2, nc1, neRt1, nc2);
		tri(eLt0, c0, c3, neLt0, nc0, nc3);
		tri(eLt0, c3, eLt1, neLt0, nc3, neLt1);
		if (!seamRt && !seamTop) {
			tri(c2, eRt1, eTop1, nc2, neRt1, neTop1);
			tri(eRt1, crnTR, eTop1, neRt1, ncrnTR, neTop1);
		} else {
			tri(c2, eRt1, crnTR, nc2, neRt1, ncrnTR);
			tri(c2, crnTR, eTop1, nc2, ncrnTR, neTop1);
		}
		if (!seamLt && !seamTop) {
			tri(c3, eTop0, eLt1, nc3, neTop0, neLt1);
			tri(eTop0, crnTL, eLt1, neTop0, ncrnTL, neLt1);
		} else {
			tri(c3, eTop0, crnTL, nc3, neTop0, ncrnTL);
			tri(c3, crnTL, eLt1, nc3, ncrnTL, neLt1);
		}
		if (!seamLt && !seamBot) {
			tri(c0, eLt0, eBot0, nc0, neLt0, neBot0);
			tri(eLt0, crnBL, eBot0, neLt0, ncrnBL, neBot0);
		} else {
			tri(c0, eLt0, crnBL, nc0, neLt0, ncrnBL);
			tri(c0, crnBL, eBot0, nc0, ncrnBL, neBot0);
		}
		if (!seamRt && !seamBot) {
			tri(c1, eBot1, eRt0, nc1, neBot1, neRt0);
			tri(eBot1, crnBR, eRt0, neBot1, ncrnBR, neRt0);
		} else {
			tri(c1, eBot1, crnBR, nc1, neBot1, ncrnBR);
			tri(c1, crnBR, eRt0, nc1, ncrnBR, neRt0);
		}
		let shaded = (a, b, c, normal) => addTri(a, b, c, normal, normal, normal, col, .58);
		let addFacingTri = (a, b, c, nOut) => {
			let az = a[2];
			let ay = a[1];
			let ax = a[0];
			let e10 = b[0] - ax;
			let e11 = b[1] - ay;
			let e12 = b[2] - az;
			let e20 = c[0] - ax;
			let e21 = c[1] - ay;
			let e22 = c[2] - az;
			if ((e11 * e22 - e12 * e21) * nOut[0] + (e12 * e20 - e10 * e22) * nOut[1] + (e10 * e21 - e11 * e20) * nOut[2] > 0) return shaded(a, b, c, nOut);
			else return shaded(a, c, b, nOut);
		};
		let addWall = (a, b, ou, ov) => {
			let sink = (param) => {
				let pz = param[2];
				let py = param[1];
				let px = param[0];
				let k = (px - cx) * na0 + (py - cy) * na1 + (pz - cz) * na2 - zSkirt;
				return [
					px - k * na0,
					py - k * na1,
					pz - k * na2
				];
			};
			let nOut = norm(ou, ov, 0);
			addFacingTri(a, sink(a), sink(b), nOut);
			addFacingTri(a, sink(b), b, nOut);
		};
		if (seamTop) {
			let sTop0 = pt(-s, h, zSkirt);
			let nsTop = norm(0, 1, 0);
			let sTop1 = pt(s, h, zSkirt);
			shaded(eTop0, eTop1, sTop1, nsTop);
			shaded(eTop0, sTop1, sTop0, nsTop);
		}
		if (seamBot) {
			let sBot0 = pt(-s, -h, zSkirt);
			let nsBot = norm(0, -1, 0);
			let sBot1 = pt(s, -h, zSkirt);
			shaded(eBot1, eBot0, sBot0, nsBot);
			shaded(eBot1, sBot0, sBot1, nsBot);
		}
		if (seamRt) {
			let sRt0 = pt(h, -s, zSkirt);
			let nsRt = norm(1, 0, 0);
			let sRt1 = pt(h, s, zSkirt);
			shaded(eRt1, eRt0, sRt0, nsRt);
			shaded(eRt1, sRt0, sRt1, nsRt);
		}
		if (seamLt) {
			let sLt0 = pt(-h, -s, zSkirt);
			let nsLt = norm(-1, 0, 0);
			let sLt1 = pt(-h, s, zSkirt);
			shaded(eLt0, eLt1, sLt1, nsLt);
			shaded(eLt0, sLt1, sLt0, nsLt);
		}
		if (seamTop) {
			addWall(crnTL, eTop0, 0, 1);
			addWall(eTop1, crnTR, 0, 1);
		}
		if (seamBot) {
			addWall(crnBL, eBot0, 0, -1);
			addWall(eBot1, crnBR, 0, -1);
		}
		if (seamRt) {
			addWall(crnBR, eRt0, 1, 0);
			addWall(eRt1, crnTR, 1, 0);
		}
		if (seamLt) {
			addWall(crnBL, eLt0, -1, 0);
			return addWall(eLt1, crnTL, -1, 0);
		}
	};
	let depth;
	if (turn !== void 0) {
		let depth$1 = turn.depth;
		depth = depth$1 !== void 0 ? depth$1 : 1;
	} else depth = 1;
	let width;
	if (turn !== void 0) {
		let width$1 = turn.width;
		width = width$1 !== void 0 ? width$1 : 1;
	} else width = 1;
	for (let z = 0; z < n; ++z) for (let y = 0; y < n; ++y) for (let x = 0; x < n; ++x) {
		let center = [
			x - last / 2,
			y - last / 2,
			z - last / 2
		];
		let layer;
		if (turn !== void 0) switch (turn.face) {
			case "U":
				layer = (last - y | 0) + 1 | 0;
				break;
			case "R":
				layer = (last - x | 0) + 1 | 0;
				break;
			case "F":
				layer = (last - z | 0) + 1 | 0;
				break;
			case "D":
				layer = y + 1 | 0;
				break;
			case "L":
				layer = x + 1 | 0;
				break;
			case "B": layer = z + 1 | 0;
		}
		else layer = 0;
		let isTurnCubie = layer <= depth && layer > (depth - width | 0);
		let lit = isTurnCubie && equal(flatMap(turn, (turn) => turn.highlight), true);
		let stickerRgb = (colorKey) => {
			let matte = stickerless ? flatMap(mattePlasticColors, (colors) => colors[colorKey]) : void 0;
			let match = matte !== void 0 ? [
				matte.r / 255,
				matte.g / 255,
				matte.b / 255
			] : hexToRgb(getOr(orElse(palette[colorKey], defaultStickerHex$1[colorKey]), "#888"));
			let b = match[2];
			let g = match[1];
			let r = match[0];
			if (lit) return [
				r + (1 - r) * .35,
				g + (1 - g) * .35,
				b + (1 - b) * .35
			];
			else return [
				r,
				g,
				b
			];
		};
		let match;
		if (turn !== void 0 && turn.angle !== 0 && isTurnCubie) {
			let match$1 = turn.face;
			let axis;
			switch (match$1) {
				case "U":
				case "D":
					axis = "y";
					break;
				case "R":
				case "L":
					axis = "x";
					break;
				case "F":
				case "B": axis = "z";
			}
			let match$2 = turn.face;
			let sign;
			switch (match$2) {
				case "U":
				case "R":
				case "F":
					sign = -1;
					break;
				default: sign = 1;
			}
			let rotAngle = sign * turn.angle;
			match = [rotateVec(center, axis, rotAngle), (face) => {
				let a = faceAxes(face);
				return {
					u: rotateVec(a.u, axis, rotAngle),
					v: rotateVec(a.v, axis, rotAngle),
					n: rotateVec(a.n, axis, rotAngle)
				};
			}];
		} else match = [center, faceAxes];
		let center$1 = match[0];
		let cz = center$1[2];
		let cy = center$1[1];
		let cx = center$1[0];
		let getAxes = match[1];
		let exterior = [
			[y === last, "u"],
			[y === 0, "d"],
			[z === last, "f"],
			[z === 0, "b"],
			[x === last, "r"],
			[x === 0, "l"]
		];
		if (stickerless) exterior.forEach((param) => {
			if (!param[0]) return;
			let face = param[1];
			let rgb = stickerRgb(getFaceletColor(cube, n, face, x, y, z));
			let a = getAxes(face);
			addBeveledFace(cx, cy, cz, a.u, a.v, a.n, .495, .058, rgb, 0, getFaceSeams(face, x, y, z, n));
		});
		else exterior.forEach((param) => {
			if (!param[0]) return;
			let face = param[1];
			let a = getAxes(face);
			let seams = getFaceSeams(face, x, y, z, n);
			addBeveledFace(cx, cy, cz, a.u, a.v, a.n, .495, .058, darkPlastic, 0, seams);
			let rgb = stickerRgb(getFaceletColor(cube, n, face, x, y, z));
			addBeveledFace(cx, cy, cz, a.u, a.v, a.n, .43, .045, rgb, .07, {
				top: true,
				bot: true,
				rt: true,
				lt: true
			});
		});
		exterior.forEach((param) => {
			if (param[0]) return;
			let face = param[1];
			let a = getAxes(face);
			let param$1 = a.u;
			let param$2 = a.v;
			let normal = a.n;
			let extents = getCapExtents(face, x, y, z, last);
			let v2 = param$2[2];
			let v1 = param$2[1];
			let v0 = param$2[0];
			let u2 = param$1[2];
			let u1 = param$1[1];
			let u0 = param$1[0];
			let c2 = center$1[2];
			let c1 = center$1[1];
			let c0 = center$1[0];
			let n2 = normal[2];
			let n1 = normal[1];
			let n0 = normal[0];
			let point = (a, b) => {
				let uDist = a < 0 ? -extents.uNeg : extents.uPos;
				let vDist = b < 0 ? -extents.vNeg : extents.vPos;
				return [
					c0 + uDist * u0 + vDist * v0 + .495 * n0,
					c1 + uDist * u1 + vDist * v1 + .495 * n1,
					c2 + uDist * u2 + vDist * v2 + .495 * n2
				];
			};
			let bottomLeft = point(-1, -1);
			let bottomRight = point(1, -1);
			let topRight = point(1, 1);
			let topLeft = point(-1, 1);
			addTri(bottomLeft, bottomRight, topRight, normal, normal, normal, darkPlastic, 1);
			addTri(bottomLeft, topRight, topLeft, normal, normal, normal, darkPlastic, 1);
		});
	}
	let vertexCount = posList.length / 3 | 0;
	return {
		positions: new Float32Array(posList),
		normals: new Float32Array(normList),
		colors: new Float32Array(colList),
		occlusion: new Float32Array(occlusionList),
		indices: vertexCount > 65535 ? new Uint32Array(idxList) : new Uint16Array(idxList),
		vertexCount,
		indexCount: idxList.length
	};
}
// src/core/view/CubeMesh.gen.tsx
var buildCubeMesh$1 = buildCubeMesh$2;
// src/client/view3d/cubeMesh.ts
function buildCubeMesh(cube, n, palette = defaultStickerHex, stickerless = true, turn) {
	const mesh = buildCubeMesh$1(cube, n, palette, stickerless, turn);
	return {
		...mesh,
		indices: mesh.indices
	};
}
// src/core/view/Mat4.res.mjs
function mat4Create$1() {
	let out = /* @__PURE__ */ new Float32Array(16);
	out[0] = 1;
	out[5] = 1;
	out[10] = 1;
	out[15] = 1;
	return out;
}
function mat4Multiply$1(out, a, b) {
	let a00 = a[0];
	let a01 = a[1];
	let a02 = a[2];
	let a03 = a[3];
	let a10 = a[4];
	let a11 = a[5];
	let a12 = a[6];
	let a13 = a[7];
	let a20 = a[8];
	let a21 = a[9];
	let a22 = a[10];
	let a23 = a[11];
	let a30 = a[12];
	let a31 = a[13];
	let a32 = a[14];
	let a33 = a[15];
	for (let column = 0; column <= 3; ++column) {
		let base = column << 2;
		let b0 = b[base];
		let b1 = b[base + 1 | 0];
		let b2 = b[base + 2 | 0];
		let b3 = b[base + 3 | 0];
		out[base] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[base + 1 | 0] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[base + 2 | 0] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[base + 3 | 0] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	}
	return out;
}
function mat4Perspective$1(out, fovyRad, aspect, near, far) {
	let f = 1 / Math.tan(fovyRad / 2);
	let nf = 1 / (near - far);
	out[0] = f / aspect;
	out[1] = 0;
	out[2] = 0;
	out[3] = 0;
	out[4] = 0;
	out[5] = f;
	out[6] = 0;
	out[7] = 0;
	out[8] = 0;
	out[9] = 0;
	out[10] = (far + near) * nf;
	out[11] = -1;
	out[12] = 0;
	out[13] = 0;
	out[14] = 2 * far * near * nf;
	out[15] = 0;
	return out;
}
function copy(out, a, indexes) {
	indexes.forEach((i) => {
		out[i] = a[i];
	});
}
function mat4RotateX$1(out, a, rad) {
	let s = Math.sin(rad);
	let c = Math.cos(rad);
	let a10 = a[4];
	let a11 = a[5];
	let a12 = a[6];
	let a13 = a[7];
	let a20 = a[8];
	let a21 = a[9];
	let a22 = a[10];
	let a23 = a[11];
	if (a !== out) copy(out, a, [
		0,
		1,
		2,
		3,
		12,
		13,
		14,
		15
	]);
	out[4] = a10 * c + a20 * s;
	out[5] = a11 * c + a21 * s;
	out[6] = a12 * c + a22 * s;
	out[7] = a13 * c + a23 * s;
	out[8] = a20 * c - a10 * s;
	out[9] = a21 * c - a11 * s;
	out[10] = a22 * c - a12 * s;
	out[11] = a23 * c - a13 * s;
	return out;
}
function mat4RotateY$1(out, a, rad) {
	let s = Math.sin(rad);
	let c = Math.cos(rad);
	let a00 = a[0];
	let a01 = a[1];
	let a02 = a[2];
	let a03 = a[3];
	let a20 = a[8];
	let a21 = a[9];
	let a22 = a[10];
	let a23 = a[11];
	if (a !== out) copy(out, a, [
		4,
		5,
		6,
		7,
		12,
		13,
		14,
		15
	]);
	out[0] = a00 * c - a20 * s;
	out[1] = a01 * c - a21 * s;
	out[2] = a02 * c - a22 * s;
	out[3] = a03 * c - a23 * s;
	out[8] = a00 * s + a20 * c;
	out[9] = a01 * s + a21 * c;
	out[10] = a02 * s + a22 * c;
	out[11] = a03 * s + a23 * c;
	return out;
}
function mat4Translate$1(out, a, param) {
	let z = param[2];
	let y = param[1];
	let x = param[0];
	if (a !== out) copy(out, a, [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11
	]);
	let column = (i) => a[i] * x + a[i + 4 | 0] * y + a[i + 8 | 0] * z + a[i + 12 | 0];
	let c0 = column(0);
	let c1 = column(1);
	let c2 = column(2);
	let c3 = column(3);
	out[12] = c0;
	out[13] = c1;
	out[14] = c2;
	out[15] = c3;
	return out;
}
// src/core/view/Mat4.gen.tsx
var mat4Create = mat4Create$1;
var mat4Multiply = mat4Multiply$1;
var mat4Perspective = mat4Perspective$1;
var mat4RotateX = mat4RotateX$1;
var mat4RotateY = mat4RotateY$1;
var mat4Translate = mat4Translate$1;
// src/client/view3d/cubeView3DGraphics.ts
var VS_SOURCE = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_color;
attribute float a_occlusion;

uniform mat4 u_mvp;
uniform mat4 u_model;

varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_pos;
varying float v_occlusion;

void main() {
  v_color = a_color;
  v_occlusion = a_occlusion;
  v_normal = normalize(mat3(u_model[0].xyz, u_model[1].xyz, u_model[2].xyz) * a_normal);
  v_pos = (u_model * vec4(a_position, 1.0)).xyz;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;
var FS_SOURCE = `
precision mediump float;

varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_pos;
varying float v_occlusion;

uniform vec3 u_lightDir1;
uniform vec3 u_lightDir2;
uniform vec3 u_cameraPos;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_cameraPos - v_pos);

  // Key light: upper-right-front
  vec3 L1 = normalize(u_lightDir1);
  float diff1 = max(dot(N, L1), 0.0);
  vec3 H1 = normalize(L1 + V);
  float spec1 = pow(max(dot(N, H1), 0.0), 24.0) * 0.28;

  // Fill light: lower-left-rear
  vec3 L2 = normalize(u_lightDir2);
  float diff2 = max(dot(N, L2), 0.0) * 0.35;

  float ambient = 0.42;
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec3 lit = v_color * (ambient + diff1 * 0.65 + diff2) * v_occlusion;
  lit += vec3(spec1 * v_occlusion) + v_color * fresnel * 0.10;
  gl_FragColor = vec4(lit, 1.0);
}
`;
function initProgram(gl) {
	const vs = compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
	if (!vs || !fs) return null;
	const program = gl.createProgram();
	if (!program) return null;
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
}
// src/client/view3d/useCubeRenderer.ts
function useCubeRenderer({ canvasRef, cubeRef, resetKey, puzzleSize, palette, isStickerless, viewRef, onFrame, isIdle }) {
	const [isSupported, setIsSupported] = d(true);
	const lastFrameTimeRef = T(null);
	const animFrameRef = T(null);
	const onFrameRef = T(onFrame);
	onFrameRef.current = onFrame;
	const isIdleRef = T(isIdle);
	isIdleRef.current = isIdle;
	A(() => {
		const canvas = canvasRef.current;
		if (!canvas || !cubeRef.current) return;
		const gl = canvas.getContext("webgl2", {
			antialias: true,
			alpha: true
		}) || canvas.getContext("webgl", {
			antialias: true,
			alpha: true
		});
		if (!gl) {
			setIsSupported(false);
			return;
		}
		gl.getExtension("OES_element_index_uint");
		const program = initProgram(gl);
		if (!program) {
			setIsSupported(false);
			return;
		}
		const shadow = createShadowRenderer(gl);
		let shadowAlpha = .3;
		const readShadowAlpha = () => {
			const value = Number.parseFloat(getComputedStyle(canvas).getPropertyValue("--cube-3d-shadow"));
			shadowAlpha = Number.isFinite(value) ? value : .3;
		};
		readShadowAlpha();
		const colorScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
		colorScheme?.addEventListener("change", readShadowAlpha);
		gl.useProgram(program);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.clearColor(0, 0, 0, 0);
		const mesh = buildCubeMesh(cubeRef.current, puzzleSize, palette, isStickerless);
		const posBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
		const normBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW);
		const colBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.DYNAMIC_DRAW);
		const occlusionBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, occlusionBuf);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.occlusion, gl.STATIC_DRAW);
		const idxBuf = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(program, "a_position");
		const aNorm = gl.getAttribLocation(program, "a_normal");
		const aCol = gl.getAttribLocation(program, "a_color");
		const aOcclusion = gl.getAttribLocation(program, "a_occlusion");
		const uMvp = gl.getUniformLocation(program, "u_mvp");
		const uModel = gl.getUniformLocation(program, "u_model");
		const uLight1 = gl.getUniformLocation(program, "u_lightDir1");
		const uLight2 = gl.getUniformLocation(program, "u_lightDir2");
		const uCameraPos = gl.getUniformLocation(program, "u_cameraPos");
		gl.uniform3f(uLight1, 1.5, 2.5, 2);
		gl.uniform3f(uLight2, -2, -1, -2);
		const render = (time) => {
			const elapsed = Math.min(time - (lastFrameTimeRef.current ?? time), 50);
			lastFrameTimeRef.current = time;
			const update = onFrameRef.current(time, elapsed);
			if (update && cubeRef.current) {
				const next = buildCubeMesh(cubeRef.current, puzzleSize, palette, isStickerless, update.layer);
				gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, next.positions);
				gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, next.normals);
				if (update.colors) {
					gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
					gl.bufferSubData(gl.ARRAY_BUFFER, 0, next.colors);
				}
			}
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const width = Math.floor(rect.width * dpr);
			const height = Math.floor(rect.height * dpr);
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width || 400;
				canvas.height = height || 400;
				gl.viewport(0, 0, canvas.width, canvas.height);
			}
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			const aspect = canvas.width / (canvas.height || 1);
			const proj = mat4Perspective(mat4Create(), 45 * Math.PI / 180, aspect, .1, 100);
			const currentZoom = viewRef.current.zoom;
			const view = mat4Translate(mat4Create(), mat4Create(), [
				0,
				0,
				-currentZoom
			]);
			const model = mat4Create();
			mat4RotateX(model, model, viewRef.current.pitch);
			mat4RotateY(model, model, viewRef.current.yaw);
			const mvp = mat4Create();
			const viewProj = mat4Create();
			mat4Multiply(viewProj, proj, view);
			mat4Multiply(mvp, viewProj, model);
			shadow?.draw(viewProj, puzzleSize, viewRef.current.pitch, viewRef.current.yaw, shadowAlpha);
			gl.useProgram(program);
			gl.uniformMatrix4fv(uMvp, false, mvp);
			gl.uniformMatrix4fv(uModel, false, model);
			gl.uniform3f(uCameraPos, 0, 0, currentZoom);
			gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
			gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(aPos);
			gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
			gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(aNorm);
			gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
			gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(aCol);
			gl.bindBuffer(gl.ARRAY_BUFFER, occlusionBuf);
			gl.vertexAttribPointer(aOcclusion, 1, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(aOcclusion);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
			const indexType = mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			gl.drawElements(gl.TRIANGLES, mesh.indexCount, indexType, 0);
			const idle = isIdleRef.current(time) ? "true" : "false";
			if (canvas.dataset.idle !== idle) canvas.dataset.idle = idle;
			animFrameRef.current = requestAnimationFrame(render);
		};
		animFrameRef.current = requestAnimationFrame(render);
		return () => {
			lastFrameTimeRef.current = null;
			if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
			gl.deleteBuffer(posBuf);
			gl.deleteBuffer(normBuf);
			gl.deleteBuffer(colBuf);
			gl.deleteBuffer(occlusionBuf);
			gl.deleteBuffer(idxBuf);
			gl.deleteProgram(program);
			shadow?.dispose();
			colorScheme?.removeEventListener("change", readShadowAlpha);
		};
	}, [
		resetKey,
		puzzleSize,
		palette,
		isStickerless
	]);
	return isSupported;
}
// src/client/view3d/cubeDragInteraction.ts
function createDragInteraction({ dragTurnRef, setIsTurning }) {
	const startDragTurn = (gesture, layer, from, hit, e, camera) => {
		gesture.mode = "turn";
		gesture.turnHit = hit;
		gesture.turnFrom = from;
		dragTurnRef.current = {
			layer,
			angle: swipeLayerAngle(hit, layer, e.clientX - from[0], e.clientY - from[1], camera),
			velocity: 0,
			time: e.timeStamp,
			highlight: gesture.level !== "layer",
			drawn: null
		};
		setIsTurning(true);
	};
	return { startDragTurn };
}
// src/client/view3d/useCubeGestures.ts
function useCubeGestures({ canvasRef, puzzleSize, allowLayerMoves = true, camera: { isDraggingRef, resumeAutoAtRef, lastPointerRef, inertiaRef, pauseAutoRotation, rotateView, gestureCamera, setZoom }, turns: { dragTurnRef, setIsTurning, busy, finishSettlingTurn, settleDrag }, handleViewWheel, onLockedDrag }) {
	const gestureRef = T(null);
	const [pressMode, setPressMode] = d(null);
	const touchesRef = T(/* @__PURE__ */ new Map());
	const activePointersRef = T(/* @__PURE__ */ new Set());
	const tiltFromRef = T(null);
	const pinchRef = T({
		start: 0,
		midpoint: [0, 0],
		lock: "undecided"
	});
	const spreadOf = ([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
	const midpointOf = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
	const startTilt = () => {
		const touches = twoTouches();
		tiltFromRef.current = touches;
		pinchRef.current = {
			start: touches ? spreadOf(touches) : 0,
			midpoint: touches ? midpointOf(touches) : [0, 0],
			lock: "undecided"
		};
	};
	const twoTouches = () => {
		const points = [...touchesRef.current.values()];
		return points.length >= 2 ? [points[0], points[1]] : null;
	};
	const announceWideTurn = () => {
		setPressMode("wide");
		const cookies = document.cookie;
		playWideCue(turnSoundOn(cookies) ? MODE_CUE_GAIN : 0);
		try {
			if (vibrationOn(cookies)) navigator.vibrate?.(readVibrationMs(cookies));
		} catch {}
	};
	const { startDragTurn } = createDragInteraction({
		dragTurnRef,
		setIsTurning
	});
	const twoFingerCubeRef = T(null);
	const dragWholeCube = (swipe, dx, dy, timeStamp) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;
		const camera = gestureCamera(rect);
		const drag = dragTurnRef.current;
		if (!swipe.dragging) {
			const layer = pickSwipeLayer(swipe.hit, dx, dy, camera, readSwipeTuning(document.cookie).startPx);
			if (!layer) return;
			const whole = wholeCubeLayer(layer.axis, puzzleSize);
			const angle = swipeLayerAngle(swipe.hit, whole, dx, dy, camera);
			swipe.dragging = true;
			dragTurnRef.current = {
				layer: whole,
				...followDrag({
					angle: 0,
					velocity: 0,
					time: swipe.startTime
				}, angle, timeStamp),
				drawn: null
			};
			setIsTurning(true);
			return;
		}
		if (!drag) return;
		const angle = swipeLayerAngle(swipe.hit, drag.layer, dx, dy, camera);
		Object.assign(drag, followDrag(drag, angle, timeStamp));
	};
	const releaseWholeCube = (timeStamp, cancelled) => {
		const drag = dragTurnRef.current;
		if (!drag) return;
		const { turns, speed } = releaseDrag(drag.angle, drag.velocity, drag.time, timeStamp, cancelled, readSwipeTuning(document.cookie));
		settleDrag(turns, speed);
	};
	const cubeUnder = (clientX, clientY) => {
		if (!allowLayerMoves) return null;
		const rect = canvasRef.current?.getBoundingClientRect();
		return rect && !busy() ? pickCubeSurface(clientX - rect.left, clientY - rect.top, gestureCamera(rect)) : null;
	};
	const handlePointerDown = (e) => {
		activePointersRef.current.add(e.pointerId);
		const touch = e.pointerType === "touch";
		if (touch) touchesRef.current.set(e.pointerId, [e.clientX, e.clientY]);
		const touches = touch ? touchesRef.current.size : 1;
		try {
			e.target.setPointerCapture?.(e.pointerId);
		} catch {}
		isDraggingRef.current = true;
		resumeAutoAtRef.current = Number.POSITIVE_INFINITY;
		inertiaRef.current = {
			yaw: 0,
			pitch: 0
		};
		if (touches > 1) {
			const gesture = gestureRef.current;
			const mode = gestureForPointerDown("touch", touches, null, gesture?.mode ?? null);
			if (gesture) gesture.mode = mode;
			if (mode === "two-finger") {
				setPressMode(null);
				settleDrag(0);
				startTilt();
				const pair = twoTouches();
				const midpoint = pair ? midpointOf(pair) : null;
				const hit = midpoint ? cubeUnder(...midpoint) : null;
				twoFingerCubeRef.current = midpoint && hit ? {
					hit,
					start: midpoint,
					startTime: e.timeStamp,
					dragging: false
				} : null;
				lastPointerRef.current = {
					...lastPointerRef.current,
					time: e.timeStamp
				};
			}
			return;
		}
		lastPointerRef.current = {
			x: e.clientX,
			y: e.clientY,
			time: e.timeStamp
		};
		finishSettlingTurn();
		const rect = canvasRef.current?.getBoundingClientRect();
		const surface = rect && !busy() ? pickCubeSurface(e.clientX - rect.left, e.clientY - rect.top, gestureCamera(rect)) : null;
		const layerMoves = allowLayerMoves && layerMovesOn(document.cookie);
		const hit = rect && surface && layerMoves ? pickStickerSurface(e.clientX - rect.left, e.clientY - rect.top, gestureCamera(rect)) : null;
		const level = pressLevel(e);
		const gesture = {
			x: e.clientX,
			y: e.clientY,
			hit,
			mode: !layerMoves ? gestureWhenLayerMovesLocked(e.pointerType, 1, surface !== null, null) : surface && !hit ? "pending" : gestureForPointerDown(e.pointerType, 1, hit, null),
			pointerType: e.pointerType,
			level,
			tuning: readSwipeTuning(document.cookie),
			seamWideEnabled: readPreference(document.cookie, seamWideCookie),
			lockedSticker: !layerMoves && rect !== void 0 && surface !== null && pickStickerSurface(e.clientX - rect.left, e.clientY - rect.top, gestureCamera(rect)) !== null
		};
		gestureRef.current = gesture;
		if (gesture.mode !== "pending") return;
		if (level === "wide") announceWideTurn();
	};
	const handlePointerMove = (e) => {
		if (e.pointerType === "touch" && touchesRef.current.has(e.pointerId)) touchesRef.current.set(e.pointerId, [e.clientX, e.clientY]);
		if (!isDraggingRef.current) return;
		const gesture = gestureRef.current;
		if (!gesture) return;
		if (gesture.mode === "two-finger") {
			const from = tiltFromRef.current;
			const to = twoTouches();
			if (!from || !to) return;
			tiltFromRef.current = to;
			const [mx, my] = midpointOf(to);
			const [sx, sy] = pinchRef.current.midpoint;
			const lock = twoFingerLock(pinchRef.current.start, spreadOf(to), Math.hypot(mx - sx, my - sy), pinchRef.current.lock);
			pinchRef.current.lock = lock;
			const cube = twoFingerCubeRef.current;
			if (lock === "tilt" && cube) {
				dragWholeCube(cube, mx - cube.start[0], my - cube.start[1], e.timeStamp);
				return;
			}
			const motion = twoFingerMotion(from, to);
			if (lock === "tilt") rotateView(motion.dx, motion.dy, e.timeStamp);
			if (lock === "pinch" && motion.scale !== 1) setZoom((prev) => clampZoom(prev / motion.scale, puzzleSize));
			return;
		}
		if (gesture.mode === "none") return;
		if (gesture.mode === "pending" && !gesture.hit) {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			const hit = pickStickerSurface(e.clientX - rect.left, e.clientY - rect.top, gestureCamera(rect));
			if (!hit) return;
			gesture.hit = hit;
			gesture.x = e.clientX;
			gesture.y = e.clientY;
			lastPointerRef.current = {
				x: e.clientX,
				y: e.clientY,
				time: e.timeStamp
			};
			if (gesture.level === "wide") announceWideTurn();
			return;
		}
		if (gesture.mode === "turn") {
			const drag = dragTurnRef.current;
			const rect = canvasRef.current?.getBoundingClientRect();
			const hit = gesture.turnHit ?? gesture.hit;
			const [fromX, fromY] = gesture.turnFrom ?? [gesture.x, gesture.y];
			if (!drag || !hit || !rect) return;
			const camera = gestureCamera(rect);
			if (gesture.seamOpen) {
				const step = seamSwitch(hit, drag, e.clientX - rect.left, e.clientY - rect.top, e.clientX - fromX, e.clientY - fromY, camera);
				if (step.locked) gesture.seamOpen = false;
				drag.layer = step.layer;
				drag.angle = step.angle;
				drag.velocity = step.velocity;
			}
			const angle = swipeLayerAngle(hit, drag.layer, e.clientX - fromX, e.clientY - fromY, camera);
			Object.assign(drag, followDrag(drag, angle, e.timeStamp));
			return;
		}
		if (gesture.mode === "pending" && gesture.hit) {
			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;
			const start = swipeStart(gesture.hit, e.clientX - gesture.x, e.clientY - gesture.y, gestureCamera(rect), gesture.tuning.startPx, gesture.level, gesture.seamWideEnabled);
			if (start.kind === "wait") return;
			if (start.layer) {
				gesture.seamOpen = start.seam;
				if (start.wide) {
					gesture.level = "wide";
					announceWideTurn();
				}
				startDragTurn(gesture, start.layer, [gesture.x, gesture.y], gesture.hit, e, gestureCamera(rect));
				return;
			}
			gesture.mode = gestureWhenSwipeTurnsNothing(gesture.pointerType);
			if (gesture.mode !== "camera") return;
		}
		if (gesture.lockedSticker && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) >= gesture.tuning.startPx) {
			gesture.lockedSticker = false;
			onLockedDrag?.();
		}
		rotateView(e.clientX - lastPointerRef.current.x, e.clientY - lastPointerRef.current.y, e.timeStamp);
	};
	const handlePointerUp = (e) => {
		if (e.type === "lostpointercapture" && !activePointersRef.current.has(e.pointerId)) return;
		activePointersRef.current.delete(e.pointerId);
		const cancelled = e.type === "pointercancel" || e.type === "lostpointercapture";
		const touch = e.pointerType === "touch";
		if (touch) touchesRef.current.delete(e.pointerId);
		try {
			e.target.releasePointerCapture?.(e.pointerId);
		} catch {}
		const remaining = touch ? touchesRef.current.size : 0;
		const cube = twoFingerCubeRef.current;
		twoFingerCubeRef.current = null;
		if (cube?.dragging) {
			releaseWholeCube(e.timeStamp, cancelled);
			if (remaining > 0) {
				if (gestureRef.current) gestureRef.current.mode = "none";
				tiltFromRef.current = null;
				return;
			}
		}
		const next = gestureAfterPointerUp(remaining, gestureRef.current?.mode ?? null);
		if (next !== null) {
			if (gestureRef.current) gestureRef.current.mode = next;
			if (next === "two-finger") startTilt();
			else tiltFromRef.current = null;
			return;
		}
		isDraggingRef.current = false;
		setPressMode(null);
		const gesture = gestureRef.current;
		if (gesture?.mode === "turn") {
			inertiaRef.current = {
				yaw: 0,
				pitch: 0
			};
			const drag = dragTurnRef.current;
			if (drag) {
				const { turns, speed } = releaseDrag(drag.angle, drag.velocity, drag.time, e.timeStamp, cancelled, gesture.tuning);
				settleDrag(turns, speed);
			}
		}
		gestureRef.current = null;
		tiltFromRef.current = null;
		resumeAutoAtRef.current = performance.now() + autoRotateResumeDelayMs;
		if (cancelled || e.timeStamp - lastPointerRef.current.time > 120) inertiaRef.current = {
			yaw: 0,
			pitch: 0
		};
	};
	const wheelSwipeRef = T(null);
	const handleCubeWheel = (e) => {
		if (!allowLayerMoves || wheelGesture(e) !== "tilt") {
			handleViewWheel(e);
			return;
		}
		const current = wheelSwipeRef.current;
		const swipe = nextWheelSwipe(current?.swipe ?? null, e.timeStamp, e.deltaX, e.deltaY);
		const fresh = swipe.startTime === e.timeStamp;
		if (current) clearTimeout(current.timer);
		const hit = fresh ? cubeUnder(e.clientX, e.clientY) : null;
		const cube = fresh ? hit && {
			hit,
			startTime: e.timeStamp,
			dragging: false
		} : current?.cube ?? null;
		const state = {
			swipe,
			cube,
			timer: setTimeout(() => {
				if (wheelSwipeRef.current !== state) return;
				wheelSwipeRef.current = null;
				if (state.cube?.dragging) releaseWholeCube(Number.POSITIVE_INFINITY, false);
			}, wheelSwipeGapMs)
		};
		wheelSwipeRef.current = state;
		if (!cube) {
			handleViewWheel(e);
			return;
		}
		e.preventDefault();
		pauseAutoRotation();
		if (swipe.coasting) {
			if (cube.dragging) {
				cube.dragging = false;
				releaseWholeCube(Number.POSITIVE_INFINITY, false);
			}
			return;
		}
		dragWholeCube(cube, swipe.dx, swipe.dy, e.timeStamp);
	};
	return {
		pressMode,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handleCubeWheel
	};
}
// src/client/view3d/cubeViewControls.ts
function createCubeViewControls({ puzzleSize, pauseAutoRotation, setPitch, setYaw, setZoom, rotateView }) {
	const resetView = (back = false) => {
		pauseAutoRotation();
		const { pitch, yaw } = isometricAngles(back);
		setPitch(pitch);
		setYaw(yaw);
		setZoom(getDefaultZoom(puzzleSize));
	};
	const setPreset = (targetPitch, targetYaw) => {
		pauseAutoRotation();
		setPitch(targetPitch);
		setYaw(targetYaw);
	};
	const handleWheel = (e) => {
		e.preventDefault();
		if (wheelGesture(e) === "tilt") {
			rotateView(-e.deltaX, -e.deltaY, e.timeStamp);
			pauseAutoRotation();
			return;
		}
		setZoom((prev) => wheelZoom(prev, e.deltaY, e.ctrlKey, puzzleSize));
	};
	const tiltUp = () => {
		pauseAutoRotation();
		setPitch((p) => tiltPitch(p, true));
	};
	const tiltDown = () => {
		pauseAutoRotation();
		setPitch((p) => tiltPitch(p, false));
	};
	const rotateLeft = () => {
		pauseAutoRotation();
		setYaw((y) => rotateYaw(y, true));
	};
	const rotateRight = () => {
		pauseAutoRotation();
		setYaw((y) => rotateYaw(y, false));
	};
	const handleKeyDown = (e) => {
		switch (e.key) {
			case "ArrowUp":
				e.preventDefault();
				tiltUp();
				break;
			case "ArrowDown":
				e.preventDefault();
				tiltDown();
				break;
			case "ArrowLeft":
				e.preventDefault();
				rotateLeft();
				break;
			case "ArrowRight":
				e.preventDefault();
				rotateRight();
				break;
			default: {
				const face = e.key.toLowerCase();
				if (face === "u" || face === "d" || face === "f" || face === "b" || face === "l" || face === "r") {
					const { pitch, yaw } = facePreset(face);
					setPreset(pitch, yaw);
				}
			}
		}
	};
	return {
		resetView,
		setPreset,
		handleWheel,
		handleKeyDown
	};
}
// src/client/view3d/cubeView3D.tsx
var LOCKED_HINT_VISIBLE_MS = 2500;
function CubeView3D({ allowLayerMoves = true, publicMoves, cube, initialCube = cube, initialMoves = [], initialFrame, onTurnStateChange, puzzleSize, palette = defaultStickerHex, stickerless = true }) {
	const canvasRef = T(null);
	const { pitch, setPitch, yaw, setYaw, setZoom, stateRef, isDraggingRef, resumeAutoAtRef, lastPointerRef, inertiaRef, pauseAutoRotation, rotateView, stepCamera, isCameraIdle, gestureCamera, isRotating, toggleAutoRotate } = useCubeCamera(puzzleSize);
	const [isStickerless, setIsStickerless] = d(() => readPreference(document.cookie, stickerlessCookie, stickerless));
	const { currentCubeRef, frame, moves, isScrambling, isTurning, setIsTurning, dragTurnRef, busy, finishSettlingTurn, settleDrag, toggleScramble, randomState, takeSpinYaw, resetCube, undoLastTurn, isInitialCube, advance } = useCubeTurns({
		cube,
		initialCube,
		initialMoves,
		initialFrame,
		puzzleSize,
		onTurnStateChange,
		pauseAutoRotation
	});
	const isSupported = useCubeRenderer({
		canvasRef,
		cubeRef: currentCubeRef,
		resetKey: cube,
		puzzleSize,
		palette,
		isStickerless,
		viewRef: stateRef,
		onFrame: (time, elapsed) => {
			const update = advance(time);
			const spin = takeSpinYaw();
			if (spin) setYaw((prev) => prev + spin);
			stepCamera(time, elapsed);
			return update;
		},
		isIdle: (time) => !busy() && isCameraIdle(time)
	});
	const [layerMoves, setLayerMoves] = d(() => layerMovesOn(document.cookie));
	const [lockedHint, setLockedHint] = d(false);
	const lockedHintShownAtRef = T(null);
	const lockedHintTimerRef = T(null);
	const showLockedHint = () => {
		const now = Date.now();
		if (!lockedHintDue(lockedHintShownAtRef.current, now)) return;
		lockedHintShownAtRef.current = now;
		setLockedHint(true);
		if (lockedHintTimerRef.current !== null) clearTimeout(lockedHintTimerRef.current);
		lockedHintTimerRef.current = setTimeout(() => setLockedHint(false), LOCKED_HINT_VISIBLE_MS);
	};
	A(() => () => {
		if (lockedHintTimerRef.current !== null) clearTimeout(lockedHintTimerRef.current);
	}, []);
	A(() => {
		document.cookie = preferenceCookie(layerMovesCookie, layerMoves);
	}, [layerMoves]);
	A(() => {
		document.cookie = preferenceCookie(stickerlessCookie, isStickerless);
	}, [isStickerless]);
	const [coarsePointer] = d(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);
	const { resetView, setPreset, handleWheel: handleViewWheel, handleKeyDown } = createCubeViewControls({
		puzzleSize,
		pauseAutoRotation,
		setPitch,
		setYaw,
		setZoom,
		rotateView
	});
	const { pressMode, handlePointerDown, handlePointerMove, handlePointerUp, handleCubeWheel } = useCubeGestures({
		canvasRef,
		puzzleSize,
		allowLayerMoves,
		camera: {
			isDraggingRef,
			resumeAutoAtRef,
			lastPointerRef,
			inertiaRef,
			pauseAutoRotation,
			rotateView,
			gestureCamera,
			setZoom
		},
		turns: {
			dragTurnRef,
			setIsTurning,
			busy,
			finishSettlingTurn,
			settleDrag
		},
		handleViewWheel,
		onLockedDrag: showLockedHint
	});
	return /* @__PURE__ */ a(CubeView3DPresentation, {
		isSupported,
		canvasRef,
		handleKeyDown,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handleWheel: handleCubeWheel,
		gizmo: /* @__PURE__ */ a(AxisGizmo, {
			frame,
			pitch,
			yaw,
			palette
		}),
		pressMode,
		coarsePointer,
		setPreset,
		resetView,
		isScrambling,
		toggleScramble: allowLayerMoves ? toggleScramble : () => {},
		randomState: allowLayerMoves ? randomState : () => {},
		undoLastTurn,
		moves,
		publicMoves: publicMoves?.(moves),
		isTurning,
		resetCube,
		isInitialCube,
		puzzleSize,
		isStickerless,
		onToggleStickerless: () => setIsStickerless((value) => !value),
		isRotating,
		onToggleAutoRotate: toggleAutoRotate,
		allowLayerMoves,
		layerMoves: allowLayerMoves && layerMoves,
		lockedHint: lockedHint && !layerMoves,
		onToggleLayerMoves: () => allowLayerMoves && setLayerMoves((value) => !value)
	});
}
Object.fromEntries([
	["W", "Y"],
	["Y", "W"],
	["R", "O"],
	["O", "R"],
	["G", "B"],
	["B", "G"]
]);
// src/cube/CapturedFaceMatching.res.mjs
function createSolvedCube$1(size) {
	let face = (color) => make(size * size | 0, color);
	return {
		u: face("W"),
		r: face("R"),
		f: face("G"),
		d: face("Y"),
		l: face("O"),
		b: face("B")
	};
}
// src/cube/CapturedFaceMatching.gen.tsx
var createSolvedCube = createSolvedCube$1;
// puzlwerk-reference.tsx
function mountOriginal(host) {
	let state = createSolvedCube(2);
	const draw = () => K(k$1(CubeView3D, {
		cube: state,
		puzzleSize: 2,
		stickerless: false,
		onTurnStateChange: (next) => {
			state = next;
		}
	}), host);
	draw();
	return {
		move(face, turns) {
			state = applyCubeMove(state, 2, face, turns);
			draw();
		},
		getState() {
			return state;
		},
		dispose() {
			K(null, host);
		}
	};
}
export { mountOriginal };
