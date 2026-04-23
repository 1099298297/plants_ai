package main

import (
	"fmt"
)

func main() {
	var n int
	var s string
	fmt.Scan(&n, &s)
	ans := 0
	i := 0
	for i < n {
		j := i + 1
		for j < n && s[j] == s[i] {
			j++
		}
		if j < n {
			ans += 2
			i = j + 1
		} else {
			break
		}
	}
	fmt.Println(ans)
}
