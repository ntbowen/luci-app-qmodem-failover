'use strict';
'require view';
'require form';
'require network';
'require uci';

return view.extend({
    title: _('QMODEM Failover Configuration'),

    load: function() {
        return Promise.all([
            network.getDevices(),
            uci.load('qmodem_failover')
        ]).then(function(res) {
            return {
                devices: res[0],
                config: res[1]
            };
        });
    },

    render: function(data) {
        var devices = data.devices || [];
        var ifaceChoices = {};
        
        devices.forEach(function(dev) {
            var name = dev.getName();
            var type = dev.getType() || 'ethernet';
            ifaceChoices[name] = name + ' (' + type + ')';
        });

        // Add common device names
        ['eth0', 'eth1', 'eth2', 'eth3', 'usb0', 'usb1', 'wwan0'].forEach(function(dev) {
            if (!ifaceChoices[dev]) {
                ifaceChoices[dev] = dev;
            }
        });

        var m, s, o;

        m = new form.Map('qmodem_failover', _('QMODEM Failover'),
            _('Configure network interfaces for WAN failover. When the primary WAN fails, traffic will automatically switch to the LTE interface.'));

        s = m.section(form.NamedSection, 'general', 'qmodem_failover', _('General Settings'));

        o = s.option(form.ListValue, 'wan_iface', _('WAN Interface'),
            _('Primary wired WAN interface'));
        o.value('', _('-- Select Interface --'));
        Object.keys(ifaceChoices).forEach(function(key) {
            o.value(key, ifaceChoices[key]);
        });
        o.rmempty = false;

        o = s.option(form.ListValue, 'lte_iface', _('LTE Interface'),
            _('Secondary LTE/4G interface for failover'));
        o.value('', _('-- Select Interface --'));
        Object.keys(ifaceChoices).forEach(function(key) {
            o.value(key, ifaceChoices[key]);
        });
        o.rmempty = false;

        o = s.option(form.Flag, 'enabled', _('Enable Failover'),
            _('Automatically switch to LTE when WAN fails'));
        o.rmempty = false;

        return m.render();
    }
});
