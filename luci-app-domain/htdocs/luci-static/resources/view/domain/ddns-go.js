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
    var statusText = isRunning ? _('RUNNING') : _('NOT RUNNING');
    var color = isRunning ? 'green' : 'red';
    var icon = isRunning ? '✓' : '✗';
    var versionText = version ? `v${version}` : '';
    
    var html = String.format(
        '<em><span style="color:%s">%s <strong>%s %s - %s</strong></span></em>',
        color, icon, _('DDNS-Go'), versionText, statusText
    );
    
    if (isRunning && noweb !== '1') {
        html += String.format('&#160;<a class="btn cbi-button" href="http://%s:%s" target="_blank">%s</a>', 
             window.location.hostname, listen_port, _('Open Web Interface'));
    }
    
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
        var listen_port = (uci.get('ddns-go', 'config', 'port') || '[::]:9876').split(':').slice(-1)[0];
        var noweb = uci.get('ddns-go', 'config', 'noweb') || '0';

        m = new form.Map('ddns-go', _('DDNS-GO Control panel'),
            _('DDNS-GO automatically obtains your public IPv4 or IPv6 address and resolves it to the corresponding domain name service.'));

        // 状态显示部分
        s = m.section(form.TypedSection);
        s.anonymous = true;
   
        s.render = function() {
            var statusView = E('p', { id: 'control_status' }, 
                '<span class="spinning"></span> ' + _('Checking status...'));
            
            window.statusPoll = function() {
                return checkProcess().then(function(processInfo) {
                    statusView.innerHTML = renderStatus(processInfo.running, listen_port, noweb, '');
                }).catch(function(err) {
                    console.error('Status check failed:', err);
                    statusView.innerHTML = '<span style="color:orange">⚠ ' + _('Status check error') + '</span>';
                });
            };
            
            var pollInterval = poll.add(window.statusPoll, 5); // 每5秒检查一次
            
            return E('div', { class: 'cbi-section', id: 'status_bar' }, [
                statusView,
                E('div', { 'style': 'text-align: right; font-style: italic;' }, [
                    E('span', {}, [
                        _('© github '),
                        E('a', { 
                            'href': 'https://github.com/sirpdboy', 
                            'target': '_blank',
                            'style': 'text-decoration: none;'
                        }, 'by sirpdboy')
                    ])
                ])
            ]);
        };

        // 基本设置部分
        s = m.section(form.NamedSection, 'config', 'basic', _('基本设置'));
        s.anonymous = true;

        o = s.option(form.Flag, 'enabled', _('Enable'));
        o.default = o.disabled;
        o.rmempty = false;

        o = s.option(form.Value, 'port', _('Listen port'));
        o.default = '[::]:9876';
        o.rmempty = false;

        o = s.option(form.Value, 'time', _('Update interval'));
        o.default = '300';

        o = s.option(form.Value, 'ctimes', _('Compare with service provider N times intervals'));
        o.default = '5';

        o = s.option(form.Value, 'skipverify', _('Skip verifying certificates'));
        o.default = '0';

        o = s.option(form.Value, 'dns', _('Specify DNS resolution server'));
        o.value('223.5.5.5', _('Ali DNS 223.5.5.5'));
        o.value('223.6.6.6', _('Ali DNS 223.6.6.6'));
        o.value('119.29.29.29', _('Tencent DNS 119.29.29.29'));
        o.value('1.1.1.1', _('CloudFlare DNS 1.1.1.1'));
        o.value('8.8.8.8', _('Google DNS 8.8.8.8'));
        o.value('8.8.4.4', _('Google DNS 8.8.4.4'));
        o.datatype = 'ipaddr'; 

        o = s.option(form.Flag, 'noweb', _('Do not start web services'));
        o.default = '0';
        o.rmempty = false;

        o = s.option(form.Value, 'delay', _('Delayed Start (seconds)'));
        o.default = '60';
        
        // 控制面板部分
        s = m.section(form.GridSection, '_control_panel');
        s.render = function() {
            var self = this;
            
            return self.checkRunning().then(function(checkResult) {
                var isRunning = checkResult.isRunning;
                var port = uci.get('ddns-go', 'config', 'port') || '[::]:9876';
                port = port.split(':').pop();
                var noweb = uci.get('ddns-go', 'config', 'noweb') || '0';
                
                var container = E('div', { class: 'cbi-section', style: 'margin-top: 20px;' }, [
                    E('h3', _('控制面板')),
                    E('div', { style: 'margin-bottom: 10px;' }, _('DDNS-GO Web管理界面'))
                ]);
                
                if (!isRunning) {
                    var message = _('DDNS-GO Service Not Running');
                    
                    container.appendChild(E('div', { 
                        style: 'text-align: center; padding: 2em;' 
                    }, [
                        E('img', {
                            src: 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCI+PHBhdGggZmlsbD0iI2RmMDAwMCIgZD0iTTk0Mi40MjEgMjM0LjYyNGw4MC44MTEtODAuODExLTE1My4wNDUtMTUzLjA0NS04MC44MTEgODAuODExYy03OS45NTctNTEuNjI3LTE3NS4xNDctODEuNTc5LTI3Ny4zNzYtODEuNTc5LTI4Mi43NTIgMC01MTIgMjI5LjI0OC01MTIgNTEyIDAgMTAyLjIyOSAyOS45NTIgMTk3LjQxOSA4MS41NzkgMjc3LjM3NmwtODAuODExIDgwLjgxMSAxNTMuMDQ1IDE1My4wNDUgODAuODExLTgwLjgxMWM3OS45NTcgNTEuNjI3IDE3NS4xNDcgODEuNTc5IDI3Ny4zNzYgODEuNTc5IDI4Mi43NTIgMCA1MTItMjI5LjI0OCA1MTItNTEyIDAtMTAyLjIyOS0yOS45NTItMTk3LjQxOS04MS41NzktMjc3LjM3NnpNMTk0Ljk0NCA1MTJjMC0xNzUuMTA0IDE0MS45NTItMzE3LjA1NiAzMTcuMDU2LTMxNy4wNTYgNDggMCA5My40ODMgMTAuNjY3IDEzNC4yMjkgMjkuNzgxbC00MjEuNTQ3IDQyMS41NDdjLTE5LjA3Mi00MC43ODktMjkuNzM5LTg2LjI3Mi0yOS43MzktMTM0LjI3MnpNNTEyIDgyOS4wNTZjLTQ4IDAtOTMuNDgzLTEwLjY2Ny0xMzQuMjI5LTI5Ljc4MWw0MjEuNTQ3LTQyMS41NDdjMTkuMDcyIDQwLjc4OSAyOS43ODEgODYuMjcyIDI5Ljc4MSAxMzQuMjI5LTAuMDQzIDE3NS4xNDctMTQxLjk5NSAzMTcuMDk5LTMxNy4wOTkgMzE3LjA5OXoiLz48L3N2Zz4=',
                            style: 'width: 100px; height: 100px; margin-bottom: 1em;'
                        }),
                        E('h2', {}, message)
                    ]));
                } else if (noweb === '1') {
                    container.appendChild(E('div', { 
                        style: 'text-align: center; padding: 2em;' 
                    }, [
                        E('h2', {}, _('DDNS-GO Web Interface Disabled')),
                        E('p', _('The web interface has been disabled in the settings.'))
                    ]));
                } else {
                    var iframe = E('iframe', {
                        src: 'http://' + window.location.hostname + ':' + port,
                        style: 'width: 100%; min-height: 600px; border: 1px solid #ccc;'
                    });
                    container.appendChild(iframe);
                }
                
                return container;
            });
        }.bind(this);

        return m.render();
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});