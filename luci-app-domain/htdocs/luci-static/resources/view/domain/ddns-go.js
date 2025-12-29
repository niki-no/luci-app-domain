/*   Copyright (C) 2021-2025 sirpdboy herboy2008@gmail.com https://github.com/sirpdboy/luci-app-domain */
'use strict';
'require view';
'require fs';
'require ui';
'require uci';
'require form';
'require poll';

function checkProcess() {
    // 先尝试用 pidof
    try {
        return fs.exec('/bin/pidof', ['ddns-go']).then(function(pidofRes) {
            if (pidofRes.code === 0) {
                return {
                    running: true,
                    pid: pidofRes.stdout.trim()
                };
            }
            // 尝试用 ps
            return fs.exec('/bin/ps', ['-C', 'ddns-go', '-o', 'pid=']).then(function(psRes) {
                const pid = psRes.stdout.trim();
                return {
                    running: pid !== '',
                    pid: pid || null
                };
            });
        });
    } catch (err) {
        return Promise.resolve({ running: false, pid: null });
    }
}

function renderStatus(isRunning, listen_port, noweb, version) {
    var statusText = isRunning ? _('运行中') : _('未运行');
    var color = isRunning ? 'green' : 'red';
    var icon = isRunning ? '✓' : '✗';
    var versionText = version ? `v${version}` : '';
    
    var html = String.format(
        '<em><span style="color:%s">%s <strong>%s %s - %s</strong></span></em>',
        color, icon, _('DDNS-Go'), versionText, statusText
    );
    
    return html;
}

