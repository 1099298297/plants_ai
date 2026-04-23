package main

import (
	"bufio"
	"container/heap"
	"fmt"
	"os"
)

type Pair struct {
	q   int64
	idx int
}
type MinHeap []Pair

func (h MinHeap) Len() int            { return len(h) }
func (h MinHeap) Less(i, j int) bool  { return h[i].q < h[j].q }
func (h MinHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(Pair)) }
func (h *MinHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	var n int
	if _, err := fmt.Fscan(in, &n); err != nil {
		return
	}
	p := make([]int64, n+1)
	q := make([]int64, n+1)
	for i := 1; i <= n; i++ {
		fmt.Fscan(in, &p[i], &q[i])
	}
	ans := make([]int64, n+1)
	completed := make([]bool, n+1)
	done := make([]bool, n+1)
	queue := make([]int, 0, n)
	head := 0
	cur := p[1]
	holder := 1
	b := 2
	h := &MinHeap{}
	heap.Init(h)
	//主循环
	remaining := n
	for remaining > 0 {
		target := q[holder]
		for b <= n && p[b] <= target {
			queue = append(queue, b)
			heap.Push(h, Pair{q: q[b], idx: b})
			b++
		}
		for h.Len() > 0 {
			top := (*h)[0]
			if top.q > target {
				break
			}
			heap.Pop(h)
			if !completed[top.idx] {
				completed[top.idx] = true
				remaining--
			}
		}
		ans[holder] += target - cur
		if !completed[holder] {
			completed[holder] = true
			remaining--
		}
		done[holder] = true
		cur = target
		for head < len(queue) && completed[queue[head]] {
			head++
		}
		if head < len(queue) {
			holder = queue[head]
			head++
			continue
		}
		if b <= n {
			holder = b
			b++
			continue
		}
		break
	}
	for i := 1; i <= n; i++ {
		if i > 1 {
			fmt.Fprint(out, " ")
		}
		fmt.Fprint(out, ans[i])

	}
	fmt.Fprintln(out)
}
