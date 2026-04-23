package main

import (
	"bufio"
	"os"
)

type FastIn struct {
	r *bufio.Reader
}

func NewFastIn() *FastIn { return &FastIn{r: bufio.NewReaderSize(os.Stdin, 1<<20)} }
func (f *FastIn) NextInt() int {
	sign, val := 1, 0
	c, _ := f.r.ReadByte()
	for (c < '0' || c > '9') && c != '-' {
		c, _ = f.r.ReadByte()
	}
	if c == '-' {
		sign = -1
		c, _ = f.r.ReadByte()
	}
	for c >= '0' && c <= '9' {
		val = val*10 + int(c-'0')
		c, _ = f.r.ReadByte()
	}
	return val * sign
}

type DSU struct {
	p, sz, mx []int
}

func NewDSU(n int, val []int) *DSU {
	p := make([]int, n+1)
	sz := make([]int, n+1)
	mx := make([]int, n+1)
	for i := 1; i <= n; i++ {
		p[i] = i
		sz[i] = 1
		mx[i] = val[i]
	}
	return &DSU{p: p, sz: sz, mx: mx}
}
func (d *DSU) Find(x int) int {
	for d.p[x] != x {
		d.p[x] = d.p[d.p[x]]
		x = d.p[x]
	}
	return x
}
func (d *DSU) Union(a, b int) {
	ra := d.Find(a)
	rb := d.Find(b)
	if ra == rb {
		return
	}
	if d.sz[ra] < d.sz[rb] {
		ra, rb = rb, ra
	}
	d.p[rb] = ra
	d.sz[ra] += d.sz[rb]
	if d.mx[rb] > d.mx[ra] {
		d.mx[ra] = d.mx[rb]
	}
}
func main() {
	in := NewFastIn()
	out := bufio.NewWriterSize(os.Stdout, 1<<20)
	defer out.Flush()
	n := in.NextInt()
	m := in.NextInt()
	q := in.NextInt()

	u := make([]int, m+1)
	v := make([]int, m+1)
	for i := 1; i <= m; i++ {
		u[i] = in.NextInt()
		v[i] = in.NextInt()
	}
	type Op struct{ t, x int }
	ops := make([]Op, q)
	deleted := make([]bool, m+1)
	for i := 0; i < q; i++ {
		t := in.NextInt()
		x := in.NextInt()
		ops[i] = Op{t, x}
		if t == 1 {
			deleted[x] = true
		}
	}
	deg := make([]int, n+1)
	for i := 1; i <= m; i++ {
		if !deleted[i] {
			deg[u[i]]++
			deg[v[i]]++
		}
	}
	val := make([]int, n+1)
	for i := 1; i <= n; i++ {
		val[i] = deg[i] + i
	}
	dsu := NewDSU(n, val)
	for i := 1; i <= m; i++ {
		if !deleted[i] {
			dsu.Union(u[i], v[i])
		}
	}
	ans := make([]int, 0, q)
	for i := q - 1; i >= 0; i-- {
		op := ops[i]
		if op.t == 2 {
			r := dsu.Find(op.x)
			ans = append(ans, dsu.mx[r])
		} else {
			eid := op.x
			a := u[eid]
			b := v[eid]
			deg[a]++
			deg[b]++
			val[a] = deg[a] + a
			val[b] = deg[b] + b
			ra := dsu.Find(a)
			rb := dsu.Find(b)
			if val[a] > dsu.mx[ra] {
				dsu.mx[ra] = val[a]
			}
			if val[b] > dsu.mx[rb] {
			}
		}
	}
}
