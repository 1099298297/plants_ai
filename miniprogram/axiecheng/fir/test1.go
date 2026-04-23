package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	var n int64
	fmt.Fscan(in, &n)

	if n <= 1 {
		fmt.Println(1)
		return
	}
	sum := 0.0
	for i := int64(2); i < n; i++ {
		sum += math.Log10(float64(i))
	}
	fmt.Println(int64(sum) + 1)
}
