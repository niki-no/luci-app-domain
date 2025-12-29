本库代码完全由ai生成！    
本库代码综合了[luci-app-ddns-go](https://github.com/sirpdboy/luci-app-ddns-go)，luci-app-acme，HaProxy的功能，使得域名相关功能设置集中化！

## **反代配置**
用于将 `https://mv.movie.top` 代理至内网 `192.168.10.3:7023`

### 核心配置
| 模块          | 配置项               | 参数示例/说明                                                                 | 必要性 |
|---------------|----------------------|-----------------------------------------------------------------------------|--------|
| **前端配置**  |                      |                                                                             |        |
|               | 监听地址             | `0.0.0.0:80` (HTTP) 或 `0.0.0.0:443` (HTTPS)                      | 必选   |
|               | ACL规则              | `acl is_mv hdr(host) -i mv.movie.top`                                       | 必选   |
|               | 证书绑定             | `bind *:443 ssl crt /etc/acme/movie.top/fullchain.cer`                      | 必选   |
| **后端配置**  |                      |                                                                             |        |
|               | 后端名称             | `backend_mv`                                                               | 必选   |
|               | 服务器地址           | `server server1 192.168.10.3:7023 check`                                    | 必选   |
|               | 负载均衡算法         | `roundrobin` (单服务器时可忽略)                                             | 可选   |

### 完整配置示例
```bash
frontend https_in
    bind *:443 ssl crt /etc/acme/movie.top/fullchain.cer
    acl is_mv hdr(host) -i mv.movie.top
    use_backend backend_mv if is_mv

backend backend_mv
    server server1 192.168.10.3:7023 check
```
## **证书配置**
用于申请 *.movie.top 的 Let's Encrypt 证书（DNS-01 验证）

| 配置项               | 参数值/操作说明                                                                 | 必要性 |
|----------------------|-------------------------------------------------------------------------------|--------|
| **基本设置**         |                                                                               |        |
| `启用`               | ✅ 勾选                                                                       | 必选   |
| `验证方法`           | `DNS-01 DNS验证`                                                              | 必选   |
| `域名`               | 添加两行：<br>1. `movie.top`（主域名）<br>2. `*.movie.top`（泛域名）          | 必选   |
| **高级设置**         |                                                                               |        |
| `ACME服务器URL`      | Let's Encrypt 生产环境：<br>`https://acme-v02.api.letsencrypt.org/directory`  | 必选   |
| `密钥类型`           | `RSA 2048位`                                                                  | 可选   |
| `更新前天数`         | `60`（默认值）                                                                | 可选   |
| **DNS验证**          |                                                                               |        |
| `DNS API`            | 选择您的 DNS 服务商（如 `dns_cf`、`dns_ali`、`dns_dp`）                       | 必选   |
| `DNS API凭据`        | **Cloudflare**:<br>`CF_Key="your_api_key"`<br>`CF_Email="your_email"`<br>**阿里云**:<br>`Ali_Key="your_id"`<br>`Ali_Secret="your_secret"` | 必选   |
| **证书路径**         | `/etc/acme/movie.top/fullchain.cer`（证书）<br>`/etc/acme/movie.top/movie.top.key`（私钥） | 自动生成 |
