package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
)

type Station struct {
	d int64
	p int64
}

func main() {
	in := bufio.NewReader(os.Stdin)
	var L, C int64
	var n int
	if _, err := fmt.Fscan(in, &L, &C, &n); err != nil {
		return
	}
	st := make([]Station, 0, n+1)
	for i := 0; i < n; i++ {
		var di, pi int64
		fmt.Fscan(in, &di, &pi)
		st = append(st, Station{d: di, p: pi})
	}
	st = append(st, Station{d: L, p: 0})
	sort.Slice(st, func(i, j int) bool { return st[i].d < st[j].d })
	if st[0].d > C && L > C {
		fmt.Println(-1)
		return
	}
	m := len(st)
	nsr := make([]int, m)
	for i := range nsr {
		nsr[i] = -1
	}
	stack := make([]int, 0, m)
	for i := m - 1; i >= 0; i-- {
		for len(stack) > 0 && st[stack[len(stack)-1]].p >= st[i].p {
			stack = stack[:len(stack)-1]
		}
		if len(stack) > 0 {
			nsr[i] = stack[len(stack)-1]
		}
		stack = append(stack, i)
	}
	var ans int64 = 0
	var rem int64 = C
	prev := int64(0)
	for i := 0; i < m; i++ {
		dist := st[i].d
		rem -= dist - prev
		if rem < 0 {
			fmt.Println(-1)
			return
		}
		if i == m-1 {
			break
		}
		need := C
		if nsr[i] != -1 && st[nsr[i]].d-st[i].d <= C {
			need = st[nsr[i]].d - st[i].d
		}
		if need > L-st[i].d {
			need = L - st[i].d
		}
		if rem < need {
			buy := need - rem
			ans += buy * st[i].p
			rem += buy
		}
		prev = dist
	}
	fmt.Println(ans)
}
