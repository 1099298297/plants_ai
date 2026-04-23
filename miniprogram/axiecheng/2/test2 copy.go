// package main

// import (
// 	"bufio"
// 	"fmt"
// 	"os"
// )

// func main() {
// 	in := bufio.NewReaderSize(os.Stdin, 1<<20)
// 	out := bufio.NewWriterSize(os.Stdout, 1<<20)
// 	defer out.Flush()

// 	var t int
// 	fmt.Fscan(in, &t)

// 	for ; t > 0; t-- {
// 		var n, m int64
// 		fmt.Fscan(in, &n, &m)

// 		var x int64
// 		// 取最小合法倍数
// 		if (n&1) == (m&1) {
// 			x = m
// 		} else {
// 			x = 2 * m
// 		}

// 		// 判断是否可行
// 		if 3*x > n {
// 			fmt.Fprintln(out, -1)
// 			continue
// 		}

// 		// 输出最大数量
// 		fmt.Fprintln(out, (n-x)/2)
// 	}
// }