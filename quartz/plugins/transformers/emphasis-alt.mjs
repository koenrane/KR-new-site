var e,
  r,
  t,
  o,
  n = !1,
  s = /[a-zA-Z0-9]/
function a(n, s) {
  ;(e = !1), (r = !1), (t = s || 0), (o = n)
}
function i(n, i) {
  var m,
    p,
    c,
    l = n.pos,
    h = n.src.charCodeAt(l),
    u = !1,
    d = l
  if (i) return !1
  if (95 !== h && 42 !== h) return !1
  if (
    ((p = l > 0 ? String.fromCharCode(n.src.charCodeAt(l - 1)) : " "),
    (c = n.pos + 1 < n.posMax ? String.fromCharCode(n.src.charCodeAt(n.pos + 1)) : " "),
    95 === h && s.test(p) && s.test(c))
  )
    return !1
  for (
    l + 1 <= n.posMax && n.src.charCodeAt(l + 1) === h && (u = !0);
    d < n.posMax && "\n" !== n.src.charAt(d);

  )
    d++
  return (
    (n.src !== o || d > t) && a(n.src, d),
    ((m = n.push("text", "", 0)).content = String.fromCharCode(h)),
    u ? ((r = !r), (m.content += String.fromCharCode(h))) : (e = !e),
    n.delimiters.push({
      marker: h,
      jump: 0,
      token: n.tokens.length - 1,
      level: n.level,
      end: -1,
      open: u ? r : e,
      close: u ? !r : !e,
      isDoubleMarker: u,
    }),
    n.pos++,
    u && n.pos++,
    !0
  )
}
function m(e) {
  var r,
    t,
    o,
    n,
    s,
    a,
    i = e.delimiters,
    m = e.delimiters.length
  for (r = 0; r < m; r++)
    (95 !== (t = i[r]).marker && 42 !== t.marker) ||
      (-1 !== t.end &&
        ((o = i[t.end]),
        (a = t.isDoubleMarker),
        (s = String.fromCharCode(t.marker)),
        ((n = e.tokens[t.token]).type = a ? "strong_open" : "em_open"),
        (n.tag = a ? "strong" : "em"),
        (n.nesting = 1),
        (n.markup = a ? s + s : s),
        (n.content = ""),
        ((n = e.tokens[o.token]).type = a ? "strong_close" : "em_close"),
        (n.tag = a ? "strong" : "em"),
        (n.nesting = -1),
        (n.markup = a ? s + s : s),
        (n.content = "")))
}
var p = function (e) {
  a(0),
    n ||
      (e.disable("emphasis"),
      e.inline.ruler.before("emphasis", "emphasis_alt", i),
      e.inline.ruler2.before("emphasis", "emphasis_alt", m),
      (n = !0))
}
export { p as default }
