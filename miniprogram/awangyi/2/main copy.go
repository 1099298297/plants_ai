
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
)

// 行列大小读取
func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	// 读取参数
	var N, M, K int
	if _, err := fmt.Fscan(in, &N, &M, &K); err != nil {
		return
	}
	var sr, sc, er, ec int
	fmt.Fscan(in, &sr, &sc, &er, &ec)

	// 初始化网格全为空冰面
	grid := make([][]byte, N+1)
	for i := 1; i <= N; i++ {
		grid[i] = make([]byte, M+1)
		for j := 1; j <= M; j++ {
			grid[i][j] = '.'
		}
	}

	// 存放组件位置
	// 读取K个组件
	for i := 0; i < K; i++ {
		var r, c int
		var s string
		fmt.Fscan(in, &r, &c, &s)
		grid[r][c] = s[0]
	}

	// 行列组件索引预处理
	rows := make([][]int, N+1)
	cols := make([][]int, M+1)
	for i := 1; i <= N; i++ {
		rows[i] = []int{0, M + 1}
	}
	for j := 1; j <= M; j++ {
		cols[j] = []int{0, N + 1}
	}
	// 添加组件坐标
	for i := 1; i <= N; i++ {
		for j := 1; j <= M; j++ {
			if grid[i][j] != '.' {
				rows[i] = append(rows[i], j)
				cols[j] = append(cols[j], i)
			}
		}
	}
	// 排序每行每列
	for i := 1; i <= N; i++ {
		sort.Ints(rows[i])
	}
	for j := 1; j <= M; j++ {
		sort.Ints(cols[j])
	}

	// 方向和镜像映射
	dr := []int{0, 0, -1, 1} // 0:right,1:left,2:up,3:down (we'll map consistently)
	dc := []int{1, -1, 0, 0}
	// 实际使用的方向 indices: 0:right,1:left,2:up,3:down
	// '/' 映射
	slashMap := map[int]int{
		0: 2, // right -> up
		1: 3, // left -> down
		2: 1, // up -> left
		3: 0, // down -> right
	}
	// '\' 映射
	backMap := map[int]int{
		0: 3, // right -> down
		1: 2, // left -> up
		2: 0, // up -> right
		3: 1, // down -> left
	}

	// 辅助函数：检查目标是否在行内区间
	inRange := func(a, b, x int) bool {
		return x >= a && x <= b
	}

	// 模拟一次从(r,c)朝dir滑动，返回停点与是否到达目标
	type triple struct{ r, c, d int }
	simulate := func(r, c, dir int) (int, int, bool) {
		// 记录滑动过程中访问的(格,方向)防环
		seen := make(map[int]bool)
		cr, cc, cd := r, c, dir
		for {
			// 生成唯一键
			key := (cr<<20)|(cc<<2)|cd
			if seen[key] {
				// 环路且未遇见终点，视为无效
				return -1, -1, false
			}
			seen[key] = true

			if cd == 0 { // 右
				row := rows[cr]
				idx := sort.SearchInts(row, cc+1)
				nc := row[idx] // 下一个组件列或边界M+1
				// 判断路径上是否经过终点
				if cr == er && inRange(cc+1, nc-1, ec) {
					return -1, -1, true
				}
				// 如果是边界或黑块
				if nc == M+1 || grid[cr][nc] == '#' {
					return cr, nc - 1, false
				}
				// 是镜子
				m := grid[cr][nc]
				var nd int
				if m == '/' {
					nd = slashMap[cd]
				} else {
					nd = backMap[cd]
				}
				nr := cr + dr[nd]
				nc2 := nc + dc[nd]
				// 出口格子是否合法
				if nr < 1 || nr > N || nc2 < 1 || nc2 > M || grid[nr][nc2] == '#' || (grid[nr][nc2] != '.' && grid[nr][nc2] != '/' && grid[nr][nc2] != '\\' && !(nr == er && nc2 == ec)) {
					// 规则说明中出口为积木、边界或其他转向板均视为不可反射
					// 只要出口是边界或'#'或另一个转向板，则当作阻挡停在镜子前
					// 另：若出口为终点则允许通过
					// 另外镜子视为障碍，因此需停在前一格
					// 停在镜子前
					return cr, nc - 1, false
				}
				// 如果出口是目标，则经过目标
				if nr == er && nc2 == ec {
					return -1, -1, true
				}
				// 反射成功，进入镜子格并改变方向
				cr, cc, cd = cr, nc, nd
				continue
			} else if cd == 1 { // 左
				row := rows[cr]
				idx := sort.SearchInts(row, cc)
				nc := row[idx-1] // 前一个组件列或边界0
				// 判断路径上是否经过终点
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
				nr := col[idx-1] // 前一个组件行或边界0
				// 判断路径上是否经过终点
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
				nr := col[idx] // 下一个组件行或边界N+1
				// 判断路径上是否经过终点
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

	// 起点即终点
	if sr == er && sc == ec {
		fmt.Fprintln(out, 0)
		return
	}

	// BFS队列初始化
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
		// 四个方向尝试推动
		for d := 0; d < 4; d++ {
			nr, nc, reached := simulate(cur.r, cur.c, d)
			// 如果滑动途中经过终点
			if reached {
				fmt.Fprintln(out, dist[cur.r][cur.c]+1)
				return
			}
			// 无法停下或停在原地则跳过
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
	// 无解
	fmt.Fprintln(out, -1)
}

