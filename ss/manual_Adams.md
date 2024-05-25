## 计算Resolution
```bash
./Adams res <cw> <t_max>
```
如上命令计算cw的resolution直到`t=t_max`. 其中`cw`可以取如下值
* `S0`, `C2`, `Ceta`, `Cnu`, `Csigma`
* `C2h4`, `C2h5`, `C2h6`, `DC2h4`, `DC2h5`, `DC2h6`
* `RPm3_6` 代表从(-3)-cell到6-cell
* `tmf_CP4_128` 代表tmf smash CP_4^{128}

## 计算Resolution上的乘法
```bash
./Adams prod <ring> <t_max>
```
如上命令计算名为`ring`的ring spectra乘法结构直到`t=t_max`. 其中`cw`可以取resolution已经support的任何值。

```bash
./Adams prod_mod <module> <ring> <t_max>
```
如上命令计算over `ring`的`module`的module乘法结构直到`t=t_max`. 其中(`module`, `ring`)可以取resolution已经support的任何spectra。

## 计算Resolution之间的链映射
```bash
./Adams map_coh <cw1> <cw2>
```
如上命令为`cw1`->`cw2`建立链映射文件，里面包含cohomology映射H^\*(cw2)->H^\*(cw1). 具体支持哪些映射看程序实现，如果不支持程序会显示不支持。这个命令基本瞬间完成，无需`nohup`。

```bash
./Adams map_res <cw1> <cw2> <t_max>
```
如上命令基于前一条命令创建的链映射文件计算链映射，算到 Ext(`cw1`) 的 `t=t_max`.

## 为`ss`程序导出所需的AdamsE2数据
```bash
./Adams export <ring> <t_max>
```
```bash
./Adams export_mod <module> <ring> <t_max>
```
```bash
./Adams export_map <cw1> <cw2> <t_max>
```


