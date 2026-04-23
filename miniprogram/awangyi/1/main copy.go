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






/*
- 模拟事件驱动，按位置推进伞的移动
- 使用队列维护加入顺序，堆维护最近完成点
- 每人入堆出堆至多一次确保效率
- 处理队列中已完成成员时跳过
- 空队列时选择下一个未加入者拾伞
*/

// 读入包
package main

import (
	"bufio"
	"container/heap"
	"fmt"
	"os"
)

// 堆元素定义
type Pair struct {
	q   int64
	idx int
}
type MinHeap []Pair

// 堆接口实现
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
	// 读入
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	var n int
	if _, err := fmt.Fscan(in, &n); err != nil {
		return
	}
	// 分配数组
	p := make([]int64, n+1)
	q := make([]int64, n+1)
	for i := 1; i <= n; i++ {
		fmt.Fscan(in, &p[i], &q[i])
	}

	// 初始化变量
	ans := make([]int64, n+1)
	completed := make([]bool, n+1)
	done := make([]bool, n+1)
	queue := make([]int, 0, n)
	head := 0

	// 当前位置和指针
	cur := p[1]
	holder := 1
	b := 2

	// 初始化堆
	h := &MinHeap{}
	heap.Init(h)

	// 主循环
	remaining := n
	for remaining > 0 {
		// 若holder已经完成（初始未完成），处理移动
		// 将出生点在(cur, q[holder]]的加入队列并入堆
		target := q[holder]
		for b <= n && p[b] <= target {
			// 加入队列和堆
			queue = append(queue, b)
			heap.Push(h, Pair{q: q[b], idx: b})
			b++
		}
		// 处理在移动段内完成的队员（堆顶q <= target）
		for h.Len() > 0 {
			top := (*h)[0]
			if top.q > target {
				break
			}
			// 弹出并标记完成
			heap.Pop(h)
			if !completed[top.idx] {
				completed[top.idx] = true
				remaining--
			}
		}
		// 持伞者移动贡献
		ans[holder] += target - cur
		// 标记持伞者完成（如果还未被计入完成）
		if !completed[holder] {
			completed[holder] = true
			remaining--
		}
		done[holder] = true
		cur = target

		// 从队列中弹出已完成的前置，直到找到未完成者
		for head < len(queue) && completed[queue[head]] {
			head++
		}
		// 选择下一个持伞人
		if head < len(queue) {
			holder = queue[head]
			head++
			// 新持伞人已在队列，继续循环
			continue
		}
		// 队列为空，若还有未加入者，则下一个未加入者跑来拾伞
		if b <= n {
			// 选取下一个未加入者作为持伞人，标记为已“加入/取伞”
			holder = b
			b++
			// 他们跑来不推动伞位置，cur不变
			continue
		}
		// 若无队列且无未加入者，结束
		break
	}

	// 输出结果
	for i := 1; i <= n; i++ {
		if i > 1 {
			fmt.Fprint(out, " ")
		}
		fmt.Fprint(out, ans[i])
	}
	fmt.Fprintln(out)
}

