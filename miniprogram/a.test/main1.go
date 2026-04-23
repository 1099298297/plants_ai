package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	var T int

	if _, err := fmt.Fscan(in, &T); err != nil {
		return
	}

	nums := make([]int64, T)
	var maxn int64 = 0
	for i := 0; i < T; i++ {
		fmt.Fscan(in, &nums[i])
		if nums[i] > maxn {
			maxn = nums[i]
		}
	}
	lim := 2
	if maxn > 1 {
		lim = int(math.Sqrt(float64(maxn))) + 1
	}
	isComp := make([]bool, lim+1)
	primes := make([]int, 0, lim/10)
	for i := 2; i <= lim; i++ {
		if !isComp[i] {
			primes = append(primes, i)
			if i*i <= lim {
				for j := i * i; j < lim; j += i {
					isComp[j] = true
				}
			}
		}
	}
	for _, u := range nums {
		n := u
		for n%2 == 0 && n > 0 {
			n /= 2
		}
		cnt := 0
		for _, v := range primes {
			vv := int64(v)
			if vv*vv > n {
				break
			}
			if n%vv == 0 {
				if vv != 2 {
					cnt++
				}
				for n%vv == 0 {
					n /= vv
				}
			}
		}
		if n > 1 {
			if n != 2 {
				cnt++
			}
		}
		if cnt%2 == 1 {
			fmt.Fprintln(out, "YES")
		} else {
			fmt.Fprintln(out, "NO")
		}
	}
}
