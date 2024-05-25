## 准备阶段
打开系统的terminal app, 然后使用如下`cd` (change directory的缩写) 命令指定使用ss程序所在文件夹.
```bash
cd <the_path_containing_ss>
```

mac系统我推荐下载vscode (visual studio code) 并使用vscode内置的terminal (vscode里按`` ctrl+` ``调出) 来代替系统的terminal，它对颜色支持好一些，系统自带的terminal程序使用了非通用的颜色系统，显示的东西颜色会混乱 (比如经常变成浅灰色)，不过其实也不影响使用。

主目录里除了`webpages`是个存放网页的文件夹外，剩下的每个文件夹代表着一个由spectra和它们之间的映射构成的"diagram", 这样的文件夹名字就是下面将会使用的`diagram_name`。 每个"diagram"都是独立的，可以靠复制文件夹来备份"diagram"以便误操作后使用原来的文件夹。**注意文件夹名字不能有空格**，最好都是字母数字以及下划线。

## 画图
如下命令会把数据库文件变成网页文件。
```bash
./ss plot_ss <diagram_name>
```

图的数据存在`webpages/mix`文件夹里，网页`webpages/mix.html`里整理了很多链接可以访问这些图，双击即可打开这个本地网页。图再次更新后时刷新网页即可。

## 添加differential
如下命令可以在`spectra`里的`(stem, s)`里添加`d_r(x)=dx`. 其中`x`与`dx`的值需要要去谱序列网页里查看点的信息。
```bash
./ss add_diff <spectra> <stem> <s> <r> <x> <dx> [diagram_name]
```

当一个differential target等于零时可以使用""，比如
```bash
./ss add_diff S0 1 1 999 0 "" diagram_name
```
使用`r=999`就可以使它变成permanent cycle, 但注意`r`不能超过`999`。

当设定某个点`dx=[0]`被未知d3 hit时，使用d4""=这个点，比如
```bash
./ss add_diff S0 <stem> <s> 4 "" 0 diagram_name
```


上面`<>`只是说明这个参数是必输参数，`[]`说明这个参数可以省略，上面`diagram_name`的默认值可以在根目录里的`ss.json`文件里设置，比如在该`json`文件里如果写着`"default": "abc"`就表示不写`diagram_name`时默认使用`abc`.

##  推导differential
### Apply Leibniz rule/naturality
如下命令表示尝试确定`stem_min<=stem<=stem_max`范围内的未知differential. 在diagram_name的文件夹内还有一个`ss.jon`，这个文件夹描述了spectra及map等，以及`"deduce": "on/off"`的选项可以调整在推导时跳过哪些spectra (因为run一遍比较久想赶时间时可以选择这么做)。
```bash
./ss deduce diff [stem_min] [stem_max] [diagram_name] [flags...]
```

最后的可选参数flags目前支持以下值
* `all_x`: 假如某个degree现有基底为x, y，那么程序默认中尝试推导dx, dy, 但有时存在dx, dy都确定不了但d(x+y)可以被确定的情况，本选项可以令程序尝试确定所有基底线性组合的differential。
* `xy`: 假如dx没有被成功确定，此选项可以令程序继续尝试确定d(xy)的值，因为确实有dx遍历所有可能d(xy)仍为同一值的情况。同样的程序也会进一步对映射f尝试确定d(f(x))的值。

示例
```bash
./ss deduce diff 0 150 diagram all_x
./ss deduce diff 0 150 diagram xy
./ss deduce diff 0 150 diagram all_x xy
```

### 除了原推导方法外手动应用一些数学
我在程序中加入了一些额外的知识，目前主要是关于image of j和tmf，使用以下命令可以去除许多特别长的differential。
```bash
./ss deduce manual [diagram_name]
```

### 合并信息
使用如下的命令可以把`diagramA`的信息添加到`diagramB`。
```bash
./ss migrate_ss <diagramA> <diagramB>
```
这个程序的运行原理是检查两个diagram里ss.json中有没有相同名字的spectra, 有的话就把第一个的信息添加到第二个。如果第一个的计算范围大于第二个，该操作不会扩大第二个spectra的计算范围。该操作也不会给`diagramB`添加`diagramA`有但`diagramB`没有的spectra。