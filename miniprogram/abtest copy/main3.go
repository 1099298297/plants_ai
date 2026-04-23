package main

import (
	"bufio"
	"fmt"
	"os"
)

const MOD int64 = 1000000007

func modpow(a, e int64) int64 {
	res := int64(1)
	for e > 0 {
		if e&1 == 1 {
			res = (res * a) % MOD
		}
		a = (a * a) % MOD
		e >>= 1
	}
	return res
}
func main() {
	in := bufio.NewReader(os.Stdin)
	var n int
	fmt.Fscan(in, &n)
	a := make([]int64, n)
	for i := 0; i < n; i++ {
		fmt.Fscan(in, &a[i])
	}
	fact := make([]int64, n+1)
	fact[0] = 1
	for i := 1; i <= n; i++ {
		fact[i] = fact[i-1] * int64(i) % MOD
	}
	inv := make([]int64, n+1)
	inv[n] = modpow(fact[n], MOD-2)
	for i := n; i > 0; i-- {
		inv[i-1] = inv[i] * int64(i) % MOD
	}
	ans := int64(1)
	prevId := 0
	prevVal := a[0]
	for i := 1; i < n; i++ {
		if a[i] == 0 {
			continue
		}
		k := i - prevId - 1
		if prevVal > a[i] {
			fmt.Println(0)
			return
		}
		if k > 0 {
			A := a[i] - prevVal
			num := int64(1)
			for t := 1; t <= k; t++ {
				num = num * ((A + int64(t)) % MOD) % MOD
			}
			ways := num * inv[k] % MOD
			ans = ans * ways % MOD
		}
		prevId = i
		prevVal = a[i]
	}
	fmt.Println(ans)
}
