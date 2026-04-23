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

	var t int
	fmt.Fscan(in, &t)

	for i := 0; i < t; i++ {
		var n, m int64
		fmt.Fscan(in, &n, &m)
		if n < 3*m || ((n-3*m)&1) == 1 {
			fmt.Fprintln(out, -1)
			continue
		}
		fmt.Fprintln(out, (n-m)/2)

	}

}
