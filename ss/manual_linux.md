## 通过Samba服务共享硬盘
### 服务方设置
安装samba
```
sudo apt update
sudo apt install samba
```

打开配置文件
```
sudo nano /etc/samba/smb.conf
```

在配置文件末尾添加如下设置，请把其中path修改为被分享的文件夹路径，`[sambashare]`里为连接的客户看到的文件夹名
```
[sambashare]
    comment = Samba on Linux machine 1
    path = /home/username/share
    read only = no
    browsable = yes
```

添加一个samba账户，账户名为机器上已有账户名，密码是独立的密码，当然设一样的也可以
```
sudo smbpasswd -a username
```

启动服务 (每次修改配置文件后都需要运行这条才能生效)
```
sudo systemctl restart smbd
```

### 客户方设置
假设服务器的ip地址为 1.2.3.4，则 1.2.3.4/sambashare 为服务器分享的文件夹在网络上的位置，此时无论是windows、mac还是linux客户都可以把该位置加入文件系统。如下为linux客户连接教程

安装`cifs-utils smbclient`
```
sudo apt install cifs-utils smbclient
```

创建一个文件夹作mount的点
```
sudo mkdir /sambashare
```

将`1.2.3.4/sambashare` mount到`/sambashare`
```
mount -t cifs //1.2.3.4/sambashare /sambashare
``````

中间需要输入服务器设置的samba账户密码，成功后客户机器上`/sambashare`里的东西就等于`//1.2.3.4/sambashare`

