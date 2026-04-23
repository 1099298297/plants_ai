package main

import (
	"bufio"
	"os"
	"sort"
)

type FastReader struct {
	r *bufio.Reader
}

func NewFastReader() *FastReader { return &FastReader{r: bufio.NewReaderSize(os.Stdin, 1<<20)} }
func (fr *FastReader) NextInt() int {
	sign, val, c := 1, 0, byte(0)
	for {
		b, err := fr.r.ReadByte()
		if err != nil {
			return 0
		}
		c = b
		if c > ' ' {
			break
		}
	}
	if c == '-' {
		sign = -1
		c, _ = fr.r.ReadByte()
	}
	for ; c > ' '; c, _ = fr.r.ReadByte() {
		val = val*10 + int(c-'0')
	}
	return val * sign
}

type Item struct {
	u, a, b, t, idx int
}

func better(x, y Item) bool {
	if x.a != y.a {
		return x.a > y.a
	}
	if x.b != y.b {
		return x.b > y.b
	}
	if x.t != y.t {
		return x.t > y.t
	}
	return x.idx < y.idx
}

func main() {
	in := NewFastReader()
	out := bufio.NewWriterSize(os.Stdout, 1<<20)
	defer out.Flush()

	n := in.NextInt()
	q := in.NextInt()
	items := make([]Item, n+1)
	for i := 1; i <= n; i++ {
		u := in.NextInt()
		a := in.NextInt()
		b := in.NextInt()
		t := in.NextInt()
		items[i] = Item{u: u, a: a, b: b, t: t, idx: i}
	}

	best := make(map[int]Item, n)
	for i := 1; i <= n; i++ {
		it := items[i]
		if cur, ok := best[it.u]; !ok || better(it, cur) {
			best[it.u] = it
		}
	}
	res := make([]Item, 0, len(best))
	for _, v := range best {
		res = append(res, v)
	}
	sort.Slice(res, func(i, j int) bool { return better(res[i], res[j]) })
	pos := make([]int, n+1)
	for i := range pos {
		pos[i] = 0
	}
	for i := 0; i < len(res); i++ {
		pos[res[i].idx] = i + 1
	}
	for i := 0; i < q; i++ {
		id := in.NextInt()
		if pos[id] == 0 {
			out.WriteString("0\n")
		} else {
			out.WriteString(stringInt(pos[id]))
			out.WriteByte('\n')
		}
	}
}

func stringInt(x int) string {
	if x == 0 {
		return "0"
	}
	buf := make([]byte, 0, 20)
	sign := false
	if x < 0 {
		sign, x = true, -x
	}
	for x > 0 {
		buf = append(buf, byte('0'+x%10))
		x /= 10
	}
	if sign {
		buf = append(buf, '-')
	}
	for i, j := 0, len(buf)-1; i < j; i, j = i+1, j-1 {
		buf[i], buf[j] = buf[j], buf[i]
	}
	return string(buf)
}
