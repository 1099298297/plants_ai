package main

import (
	"bufio"
	"os"
)

var rdr = bufio.NewReaderSize(os.Stdin, 1<<20)
var wtr = bufio.NewWriterSize(os.Stdout, 1<<20)

func nextInt() int64 {
	sign := int64(1)
	val := int64(0)
	c, _ := rdr.ReadByte()
	for (c < '0' || c > '9') && c != '-' {
		c, _ = rdr.ReadByte()
	}
	if c == '-' {
		sign = -1
		c, _ = rdr.ReadByte()
	}
	for c >= '0' && c <= '9' {
		val = val*10 + int64(c-'0')
		c, _ = rdr.ReadByte()
	}
	return val * sign
}
func min(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
func check(x int64, n int, w int, a, b []int64, m int64) int64 {
	if x == 0 {
		for i := 0; i < n; i++ {
			if a[i] > b[i] {
				return m + 1
			}
		}
		return 0
	}
	diff := make([]int64, n+1)
	cur := int64(0)
	ans := int64(0)
	for i := 0; i < n; i++ {
		cur += diff[i]
		need := a[i] - (b[i] + cur)
		if need > 0 {
			k := (need + x - 1) / x
			ans += k
			if ans > m {
				return m + 1
			}
			cur += k * x
			if i+w < n {
				diff[i+w] -= k * x
			}
		}
	}
	return ans
}

func main() {
	defer wtr.Flush()
	T := int(nextInt())
	for tc := 0; tc < T; tc++ {
		n := int(nextInt())
		m := int64(nextInt())
		w := int(nextInt())
		a := make([]int64, n)
		b := make([]int64, n)
		maxDef := int64(0)

		for i := 0; i < n; i++ {
			a[i] = nextInt()
		}
		for i := 0; i < n; i++ {
			b[i] = nextInt()
			if a[i]-b[i] > maxDef {
				maxDef = a[i] - b[i]
			}
		}
		if maxDef <= 0 {
			wtr.WriteString("0 0\n")
			continue
		}
		lo := int64(1)
		hi := maxDef
		resX := int64(-1)
		for lo <= hi {
			mid := (lo + hi) >> 1
			if check(mid, n, w, a, b, m) <= m {
				resX = mid
				hi = mid - 1
			} else {
				lo = mid + 1
			}
		}
		if resX == -1 {
			wtr.WriteString("-1\n")
		} else {
			c := check(resX, n, w, a, b, m)
			wtr.WriteString(fmtInt(resX))
			wtr.WriteByte(' ')
			wtr.WriteString(fmtInt(c))
			wtr.WriteByte('\n')
		}

	}
}
func fmtInt(x int64) string {
	if x == 0 {
		return "0"
	}
	neg := false
	if x < 0 {
		neg = true
		x = -x
	}
	buf := make([]byte, 0, 20)
	for x > 0 {
		buf = append(buf, byte('0'+x%10))
		x /= 10
	}
	if neg {
		buf = append(buf, '-')
	}
	for i, j := 0, len(buf)-1; i < j; i, j = i+1, j-1 {
		buf[i], buf[j] = buf[j], buf[i]
	}
	return string(buf)
}
