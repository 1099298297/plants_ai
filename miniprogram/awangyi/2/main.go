
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
)


func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	
	var N, M, K int
	if _, err := fmt.Fscan(in, &N, &M, &K); err != nil {
		return
	}
	var sr, sc, er, ec int
	fmt.Fscan(in, &sr, &sc, &er, &ec)

	grid := make([][]byte, N+1)
	for i := 1; i <= N; i++ {
		grid[i] = make([]byte, M+1)
		for j := 1; j <= M; j++ {
			grid[i][j] = '.'
		}
	}

	
	for i := 0; i < K; i++ {
		var r, c int
		var s string
		fmt.Fscan(in, &r, &c, &s)
		grid[r][c] = s[0]
	}


	rows := make([][]int, N+1)
	cols := make([][]int, M+1)
	for i := 1; i <= N; i++ {
		rows[i] = []int{0, M + 1}
	}
	for j := 1; j <= M; j++ {
		cols[j] = []int{0, N + 1}
	}

	for i := 1; i <= N; i++ {
		for j := 1; j <= M; j++ {
			if grid[i][j] != '.' {
				rows[i] = append(rows[i], j)
				cols[j] = append(cols[j], i)
			}
		}
	}

	for i := 1; i <= N; i++ {
		sort.Ints(rows[i])
	}
	for j := 1; j <= M; j++ {
		sort.Ints(cols[j])
	}

	
	dr := []int{0, 0, -1, 1} 
	dc := []int{1, -1, 0, 0}
	
	slashMap := map[int]int{
		0: 2, 
		1: 3, 
		2: 1, 
		3: 0, 
	}

	backMap := map[int]int{
		0: 3, 
		1: 2, 
		2: 0, 
		3: 1, 
	}

	
	inRange := func(a, b, x int) bool {
		return x >= a && x <= b
	}

	
	type triple struct{ r, c, d int }
	simulate := func(r, c, dir int) (int, int, bool) {
		
		seen := make(map[int]bool)
		cr, cc, cd := r, c, dir
		for {
			
			key := (cr<<20)|(cc<<2)|cd
			if seen[key] {
				
				return -1, -1, false
			}
			seen[key] = true

			if cd == 0 { // 右
				row := rows[cr]
				idx := sort.SearchInts(row, cc+1)
				nc := row[idx] 
				if cr == er && inRange(cc+1, nc-1, ec) {
					return -1, -1, true
				}
			
				if nc == M+1 || grid[cr][nc] == '#' {
					return cr, nc - 1, false
				}
			
				m := grid[cr][nc]
				var nd int
				if m == '/' {
					nd = slashMap[cd]
				} else {
					nd = backMap[cd]
				}
				nr := cr + dr[nd]
				nc2 := nc + dc[nd]
				
				if nr < 1 || nr > N || nc2 < 1 || nc2 > M || grid[nr][nc2] == '#' || (grid[nr][nc2] != '.' && grid[nr][nc2] != '/' && grid[nr][nc2] != '\\' && !(nr == er && nc2 == ec)) {
					
					return cr, nc - 1, false
				}
			
				if nr == er && nc2 == ec {
					return -1, -1, true
				}
			
				cr, cc, cd = cr, nc, nd
				continue
			} else if cd == 1 { // 左
				row := rows[cr]
				idx := sort.SearchInts(row, cc)
				nc := row[idx-1] 
				if cr == er && inRange(nc+1, cc-1, ec) {
					return -1, -1, true
				}
				if nc == 0 || grid[cr][nc] == '#' {
					return cr, nc + 1, false
				}
				m := grid[cr][nc]
				var nd int
				if m == '/' {
					nd = slashMap[cd]
				} else {
					nd = backMap[cd]
				}
				nr := cr + dr[nd]
				nc2 := nc + dc[nd]
				if nr < 1 || nr > N || nc2 < 1 || nc2 > M || grid[nr][nc2] == '#' || (grid[nr][nc2] != '.' && grid[nr][nc2] != '/' && grid[nr][nc2] != '\\' && !(nr == er && nc2 == ec)) {
					return cr, nc + 1, false
				}
				if nr == er && nc2 == ec {
					return -1, -1, true
				}
				cr, cc, cd = cr, nc, nd
				continue
			} else if cd == 2 { // 上
				col := cols[cc]
				idx := sort.SearchInts(col, cr)
				nr := col[idx-1] 
				if cc == ec && inRange(nr+1, cr-1, er) {
					return -1, -1, true
				}
				if nr == 0 || grid[nr][cc] == '#' {
					return nr + 1, cc, false
				}
				m := grid[nr][cc]
				var nd int
				if m == '/' {
					nd = slashMap[cd]
				} else {
					nd = backMap[cd]
				}
				nr2 := nr + dr[nd]
				nc2 := cc + dc[nd]
				if nr2 < 1 || nr2 > N || nc2 < 1 || nc2 > M || grid[nr2][nc2] == '#' || (grid[nr2][nc2] != '.' && grid[nr2][nc2] != '/' && grid[nr2][nc2] != '\\' && !(nr2 == er && nc2 == ec)) {
					return nr + 1, cc, false
				}
				if nr2 == er && nc2 == ec {
					return -1, -1, true
				}
				cr, cc, cd = nr, cc, nd
				continue
			} else { // 下
				col := cols[cc]
				idx := sort.SearchInts(col, cr+1)
				nr := col[idx] 
				if cc == ec && inRange(cr+1, nr-1, er) {
					return -1, -1, true
				}
				if nr == N+1 || grid[nr][cc] == '#' {
					return nr - 1, cc, false
				}
				m := grid[nr][cc]
				var nd int
				if m == '/' {
					nd = slashMap[cd]
				} else {
					nd = backMap[cd]
				}
				nr2 := nr + dr[nd]
				nc2 := cc + dc[nd]
				if nr2 < 1 || nr2 > N || nc2 < 1 || nc2 > M || grid[nr2][nc2] == '#' || (grid[nr2][nc2] != '.' && grid[nr2][nc2] != '/' && grid[nr2][nc2] != '\\' && !(nr2 == er && nc2 == ec)) {
					return nr - 1, cc, false
				}
				if nr2 == er && nc2 == ec {
					return -1, -1, true
				}
				cr, cc, cd = nr, cc, nd
				continue
			}
		}
	}


	if sr == er && sc == ec {
		fmt.Fprintln(out, 0)
		return
	}


	dist := make([][]int, N+1)
	for i := 1; i <= N; i++ {
		dist[i] = make([]int, M+1)
		for j := 1; j <= M; j++ {
			dist[i][j] = -1
		}
	}
	type pair struct{ r, c int }
	q := make([]pair, 0, N*M)
	q = append(q, pair{sr, sc})
	dist[sr][sc] = 0
	head := 0
	for head < len(q) {
		cur := q[head]
		head++
	
		for d := 0; d < 4; d++ {
			nr, nc, reached := simulate(cur.r, cur.c, d)
	
			if reached {
				fmt.Fprintln(out, dist[cur.r][cur.c]+1)
				return
			}
			
			if nr == -1 && nc == -1 {
				continue
			}
			if nr == cur.r && nc == cur.c {
				continue
			}
			if dist[nr][nc] == -1 {
				dist[nr][nc] = dist[cur.r][cur.c] + 1
				q = append(q, pair{nr, nc})
			}
		}
	}
	
	fmt.Fprintln(out, -1)
}

