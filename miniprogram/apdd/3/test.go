package main

import (
	"bufio"
	"fmt"
	"os"
)

func key(x, y int) uint64 {
	return (uint64(uint32(x)) << 32) | uint64(uint32(y))
}
func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	var T int
	fmt.Fscan(in, &T)
	for ; T > 0; T-- {
		var n int
		var s string
		var tx, ty int
		fmt.Fscan(in, &n)
		fmt.Fscan(in, &s)
		fmt.Fscan(in, &tx, &ty)
		totalX, totalY := 0, 0
		for i := 0; i < n; i++ {
			switch s[i] {
			case 'U':
				totalY++
			case 'D':
				totalY--
			case 'L':
				totalX--
			case 'R':
				totalX++
			}
		}
		needX := totalX - tx
		needY := totalY - ty
		if needX == 0 && needY == 0 {
			fmt.Fprintln(out, 0)
			continue
		}
		m := make(map[uint64]int, n+1)
		m[key(0, 0)] = 0
		curX, curY := 0, 0
		ans := n + 1
		for i := 1; i <= n; i++ {
			switch s[i-1] {
			case 'U':
				curY++
			case 'D':
				curY--
			case 'L':
				curX--
			case 'R':
				curX++
			}
			wantX := curX - needX
			wantY := curY - needY
			if idx, ok := m[key(wantX, wantY)]; ok {
				if i-idx < ans {
					ans = i - idx
				}
			}
			m[key(curX, curY)] = i
		}
		if ans == n+1 {
			fmt.Fprintln(out, -1)
		} else {
			fmt.Fprintln(out, ans)
		}
	}
}
