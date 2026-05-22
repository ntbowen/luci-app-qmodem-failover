'use strict';
'require view';
'require dom';
'require rpc';
'require poll';
'require ui';

var callStatus = rpc.declare({
    object: 'luci.qmodem-failover',
    method: 'get_status'
});

var callSwitch = rpc.declare({
    object: 'luci.qmodem-failover',
    method: 'switch_mode',
    params: ['target']
});

var callTestNotify = rpc.declare({
    object: 'luci.qmodem-failover',
    method: 'test_notify'
});

var callLogs = rpc.declare({
    object: 'luci.qmodem-failover',
    method: 'get_logs'
});

return view.extend({
    title: _('QMODEM Failover'),

    load: function() {
        return callStatus();
    },

    render: function(data) {
        var container = E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, this.title),
            E('p', {}, _('Auto-switches to QMODEM LTE when wired WAN fails, switches back on recovery.')),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Current Status')),
                this.renderStatusCard(data)
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Manual Switch')),
                this.renderManualSwitch()
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Test Notification')),
                this.renderTestNotify()
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Recent Logs')),
                this.renderLogs()
            ])
        ]);
        return container;
    },

    renderStatusCard: function(data) {
        if (!data) data = {};
        var modeText = data.mode === 'wan' ? _('Wired WAN') : (data.mode === 'lte' ? _('LTE Failover') : _('Unknown'));
        var modeClass = data.mode === 'wan' ? 'success' : (data.mode === 'lte' ? 'warning' : 'danger');
        return E('div', { 'class': 'cbi-value', 'style': 'padding: 15px; background: var(--cbi-bg); border-radius: 8px;' }, [
            E('div', { 'style': 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;' }, [
                E('span', { 'style': 'font-weight: bold;' }, _('Current Mode:')),
                E('span', { 'class': 'label label-' + modeClass, 'style': 'font-size: 14px;' }, modeText)
            ]),
            E('div', { 'style': 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;' }, [
                E('div', { 'class': 'cbi-value-field' }, [
                    E('label', {}, _('WAN Interface') + ':'),
                    E('span', {}, data.wan_iface || '-')
                ]),
                E('div', { 'class': 'cbi-value-field' }, [
                    E('label', {}, _('LTE Interface') + ':'),
                    E('span', {}, data.lte_iface || '-')
                ]),
                E('div', { 'class': 'cbi-value-field' }, [
                    E('label', {}, _('WAN IP') + ':'),
                    E('span', {}, data.wan_ip || '-')
                ]),
                E('div', { 'class': 'cbi-value-field' }, [
                    E('label', {}, _('LTE IP') + ':'),
                    E('span', {}, data.lte_ip || '-')
                ]),
                E('div', { 'class': 'cbi-value-field' }, [
                    E('label', {}, _('Service') + ':'),
                    E('span', {}, data.service_running ? _('Running') : _('Stopped'))
                ])
            ])
        ]);
    },

    renderManualSwitch: function() {
        var self = this;
        return E('div', { 'class': 'cbi-value' }, [
            E('button', {
                'class': 'cbi-button cbi-button-apply',
                'click': function() { self.switchTo('wan'); }
            }, _('Switch to WAN')),
            E('button', {
                'class': 'cbi-button cbi-button-action',
                'style': 'margin-left: 10px;',
                'click': function() { self.switchTo('lte'); }
            }, _('Switch to LTE'))
        ]);
    },

    renderTestNotify: function() {
        return E('div', { 'class': 'cbi-value' }, [
            E('button', {
                'class': 'cbi-button cbi-button-apply',
                'click': function() {
                    callTestNotify().then(function(r) {
                        ui.addNotification(null, E('p', {}, r.success ? _('Test notification sent') : _('Failed to send test notification')), r.success ? 'info' : 'error');
                    });
                }
            }, _('Send Test'))
        ]);
    },

    renderLogs: function() {
        var div = E('pre', { 'style': 'max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 4px;' }, _('Loading...'));
        callLogs().then(function(r) {
            div.textContent = (r.logs && r.logs.length > 0) ? r.logs.join('\n') : _('No logs available');
        }).catch(function() {
            div.textContent = _('Failed to load logs');
        });
        return E('div', { 'class': 'cbi-value' }, div);
    },

    switchTo: function(target) {
        var self = this;
        ui.showModal(_('Confirm Switch'), [
            E('p', {}, _('Switch to ') + (target === 'wan' ? _('Wired WAN') : _('LTE Failover')) + '?'),
            E('div', { 'class': 'right' }, [
                E('button', {
                    'class': 'cbi-button',
                    'click': ui.hideModal
                }, _('Cancel')),
                E('button', {
                    'class': 'cbi-button cbi-button-apply',
                    'click': function() {
                        ui.hideModal();
                        callSwitch({ target: target }).then(function(r) {
                            ui.addNotification(null, E('p', {}, r.success ? _('Switched to ') + target.toUpperCase() : _('Switch failed')), r.success ? 'success' : 'error');
                            if (r.success) poll.start();
                        });
                    }
                }, _('Confirm'))
            ])
        ]);
    },

    poll_interval: 5,
    poll: function() {
        var self = this;
        return callStatus().then(function(data) {
            var card = document.querySelector('.cbi-value');
            if (card && card.parentNode) {
                var newCard = self.renderStatusCard(data);
                card.parentNode.replaceChild(newCard, card);
            }
        });
    }
});
