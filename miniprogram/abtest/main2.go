package main

import (
	"bufio"
	"fmt"
	"os"
)

func main(){
	in := bufio.NewReader(os.Stdin)
	var n int
	var s string
	fmt.Fscan(in, &n)
	fmt.Fscan(in, &s)

	if n <= 1 {
		fmt.Println(0)
		return
	}
	ans := 0
	firstLen := 0
	pre := -1

	cur := 1
	for i := 1; i < n; i++ {
		if s[i] == s[i-1] {
			cur++
			continue
		}
		if firstLen == 0 {
			firstLen = cur
		} else if pre == -1 {
			pre = cur
			ans += pre
		} else {
			if cur < pre {
				pre = cur
			}
			ans += pre
		}
		cur = 1
	}
	if firstLen == 0 {
		firstLen = cur
	} else if pre == -1 {
		pre = cur
		ans += pre
	} else {
		if cur < pre {
			pre = cur
		}
		ans += pre
	}
	fmt.Println(ans)
}