return view.extend({
    load: function() {
        return uci.load('ddns-go');
    },

    checkRunning: function() {
        return fs.exec('/bin/pidof', ['ddns-go']).then(function(pidRes) {
            if (pidRes.code === 0) return { isRunning: true };
            return fs.exec('/bin/ash', ['-c', 'ps | grep -q "[d]dns-go"']).then(function(grepRes) {
                return { isRunning: grepRes.code === 0 };
            });
        });
    },
    
    render: function() {
        var m, s, o;

        m = new form.Map('ddns-go', _('动态域名'),
            _('动态域名服务自动获取您的公网IPv4或IPv6地址，并解析到对应的域名服务。'));

        // 基本设置部分
        s = m.section(form.GridSection, 'config', _('基本设置'));
        s.anonymous = true;
        s.addremove = false;
        s.nodescriptions = false;

        o = s.option(form.Flag, 'enabled', _('启用'));
        o.default = o.disabled;
        o.rmempty = false;

        o = s.option(form.Value, 'time', _('更新间隔'));
        o.default = '300';

        o = s.option(form.Value, 'ctimes', _('与服务提供商比较次数间隔'));
        o.default = '5';

        o = s.option(form.Value, 'skipverify', _('跳过证书验证'));
        o.default = '0';

        o = s.option(form.Value, 'dns', _('指定DNS解析服务器'));
        o.value('223.5.5.5', _('阿里DNS 223.5.5.5'));
        o.value('223.6.6.6', _('阿里DNS 223.6.6.6'));
        o.value('119.29.29.29', _('腾讯DNS 119.29.29.29'));
        o.value('1.1.1.1', _('CloudFlare DNS 1.1.1.1'));
        o.value('8.8.8.8', _('谷歌DNS 8.8.8.8'));
        o.value('8.8.4.4', _('谷歌DNS 8.8.4.4'));
        o.datatype = 'ipaddr'; 

        o = s.option(form.Value, 'delay', _('延迟启动 (秒)'));
        o.default = '60';

        // 域名配置部分 - 参考luci-app-ddns-go的表格样式
        s = m.section(form.GridSection, 'domain', _('域名配置'));
        s.anonymous = true;
        s.addremove = false;
        s.nodescriptions = true;

        o = s.option(form.DummyValue, '_domain_table', _('域名配置表格')).render = function() {
            return E('div', { class: 'cbi-section' }, [
                E('table', { class: 'cbi-section-table' }, [
                    E('tr', { class: 'tr table-titles' }, [
                        E('th', _('备注')),
                        E('th', _('记录名')),
                        E('th', _('记录类型')),
                        E('th', _('记录内容')),
                        E('th', _('TTL')),
                        E('th', _('同步时间')),
                        E('th', _('操作'))
                    ]),
                    // 示例行
                    E('tr', {}, [
                        E('td', E('input', { type: 'text', value: '这是测试', style: 'width: 100%;' })),
                        E('td', E('input', { type: 'text', value: 'test.example.com', style: 'width: 100%;' })),
                        E('td', E('select', { style: 'width: 100%;' }, [
                            E('option', { value: 'A', selected: 'selected' }, 'A'),
                            E('option', { value: 'AAAA' }, 'AAAA')
                        ])),
                        E('td', E('input', { type: 'text', value: '192.168.1.1', style: 'width: 100%;' })),
                        E('td', E('select', { style: 'width: 100%;' }, [
                            E('option', { value: '600', selected: 'selected' }, '600')
                        ])),
                        E('td', '2025-12-29 17:02:42'),
                        E('td', [
                            E('button', { class: 'btn cbi-button', style: 'background: #7b68ee; color: white; margin-right: 5px;' }, _('编辑')),
                            E('button', { class: 'btn cbi-button', style: 'background: #ff7f50; color: white;' }, _('删除'))
                        ])
                    ]),
                    // 另一示例行
                    E('tr', {}, [
                        E('td', E('input', { type: 'text', value: 'IPv6测试', style: 'width: 100%;' })),
                        E('td', E('input', { type: 'text', value: 'ipv6.example.com', style: 'width: 100%;' })),
                        E('td', E('select', { style: 'width: 100%;' }, [
                            E('option', { value: 'A' }, 'A'),
                            E('option', { value: 'AAAA', selected: 'selected' }, 'AAAA')
                        ])),
                        E('td', E('input', { type: 'text', value: '2401:1234:1234:1234::1', style: 'width: 100%;' })),
                        E('td', E('select', { style: 'width: 100%;' }, [
                            E('option', { value: '600', selected: 'selected' }, '600')
                        ])),
                        E('td', '2025-12-29 17:03:15'),
                        E('td', [
                            E('button', { class: 'btn cbi-button', style: 'background: #7b68ee; color: white; margin-right: 5px;' }, _('编辑')),
                            E('button', { class: 'btn cbi-button', style: 'background: #ff7f50; color: white;' }, _('删除'))
                        ])
                    ])
                ]),
                E('div', { style: 'margin-top: 10px;' }, [
                    E('button', { class: 'btn cbi-button', style: 'background: #32cd32; color: white;' }, _('添加新域名'))
                ])
            ]);
        };

        // 运行日志部分
        s = m.section(form.GridSection, '_logs', _('运行日志'));
        s.anonymous = true;
        s.addremove = false;
        s.nodescriptions = true;
        s.render = L.bind(this.renderLogs, this, 'ddns-go');

        return m.render();
    },

    renderLogs: function(service) {
        var logContainer = E('div', { class: 'cbi-section', style: 'margin-top: 10px;' }, [
            E('div', { style: 'margin-bottom: 10px;' }, [
                E('button', {
                    class: 'cbi-button',
                    click: L.bind(this.refreshLogs, this, service)
                }, _('刷新日志')),
                E('button', {
                    class: 'cbi-button',
                    click: L.bind(this.clearLogs, this, service)
                }, _('清除日志'))
            ]),
            E('pre', {
                id: service + '_log_content',
                style: 'background: #000; color: #eee; padding: 10px; height: 300px; overflow: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-wrap: break-word;'
            }, _('加载日志中...'))
        ]);

        this.refreshLogs(service);

        poll.add(L.bind(this.refreshLogs, this, service), 5);
        poll.start();

        return logContainer;
    },

    refreshLogs: function(service) {
        var logContent = document.getElementById(service + '_log_content');
        var logCommand;

        switch(service) {
            case 'haproxy':
                logCommand = '/bin/ash -c "logread -e haproxy || cat /var/log/haproxy.log 2>/dev/null || echo \"No HAProxy logs found\""';
                break;
            case 'acme':
                logCommand = '/bin/ash -c "logread -e acme || cat /var/log/acme.log 2>/dev/null || echo \"No ACME logs found\""';
                break;
            case 'ddns-go':
                logCommand = '/bin/ash -c "logread -e ddns-go || cat /var/log/ddns-go.log 2>/dev/null || echo \"No DDNS-GO logs found\""';
                break;
            default:
                logCommand = '/bin/ash -c "echo \"Unknown service logs\""';
        }

        return fs.exec('/bin/ash', ['-c', logCommand])
            .then(function(res) {
                if (res.code === 0) {
                    // 只保留最新的100条日志
                    var lines = res.stdout.split('\n');
                    if (lines.length > 100) {
                        lines = lines.slice(-100);
                    }
                    logContent.textContent = lines.join('\n');
                } else {
                    logContent.textContent = _('无法获取日志: ') + (res.stderr || res.stdout);
                }
            })
            .catch(function(err) {
                logContent.textContent = _('错误: ') + err.message;
            });
    },

    clearLogs: function(service) {
        return fs.exec('/bin/ash', ['-c', 'logread -c || echo \"不支持清除日志\"'])
            .then(function(res) {
                if (res.code === 0) {
                    this.refreshLogs(service);
                } else {
                    alert(_('无法清除日志: ') + (res.stderr || res.stdout));
                }
            }.bind(this))
            .catch(function(err) {
                alert(_('错误: ') + err.message);
            });
    }
});