package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReaderSize(os.Stdin, 1<<20)
	out := bufio.NewWriterSize(os.Stdout, 1<<20)
	defer out.Flush()

	const maxX = 1 << 18
	var T int
	fmt.Fscan(in, &T)
	for ; T > 0; T-- {
		var n, q int
		fmt.Fscan(in, &n, &q)
		f := make([]int64, maxX)
		for i := 1; i <= n; i++ {
			var v int64
			fmt.Fscan(in, &v)
			f[i] = v

		}
		for b := 0; b < 18; b++ {
			bit := 1 << b
			for s := 0; s < maxX; s++ {
				if s&bit != 0 {
					f[s] += f[s^bit]
				}
			}
		}
		for i := 0; i < q; i++ {
			var x int
			fmt.Fscan(in, &x)
			fmt.Fprintln(out, f[x])
		}
	}
}