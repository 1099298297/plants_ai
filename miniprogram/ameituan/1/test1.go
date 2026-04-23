package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
)

func main(){
	in:=bufio.NewReader(os.Stdin)
	var l,r int64
	if _,err:=fmt.Fscan(in,&l,&r);err!=nil{
		return
	}
	a:=int64(math.Sqrt(float64(r)))
	for(a+1)*(a+1)<=r{
		a++
	}
	for a*a>r{
		a--
	}
	var leftBase int64
	if l>1{
		leftBase=int64(math.Sqrt(float64(l-1)))
	}else{
		leftBase=0
	}
	fmt.Println(a-leftBase)

}