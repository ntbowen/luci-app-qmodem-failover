include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-qmodem-failover
PKG_VERSION:=1.0.0
PKG_RELEASE:=3

LUCI_TITLE:=QMODEM Failover - 有线故障自动切换移动网络
LUCI_DEPENDS:=+luci-base +kmod-usb-net +kmod-usb-net-rndis +kmod-usb-net-cdc-ether +uci +curl +ip-full +ubus
LUCI_DESCRIPTION:=Auto-switches to QMODEM LTE when wired WAN fails. Auto-switches back on recovery.

PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-qmodem-failover/conffiles
/etc/config/qmodem_failover
endef

define Package/luci-app-qmodem-failover/install
	$(INSTALL_DIR) $(1)/www
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DIR) $(1)/usr/lib/qmodem-failover
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	cp -pR ./htdocs/* $(1)/www/
	$(INSTALL_BIN) ./src/qmodem-failover.init $(1)/etc/init.d/qmodem-failover
	$(INSTALL_CONF) ./src/qmodem-failover.config $(1)/etc/config/qmodem_failover
	$(INSTALL_BIN) ./src/notify.sh $(1)/usr/lib/qmodem-failover/
	$(INSTALL_BIN) ./src/switcher.sh $(1)/usr/lib/qmodem-failover/
	$(INSTALL_BIN) ./src/wan-checker.sh $(1)/usr/lib/qmodem-failover/
	$(INSTALL_BIN) ./src/qmodem-failover.sh $(1)/usr/lib/qmodem-failover/
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.qmodem-failover $(1)/usr/libexec/rpcd/
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-qmodem-failover.json $(1)/usr/share/luci/menu.d/
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-qmodem-failover.json $(1)/usr/share/rpcd/acl.d/
endef

define Package/luci-app-qmodem-failover/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/qmodem-failover enable 2>/dev/null || true
/etc/init.d/qmodem-failover start 2>/dev/null || true
exit 0
endef

define Package/luci-app-qmodem-failover/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/qmodem-failover stop 2>/dev/null || true
/etc/init.d/qmodem-failover disable 2>/dev/null || true
exit 0
endef

$(eval $(call BuildPackage,luci-app-qmodem-failover))
