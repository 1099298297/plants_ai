package main

import (
	"bufio"
	"fmt"
	"os"
)

type Pair struct {
	l int
	r int
}

var (
	n    int
	pre  []int64
	pos  map[int64]int
	memo map[Pair]int
)

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
func dfs(l, r int) int {
	if r-l+1 < 2 {
		return 0
	}
	key := Pair{l, r}
	if v, ok := memo[key]; ok {
		return v
	}
	sum := pre[r] - pre[l-1]
	if sum&1 == 1 {
		memo[key] = 0
		return 0
	}
	target := pre[l-1] + sum/2
	k, ok := pos[target]
	if !ok || k < l || k >= r {
		memo[key] = 0
		return 0
	}
	mid := k + 1
	ans := 1 + max(dfs(l, mid-1), dfs(mid, r))
	memo[key] = ans
	return ans
}
func main() {
	in := bufio.NewReaderSize(os.Stdin, 1<<20)
	fmt.Fscan(in, &n)
	a := make([]int64, n+1)
	pre = make([]int64, n+1)
	pos = make(map[int64]int, n+1)
	memo = make(map[Pair]int)

	pos[0] = 0
	for i := 1; i <= n; i++ {
		fmt.Fscan(in, &a[i])
		pre[i] = pre[i-1] + a[i]
		pos[pre[i]] = i
	}
	fmt.Println(dfs(1, n))
}
