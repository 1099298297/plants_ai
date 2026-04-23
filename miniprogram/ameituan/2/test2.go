package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	r := bufio.NewReader(os.Stdin)
	var k, q int
	fmt.Fscan(r, &k, &q)
	xs := make([]int, q)
	maxX := 0
	for i := 0; i < q; i++ {
		fmt.Fscan(r, &xs[i])
		if xs[i] > maxX {
			maxX = xs[i]
		}
	}
	const MOD int64 = 1000000007
	if maxX == 0 {
		w := bufio.NewWriter(os.Stdout)
		for i := 0; i < q; i++ {
			fmt.Fprintln(w, 0)
		}
		w.Flush()
		return
	}
	s := make([]int64, maxX+1)
	var window int64 = 0
	lim := k
	if maxX < k {
		lim = maxX
	}
	for i := 1; i <= lim; i++ {
		s[i] = 1
		window += 1
		if window >= MOD {
			window -= MOD
		}
	}
	for i := k + 1; i <= maxX; i++ {
		s[i] = window % MOD
		window += s[i]
		window -= s[i-k]
		window %= MOD
		if window < 0 {
			window += MOD
		}
	}
	w := bufio.NewWriter(os.Stdout)
	for i := 0; i < q; i++ {
		x := xs[i]
		if x <= 0 {
			fmt.Fprintln(w, 0)
		} else {
			fmt.Fprintln(w, s[x]%MOD)
		}
	}
	w.Flush()
}
